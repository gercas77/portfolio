import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { Readability } from "@mozilla/readability";
import { loadEnvConfig } from "@next/env";
import { JSDOM } from "jsdom";
import { Collection, MongoClient, Binary } from "mongodb";
import OpenAI from "openai";
import pLimit from "p-limit";

const HN_API_BASE_URL = "https://hacker-news.firebaseio.com/v0";
const DEFAULT_IDS_FILE = path.resolve(process.cwd(), "data/hn/seed-topstories-snapshot.json");
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_SUMMARY_MODEL = "gpt-4o";
const ARTICLE_TTL_DAYS = 30;
const MAX_SUMMARY_INPUT_CHARS = 12000;
const MIN_CONTENT_LENGTH = 400;
const USER_AGENT =
    "Mozilla/5.0 (compatible; HackerNewsRAGAgentSeeder/1.0; +https://gercastro.xyz)";

loadEnvConfig(process.cwd());

// Official OpenAI pricing snapshot checked on 2026-04-12:
// - text-embedding-3-small: $0.02 / 1M input tokens
// - gpt-4o: $2.50 / 1M input tokens, $10.00 / 1M output tokens
const MODEL_PRICING_USD_PER_1M_TOKENS = {
    "text-embedding-3-small": {
        input: 0.02,
        output: null,
    },
    "gpt-4o": {
        input: 2.5,
        output: 10,
    },
} as const;

type SeedMode = "full" | "metadata-only" | "fetch-only" | "embed-only" | "summarize-only";
type StageStatus = "COMPLETED" | "FAILED" | "SKIPPED";

type SeedSnapshot = {
    source: string;
    capturedAt: string;
    storyIds: number[];
};

type HnItem = {
    id: number;
    type?: string;
    by?: string;
    descendants?: number;
    score?: number;
    time?: number;
    title?: string;
    url?: string;
    deleted?: boolean;
    dead?: boolean;
};

type HnArticleDocument = {
    hnId: number;
    title: string;
    url: string;
    score: number;
    author: string;
    descendants: number;
    embedding: Binary | null;
    content: string | null;
    summary: string | null;
    jsonData: {
        embedding: {
            status: Exclude<StageStatus, "SKIPPED">;
            model: string | null;
            tokensIn: number | null;
            estimatedCostUsd: number | null;
            completedAt: Date | null;
            error: string | null;
        } | null;
        fetch: {
            status: StageStatus;
            method: string | null;
            contentLength: number | null;
            completedAt: Date | null;
            error: string | null;
            skippedReason: string | null;
        } | null;
        summary: {
            status: Exclude<StageStatus, "SKIPPED">;
            model: string | null;
            completedAt: Date | null;
            tokensIn: number | null;
            tokensOut: number | null;
            estimatedInputCostUsd: number | null;
            estimatedOutputCostUsd: number | null;
            estimatedTotalCostUsd: number | null;
            error: string | null;
        } | null;
    };
    hnPostedAt: Date;
    createdAt: Date;
    expireAt: Date;
};

type SeedOptions = {
    idsFile: string;
    limit: number;
    concurrency: number;
    mode: SeedMode;
    forceFetch: boolean;
    forceEmbed: boolean;
    forceSummary: boolean;
};

type SeedStats = {
    totalIds: number;
    eligibleStories: number;
    skippedIneligible: number;
    metadataUpserts: number;
    embeddingsCreated: number;
    embeddingsSkipped: number;
    embeddingFailures: number;
    fetchCompleted: number;
    fetchSkipped: number;
    fetchFailures: number;
    summariesCreated: number;
    summariesSkipped: number;
    summaryFailures: number;
    missingContentForSummary: number;
};

type StepResult = {
    status: "executed" | "skipped" | "failed" | "not-run";
    message: string;
};

