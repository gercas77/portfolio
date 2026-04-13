import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { loadEnvConfig } from "@next/env";
import { MongoClient } from "mongodb";
import OpenAI from "openai";
import pLimit from "p-limit";

loadEnvConfig(process.cwd());

const DEFAULT_QUERIES_FILE = path.resolve(process.cwd(), "data/hn/title-embedding-eval.json");
const DEFAULT_TOP_K = 5;
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_MODEL = "text-embedding-3-small";

const MODEL_PRICING_USD_PER_1M_TOKENS = {
    "text-embedding-3-small": 0.02,
} as const;

type QueryEvaluationFile = {
    model?: string;
    topK?: number;
    generatedAt?: string;
    queries: QueryRecord[];
};

type QueryRecord = {
    id: string;
    query: string;
    notes?: string;
    embedding?: number[];
    embeddingTokensIn?: number | null;
    embeddingEstimatedCostUsd?: number | null;
    topResults?: QueryResult[];
};

type QueryResult = {
    rank: number;
    similarityScore: number;
    hnId: number;
    title: string;
    url: string;
    score: number;
    author: string;
    descendants: number;
    hnPostedAt: string;
};

type QueryRecordForFile = Omit<QueryRecord, "embedding">;

type ScriptOptions = {
    queriesFile: string;
    topK?: number;
    concurrency: number;
};

const parseArgs = (argv: string[]): ScriptOptions => {
    if (argv.includes("--help")) {
        printHelp();
        process.exit(0);
    }

    return {
        queriesFile: getStringArg(argv, "--queries-file") ?? DEFAULT_QUERIES_FILE,
        topK: getNumberArg(argv, "--top-k"),
        concurrency: getNumberArg(argv, "--concurrency") ?? DEFAULT_CONCURRENCY,
    };
};