const parseArgs = (argv: string[]): SeedOptions => {
    const flagSet = new Set(argv);

    if (flagSet.has("--help")) {
        printHelp();
        process.exit(0);
    }

    const modeFlags: Array<{ flag: string; mode: SeedMode }> = [
        { flag: "--metadata-only", mode: "metadata-only" },
        { flag: "--fetch-only", mode: "fetch-only" },
        { flag: "--embed-only", mode: "embed-only" },
        { flag: "--summarize-only", mode: "summarize-only" },
    ];

    const enabledModes = modeFlags.filter(({ flag }) => flagSet.has(flag));

    if (enabledModes.length > 1) {
        throw new Error("Only one of --metadata-only, --fetch-only, --embed-only, or --summarize-only can be used at a time.");
    }

    return {
        idsFile: getStringArg(argv, "--ids-file") ?? DEFAULT_IDS_FILE,
        limit: getNumberArg(argv, "--limit") ?? Number.POSITIVE_INFINITY,
        concurrency: getNumberArg(argv, "--concurrency") ?? DEFAULT_CONCURRENCY,
        mode: enabledModes[0]?.mode ?? "full",
        forceFetch: flagSet.has("--force-fetch"),
        forceEmbed: flagSet.has("--force-embed"),
        forceSummary: flagSet.has("--force-summary"),
    };
};

const getStringArg = (argv: string[], flag: string): string | undefined => {
    const directMatch = argv.find((entry) => entry.startsWith(`${flag}=`));

    if (directMatch) {
        return directMatch.slice(flag.length + 1);
    }

    const index = argv.indexOf(flag);

    if (index === -1) return undefined;

    return argv[index + 1];
};

const getNumberArg = (argv: string[], flag: string): number | undefined => {
    const rawValue = getStringArg(argv, flag);

    if (!rawValue) return undefined;

    const parsed = Number(rawValue);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`Invalid numeric value for ${flag}: ${rawValue}`);
    }

    return parsed;
};

const printHelp = () => {
    console.log(`
Usage:
    pnpm seed:hn --ids-file="${DEFAULT_IDS_FILE}" --limit=200 --concurrency=3

Modes:
    --metadata-only
    --fetch-only
    --embed-only
    --summarize-only

Other flags:
    --force-fetch
    --force-summary
    --help
    `);
};

const readSeedSnapshot = async (idsFile: string): Promise<SeedSnapshot> => {
    const fileContents = await fs.readFile(idsFile, "utf8");
    const parsed = JSON.parse(fileContents) as Partial<SeedSnapshot>;

    if (!Array.isArray(parsed.storyIds)) {
        throw new Error(`Invalid snapshot file at ${idsFile}. Expected { "storyIds": number[] }.`);
    }

    return {
        source: parsed.source ?? "unknown",
        capturedAt: parsed.capturedAt ?? new Date().toISOString(),
        storyIds: parsed.storyIds.filter((value): value is number => Number.isInteger(value)),
    };
};

const resolveDatabaseName = (mongoUri: string): string => {
    const configured = process.env.MONGODB_DB_NAME?.trim();

    if (configured) return configured;

    try {
        const parsed = new URL(mongoUri);
        const pathname = parsed.pathname.replace(/^\/+/, "");

        if (pathname) {
            return decodeURIComponent(pathname);
        }
    } catch {
        console.warn("Could not infer database name from MONGODB_URI. Falling back to 'portfolio'.");
    }

    return "portfolio";
};

const getRequiredEnvironment = (name: string): string => {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
};

const shouldRunEmbedding = (mode: SeedMode) => mode === "full" || mode === "embed-only";
const shouldRunFetch = (mode: SeedMode) => mode === "full" || mode === "fetch-only";
const shouldRunSummary = (mode: SeedMode) => mode === "full" || mode === "summarize-only";

const getIneligibilityReason = (item: HnItem | null) => {
    if (!item) return "item not found";
    if (item.deleted) return "item deleted";
    if (item.dead) return "item dead";
    if (item.type !== "story") return `type=${item.type ?? "unknown"}`;
    if (!item.title?.trim()) return "missing title";
    if (!item.url?.trim()) return "missing url";
    if (!isExternalHttpUrl(item.url)) return "url is not an external http(s) article";

    return null;
};

const isEligibleStory = (item: HnItem): item is HnItem & { title: string; url: string } =>
    getIneligibilityReason(item) === null;

const isExternalHttpUrl = (value: string) => {
    try {
        const url = new URL(value);

        if (url.protocol !== "http:" && url.protocol !== "https:") {
            return false;
        }

        return url.hostname !== "news.ycombinator.com";
    } catch {
        return false;
    }
};

const fetchHnItem = async (hnId: number): Promise<HnItem | null> => {
    const response = await fetch(`${HN_API_BASE_URL}/item/${hnId}.json`, {
        headers: {
            "User-Agent": USER_AGENT,
        },
        signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
        throw new Error(`HN item request failed with ${response.status}`);
    }

    const item = (await response.json()) as HnItem | null;

    return item;
};

const collapseWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const roundUsd = (value: number) => Number(value.toFixed(8));

const calculateModelCostUsd = (
    model: string,
    tokenType: "input" | "output",
    tokens: number | null,
) => {
    if (tokens === null) return null;

    const pricing = MODEL_PRICING_USD_PER_1M_TOKENS[model as keyof typeof MODEL_PRICING_USD_PER_1M_TOKENS];
    const usdPerMillion = pricing?.[tokenType];

    if (usdPerMillion === null || usdPerMillion === undefined) {
        return null;
    }

    return roundUsd((tokens / 1_000_000) * usdPerMillion);
};

const formatUsd = (value: number | null) => (value === null ? "n/a" : `$${value.toFixed(8)}`);

const logStep = (hnId: number, step: string, result: StepResult) => {
    console.log(`[${hnId}] ${step}: ${result.message}`);
};

const extractArticleContent = async (url: string): Promise<string> => {
    const response = await fetch(url, {
        headers: {
            "User-Agent": USER_AGENT,
            Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
        throw new Error(`Article request failed with ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("text/html")) {
        throw new Error(`Unsupported content-type: ${contentType}`);
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const parsedArticle = reader.parse();

    if (!parsedArticle?.textContent) {
        throw new Error("Readability could not extract article text.");
    }

    const normalizedText = collapseWhitespace(parsedArticle.textContent);

    if (normalizedText.length < MIN_CONTENT_LENGTH) {
        throw new Error(`Extracted content is too short (${normalizedText.length} chars).`);
    }

    return normalizedText;
};

const createBaseDocument = (item: HnItem & { title: string; url: string }): HnArticleDocument => {
    const now = new Date();
    const hnPostedAt = item.time ? new Date(item.time * 1000) : now;
    const expireAt = new Date(now.getTime() + ARTICLE_TTL_DAYS * 24 * 60 * 60 * 1000);

    return {
        hnId: item.id,
        title: item.title,
        url: item.url,
        score: item.score ?? 0,
        author: item.by ?? "unknown",
        descendants: item.descendants ?? 0,
        embedding: null,
        content: null,
        summary: null,
        jsonData: {
            embedding: null,
            fetch: null,
            summary: null,
        },
        hnPostedAt,
        createdAt: now,
        expireAt,
    };
};

const upsertBaseArticle = async (
    collection: Collection<HnArticleDocument>,
    item: HnItem & { title: string; url: string },
) => {
    const baseDocument = createBaseDocument(item);

    await collection.updateOne(
        { hnId: item.id },
        {
            $set: {
                title: baseDocument.title,
                url: baseDocument.url,
                score: baseDocument.score,
                author: baseDocument.author,
                descendants: baseDocument.descendants,
                hnPostedAt: baseDocument.hnPostedAt,
                expireAt: baseDocument.expireAt,
            },
            $setOnInsert: {
                hnId: baseDocument.hnId,
                embedding: baseDocument.embedding,
                content: baseDocument.content,
                summary: baseDocument.summary,
                jsonData: baseDocument.jsonData,
                createdAt: baseDocument.createdAt,
            },
        },
        { upsert: true },
    );

    return await collection.findOne({ hnId: item.id });
};

const ensureEmbedding = async (
    article: HnArticleDocument,
    collection: Collection<HnArticleDocument>,
    openai: OpenAI,
    stats: SeedStats,
    forceEmbed: boolean,
) : Promise<StepResult> => {
    if (!forceEmbed && article.embedding instanceof Binary) {
        stats.embeddingsSkipped += 1;
        return {
            status: "skipped",
            message: "skipped (embedding already exists as Binary)",
        };
    }

    const model = process.env.HN_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL;

    try {
        const response = await openai.embeddings.create({
            model,
            input: article.title,
        });

        const embedding = response.data[0]?.embedding;
        const tokensIn = response.usage?.prompt_tokens ?? response.usage?.total_tokens ?? null;
        const estimatedCostUsd = calculateModelCostUsd(model, "input", tokensIn);

        if (!embedding?.length) {
            throw new Error("OpenAI returned an empty embedding.");
        }

        const binaryEmbedding = Binary.fromFloat32Array(new Float32Array(embedding));

        await collection.updateOne(
            { hnId: article.hnId },
            {
                $set: {
                    embedding: binaryEmbedding,
                    "jsonData.embedding": {
                        status: "COMPLETED",
                        model,
                        tokensIn,
                        estimatedCostUsd,
                        completedAt: new Date(),
                        error: null,
                    },
                },
            },
        );

        stats.embeddingsCreated += 1;
        return {
            status: "executed",
            message: `executed (tokens=${tokensIn ?? "n/a"}, cost=${formatUsd(estimatedCostUsd)})`,
        };
    } catch (error) {
        await collection.updateOne(
            { hnId: article.hnId },
            {
                $set: {
                    "jsonData.embedding": {
                        status: "FAILED",
                        model,
                        tokensIn: null,
                        estimatedCostUsd: null,
                        completedAt: new Date(),
                        error: toErrorMessage(error),
                    },
                },
            },
        );

        stats.embeddingFailures += 1;
        return {
            status: "failed",
            message: `failed (${toErrorMessage(error)})`,
        };
    }
};

const ensureFetchedContent = async (
    article: HnArticleDocument,
    collection: Collection<HnArticleDocument>,
    stats: SeedStats,
    forceFetch: boolean,
) : Promise<StepResult> => {
    if (article.jsonData.fetch && !forceFetch) {
        stats.fetchSkipped += 1;
        return {
            status: "skipped",
            message: `skipped (fetch status already ${article.jsonData.fetch.status.toLowerCase()})`,
        };
    }

    try {
        const content = await extractArticleContent(article.url);
        const contentLength = content.length;

        await collection.updateOne(
            { hnId: article.hnId },
            {
                $set: {
                    content,
                    "jsonData.fetch": {
                        status: "COMPLETED",
                        method: "readability",
                        contentLength,
                        completedAt: new Date(),
                        error: null,
                        skippedReason: null,
                    },
                },
            },
        );

        stats.fetchCompleted += 1;
        return {
            status: "executed",
            message: `executed (contentLength=${contentLength})`,
        };
    } catch (error) {
        await collection.updateOne(
            { hnId: article.hnId },
            {
                $set: {
                    "jsonData.fetch": {
                        status: "FAILED",
                        method: "readability",
                        contentLength: null,
                        completedAt: new Date(),
                        error: toErrorMessage(error),
                        skippedReason: null,
                    },
                },
            },
        );

        stats.fetchFailures += 1;
        return {
            status: "failed",
            message: `failed (${toErrorMessage(error)})`,
        };
    }
};

const ensureSummary = async (
    article: HnArticleDocument,
    collection: Collection<HnArticleDocument>,
    openai: OpenAI,
    stats: SeedStats,
    forceSummary: boolean,
) : Promise<StepResult> => {
    if (article.summary && !forceSummary) {
        stats.summariesSkipped += 1;
        return {
            status: "skipped",
            message: "skipped (summary already exists)",
        };
    }

    if (!article.content?.trim()) {
        stats.missingContentForSummary += 1;
        return {
            status: "skipped",
            message: "skipped (missing fetched content)",
        };
    }

    const trimmedContent = article.content.slice(0, MAX_SUMMARY_INPUT_CHARS);
    const model = process.env.HN_SUMMARY_MODEL?.trim() || DEFAULT_SUMMARY_MODEL;

    try {
        const response = await openai.chat.completions.create({
            model,
            messages: [
                {
                    role: "system",
                    content:
                        "You summarize recent Hacker News linked articles for a technical portfolio showcase. Produce a concise, factual summary in English with no markdown bullets.",
                },
                {
                    role: "user",
                    content: [
                        `Title: ${article.title}`,
                        `URL: ${article.url}`,
                        "",
                        "Summarize the following article in 2 short paragraphs for technical readers. Focus on the main claim, what happened, and why it matters.",
                        "",
                        trimmedContent,
                    ].join("\n"),
                },
            ],
        });

        const summary = response.choices[0]?.message?.content?.trim();

        if (!summary) {
            throw new Error("OpenAI returned an empty summary.");
        }

        const tokensIn = response.usage?.prompt_tokens ?? null;
        const tokensOut = response.usage?.completion_tokens ?? null;
        const estimatedInputCostUsd = calculateModelCostUsd(model, "input", tokensIn);
        const estimatedOutputCostUsd = calculateModelCostUsd(model, "output", tokensOut);
        const estimatedTotalCostUsd =
            estimatedInputCostUsd === null && estimatedOutputCostUsd === null
                ? null
                : roundUsd((estimatedInputCostUsd ?? 0) + (estimatedOutputCostUsd ?? 0));

        await collection.updateOne(
            { hnId: article.hnId },
            {
                $set: {
                    summary,
                    "jsonData.summary": {
                        status: "COMPLETED",
                        model,
                        completedAt: new Date(),
                        tokensIn,
                        tokensOut,
                        estimatedInputCostUsd,
                        estimatedOutputCostUsd,
                        estimatedTotalCostUsd,
                        error: null,
                    },
                },
            },
        );

        stats.summariesCreated += 1;
        return {
            status: "executed",
            message: `executed (tokensIn=${tokensIn ?? "n/a"}, tokensOut=${tokensOut ?? "n/a"}, cost=${formatUsd(estimatedTotalCostUsd)})`,
        };
    } catch (error) {
        await collection.updateOne(
            { hnId: article.hnId },
            {
                $set: {
                    "jsonData.summary": {
                        status: "FAILED",
                        model,
                        completedAt: new Date(),
                        tokensIn: null,
                        tokensOut: null,
                        estimatedInputCostUsd: null,
                        estimatedOutputCostUsd: null,
                        estimatedTotalCostUsd: null,
                        error: toErrorMessage(error),
                    },
                },
            },
        );

        stats.summaryFailures += 1;
        return {
            status: "failed",
            message: `failed (${toErrorMessage(error)})`,
        };
    }
};

const toErrorMessage = (error: unknown) => {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
};

const createStats = (): SeedStats => ({
    totalIds: 0,
    eligibleStories: 0,
    skippedIneligible: 0,
    metadataUpserts: 0,
    embeddingsCreated: 0,
    embeddingsSkipped: 0,
    embeddingFailures: 0,
    fetchCompleted: 0,
    fetchSkipped: 0,
    fetchFailures: 0,
    summariesCreated: 0,
    summariesSkipped: 0,
    summaryFailures: 0,
    missingContentForSummary: 0,
});

const logSummary = (stats: SeedStats) => {
    console.log("");
    console.log("Seed summary");
    console.table(stats);
};

const main = async () => {
    const options = parseArgs(process.argv.slice(2));
    const snapshot = await readSeedSnapshot(options.idsFile);
    const storyIds = snapshot.storyIds.slice(0, options.limit);
    const mongoUri = getRequiredEnvironment("MONGODB_URI");
    const mongoClient = new MongoClient(mongoUri);
    const databaseName = resolveDatabaseName(mongoUri);
    const shouldInstantiateOpenAi = shouldRunEmbedding(options.mode) || shouldRunSummary(options.mode);
    const openAiClient = shouldInstantiateOpenAi
        ? new OpenAI({ apiKey: getRequiredEnvironment("OPENAI_API_KEY") })
        : null;
    const stats = createStats();

    console.log(`Loaded ${snapshot.storyIds.length} IDs from ${options.idsFile}`);
    console.log(`Processing ${storyIds.length} IDs in mode "${options.mode}" with concurrency ${options.concurrency}`);

    await mongoClient.connect();

    try {
        const collection = mongoClient.db(databaseName).collection<HnArticleDocument>("hn_articles");
        const limit = pLimit(options.concurrency);

        await Promise.all(
            storyIds.map((hnId) =>
                limit(async () => {
                    stats.totalIds += 1;

                    try {
                        const item = await fetchHnItem(hnId);

                        const ineligibilityReason = getIneligibilityReason(item);

                        if (!item || ineligibilityReason) {
                            stats.skippedIneligible += 1;
                            logStep(hnId, "story", {
                                status: "skipped",
                                message: `skipped (${ineligibilityReason ?? "unknown reason"})`,
                            });
                            return;
                        }

                        if (!isEligibleStory(item)) {
                            stats.skippedIneligible += 1;
                            logStep(hnId, "story", {
                                status: "skipped",
                                message: "skipped (failed eligibility re-check)",
                            });
                            return;
                        }

                        stats.eligibleStories += 1;

                        const article = await upsertBaseArticle(collection, item);

                        if (!article) {
                            throw new Error("Article could not be loaded after upsert.");
                        }

                        stats.metadataUpserts += 1;
                        logStep(hnId, "metadata", {
                            status: "executed",
                            message: `upserted (title="${item.title}")`,
                        });

                        if (shouldRunEmbedding(options.mode)) {
                            logStep(
                                hnId,
                                "embedding",
                                await ensureEmbedding(article, collection, openAiClient!, stats, options.forceEmbed),
                            );
                        } else {
                            logStep(hnId, "embedding", {
                                status: "not-run",
                                message: `not run (mode=${options.mode})`,
                            });
                        }

                        const latestAfterEmbedding = await collection.findOne({
                            hnId: item.id,
                        });

                        if (!latestAfterEmbedding) {
                            throw new Error("Article disappeared after embedding stage.");
                        }

                        if (shouldRunFetch(options.mode)) {
                            logStep(
                                hnId,
                                "fetch",
                                await ensureFetchedContent(
                                    latestAfterEmbedding,
                                    collection,
                                    stats,
                                    options.forceFetch,
                                ),
                            );
                        } else {
                            logStep(hnId, "fetch", {
                                status: "not-run",
                                message: `not run (mode=${options.mode})`,
                            });
                        }

                        const latestAfterFetch = await collection.findOne({
                            hnId: item.id,
                        });

                        if (!latestAfterFetch) {
                            throw new Error("Article disappeared after fetch stage.");
                        }

                        if (shouldRunSummary(options.mode)) {
                            logStep(
                                hnId,
                                "summary",
                                await ensureSummary(
                                    latestAfterFetch,
                                    collection,
                                    openAiClient!,
                                    stats,
                                    options.forceSummary,
                                ),
                            );
                        } else {
                            logStep(hnId, "summary", {
                                status: "not-run",
                                message: `not run (mode=${options.mode})`,
                            });
                        }
                    } catch (error) {
                        console.error(`[${hnId}] processing failed: ${toErrorMessage(error)}`);
                    }
                }),
            ),
        );
    } finally {
        await mongoClient.close();
    }

    logSummary(stats);
};

void main().catch((error) => {
    console.error(toErrorMessage(error));
    process.exitCode = 1;
});