const printHelp = () => {
    console.log(`
Usage:
    pnpm eval:title-embeddings --queries-file="${DEFAULT_QUERIES_FILE}" --top-k=5 --concurrency=3
    `);
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

const getRequiredEnvironment = (name: string): string => {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
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

const readQueryFile = async (filePath: string): Promise<QueryEvaluationFile> => {
    const contents = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(contents) as Partial<QueryEvaluationFile>;

    if (!Array.isArray(parsed.queries)) {
        throw new Error(`Invalid query file at ${filePath}. Expected a "queries" array.`);
    }

    const queries = parsed.queries.map((entry, index) => {
        if (!entry || typeof entry !== "object") {
            throw new Error(`Invalid query entry at index ${index}.`);
        }

        if (typeof entry.id !== "string" || !entry.id.trim()) {
            throw new Error(`Query at index ${index} is missing a valid "id".`);
        }

        if (typeof entry.query !== "string" || !entry.query.trim()) {
            throw new Error(`Query at index ${index} is missing a valid "query".`);
        }

        return entry as QueryRecord;
    });

    return {
        model: typeof parsed.model === "string" && parsed.model.trim() ? parsed.model : DEFAULT_MODEL,
        topK: typeof parsed.topK === "number" && parsed.topK > 0 ? parsed.topK : DEFAULT_TOP_K,
        generatedAt: typeof parsed.generatedAt === "string" ? parsed.generatedAt : undefined,
        queries,
    };
};

const roundUsd = (value: number) => Number(value.toFixed(8));
const roundSimilarity = (value: number) => Number(value.toFixed(6));

const calculateEmbeddingCostUsd = (model: string, tokens: number | null) => {
    if (tokens === null) return null;

    const usdPerMillion = MODEL_PRICING_USD_PER_1M_TOKENS[model as keyof typeof MODEL_PRICING_USD_PER_1M_TOKENS];

    if (usdPerMillion === undefined) {
        return null;
    }

    return roundUsd((tokens / 1_000_000) * usdPerMillion);
};

const fetchTopResultsWithVectorSearch = async (
    mongoUri: string,
    queryVector: number[],
    topK: number,
): Promise<QueryResult[]> => {
    const client = new MongoClient(mongoUri);
    const databaseName = resolveDatabaseName(mongoUri);

    await client.connect();

    try {
        const collection = client.db(databaseName).collection("hn_articles");

        const results = await collection.aggregate([
            {
                $vectorSearch: {
                    index: "vector_index",
                    path: "embedding",
                    queryVector,
                    numCandidates: 100,
                    limit: topK,
                }
            },
            {
                $addFields: {
                    similarityScore: { $meta: "vectorSearchScore" }
                }
            },
            {
                $project: {
                    _id: 0,
                    hnId: 1,
                    title: 1,
                    url: 1,
                    score: 1,
                    author: 1,
                    descendants: 1,
                    hnPostedAt: 1,
                    similarityScore: 1
                }
            }
        ]).toArray();

        return results.map((doc, index) => ({
            rank: index + 1,
            similarityScore: roundSimilarity(doc.similarityScore),
            hnId: doc.hnId,
            title: doc.title,
            url: doc.url,
            score: doc.score,
            author: doc.author,
            descendants: doc.descendants,
            hnPostedAt: doc.hnPostedAt instanceof Date ? doc.hnPostedAt.toISOString() : doc.hnPostedAt,
        }));
    } finally {
        await client.close();
    }
};

const ensureQueryEmbedding = async (
    queryRecord: QueryRecord,
    model: string,
    openai: OpenAI,
): Promise<QueryRecord> => {
    if (Array.isArray(queryRecord.embedding) && queryRecord.embedding.length > 0) {
        console.log(`[${queryRecord.id}] embedding: skipped (already exists)`);
        return queryRecord;
    }

    const response = await openai.embeddings.create({
        model,
        input: queryRecord.query,
    });

    const embedding = response.data[0]?.embedding;

    if (!embedding?.length) {
        throw new Error(`OpenAI returned an empty embedding for query "${queryRecord.id}".`);
    }

    const tokensIn = response.usage?.prompt_tokens ?? response.usage?.total_tokens ?? null;
    const estimatedCostUsd = calculateEmbeddingCostUsd(model, tokensIn);

    console.log(
        `[${queryRecord.id}] embedding: executed (tokens=${tokensIn ?? "n/a"}, cost=${estimatedCostUsd === null ? "n/a" : `$${estimatedCostUsd.toFixed(8)}`})`,
    );

    return {
        ...queryRecord,
        embedding,
        embeddingTokensIn: tokensIn,
        embeddingEstimatedCostUsd: estimatedCostUsd,
    };
};

const hasEvaluationResults = (queryRecord: QueryRecord) =>
    Array.isArray(queryRecord.topResults) && queryRecord.topResults.length > 0;

const stripEmbeddingFromQueryRecord = (queryRecord: QueryRecord): QueryRecordForFile => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { embedding: _embedding, ...rest } = queryRecord;

    return rest;
};

const writeQueryFile = async (filePath: string, file: QueryEvaluationFile) => {
    await fs.writeFile(filePath, `${JSON.stringify(file, null, 4)}\n`, "utf8");
};

const main = async () => {
    const options = parseArgs(process.argv.slice(2));
    const mongoUri = getRequiredEnvironment("MONGODB_URI");
    const openAiClient = new OpenAI({ apiKey: getRequiredEnvironment("OPENAI_API_KEY") });
    const queryFile = await readQueryFile(options.queriesFile);
    const model = queryFile.model ?? DEFAULT_MODEL;
    const topK = options.topK ?? queryFile.topK ?? DEFAULT_TOP_K;
    const limit = pLimit(options.concurrency);

    console.log(`Loaded ${queryFile.queries.length} queries from ${options.queriesFile}`);
    console.log(`Using model=${model} topK=${topK} with Atlas Vector Search`);

    const queriesWithEmbeddings = await Promise.all(
        queryFile.queries.map((queryRecord) =>
            limit(async () => {
                if (hasEvaluationResults(queryRecord)) {
                    console.log(`[${queryRecord.id}] evaluation: skipped (topResults already exist)`);
                    return stripEmbeddingFromQueryRecord(queryRecord);
                }

                const enrichedQuery = await ensureQueryEmbedding(queryRecord, model, openAiClient);

                if (!enrichedQuery.embedding?.length) {
                    throw new Error(`Query "${queryRecord.id}" is missing an embedding after processing.`);
                }

                const topResults = await fetchTopResultsWithVectorSearch(
                    mongoUri,
                    enrichedQuery.embedding,
                    topK
                );

                console.log(
                    `[${queryRecord.id}] results: executed (top1="${topResults[0]?.title ?? "none"}", topK=${topResults.length})`,
                );

                return {
                    ...stripEmbeddingFromQueryRecord(enrichedQuery),
                    topResults,
                };
            }),
        ),
    );

    const nextFile: QueryEvaluationFile = {
        model,
        topK,
        generatedAt: new Date().toISOString(),
        queries: queriesWithEmbeddings,
    };

    await writeQueryFile(options.queriesFile, nextFile);

    console.log(`Saved evaluation results to ${options.queriesFile}`);
};

void main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
});
