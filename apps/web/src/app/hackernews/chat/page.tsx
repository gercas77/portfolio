"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    ArrowLeft,
    Send,
    Bot,
    User,
    Loader2,
    Info,
    ChevronDown,
    ChevronUp,
    Search,
    Clock,
    Database,
    ExternalLink,
    AlertCircle,
    Cpu,
    Zap,
    LogOut,
    Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

// ---------------------------------------------------------------------------
// Types — mirrors the NDJSON protocol from /api/chat
// ---------------------------------------------------------------------------

interface Source {
    title: string;
    url: string;
    score: number;
    vectorScore: number;
}

interface ToolCallMeta {
    name: string;
    args: { query?: string; limit?: number; min_score?: number };
    resultsCount: number;
}

interface MessageMetadata {
    model: string;
    toolCalls: ToolCallMeta[];
    latencyMs: number;
    tokensIn: number;
    tokensOut: number;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    sources?: Source[];
    metadata?: MessageMetadata;
    isError?: boolean;
}

type StreamEvent =
    | { type: "delta"; text: string }
    | { type: "done"; meta: MessageMetadata; sources?: Source[] }
    | { type: "error"; code: string; message: string };

// ---------------------------------------------------------------------------
// Assistant markdown + citation rendering — [n] → [n](cite:n), one parse pass
// ---------------------------------------------------------------------------

/** Turn [1] into a markdown link so citations parse inline with lists/punctuation. */
const injectCitationLinks = (content: string) => content.replace(/\[(\d+)\]/g, "[$1](cite:$1)");

const getAssistantMarkdownComponents = (sources?: Source[]): Components => ({
    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    a: (props) => {
        const { href, children, node, ...rest } = props;
        void node;
        if (href?.startsWith("cite:")) {
            const num = href.slice("cite:".length);
            const source = sources?.find((_, idx) => idx === parseInt(num, 10) - 1);
            if (source) {
                return (
                    <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded text-[10px] font-bold bg-primary/15 text-primary hover:bg-primary/25 transition-colors align-super -translate-y-0.5 ml-0.5 no-underline"
                        title={source.title}
                        aria-label={`Source ${num}: ${source.title}`}
                        tabIndex={0}
                    >
                        {num}
                    </a>
                );
            }
            return (
                <span
                    className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded text-[10px] font-bold bg-muted text-muted-foreground align-super -translate-y-0.5 ml-0.5"
                    title={`No source loaded for [${num}]`}
                >
                    {num}
                </span>
            );
        }
        return (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:opacity-90"
                {...rest}
            >
                {children}
            </a>
        );
    },
    code: ({ className, children, ...props }) => {
        const isBlock = Boolean(className?.includes("language-"));
        if (isBlock) {
            return (
                <code className={className} {...props}>
                    {children}
                </code>
            );
        }
        return (
            <code
                className="rounded bg-primary/10 px-1 py-0.5 font-mono text-[0.9em] text-foreground"
                {...props}
            >
                {children}
            </code>
        );
    },
    pre: ({ children }) => (
        <pre className="my-2 w-full overflow-x-auto rounded-md border border-border/50 bg-muted/50 p-3 text-xs leading-relaxed">
            {children}
        </pre>
    ),
    ul: ({ children }) => (
        <ul className="my-2 w-full list-disc space-y-1 pl-5 text-left align-top">{children}</ul>
    ),
    ol: ({ children }) => (
        <ol className="my-2 w-full list-decimal space-y-1 pl-5 text-left align-top">{children}</ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    h1: ({ children }) => (
        <span className="mb-1 inline-block w-full text-base font-bold">{children}</span>
    ),
    h2: ({ children }) => (
        <span className="mb-1 inline-block w-full text-[15px] font-semibold">{children}</span>
    ),
    h3: ({ children }) => (
        <span className="mb-1 inline-block w-full text-sm font-semibold">{children}</span>
    ),
    blockquote: ({ children }) => (
        <blockquote className="my-2 border-l-2 border-primary/40 pl-3 text-muted-foreground inline-block w-full">
            {children}
        </blockquote>
    ),
    hr: () => <hr className="my-3 border-border/60 inline-block w-full" />,
    table: ({ children }) => (
        <div className="my-2 w-full overflow-x-auto inline-block align-top">
            <table className="w-full border-collapse text-xs">{children}</table>
        </div>
    ),
    thead: ({ children }) => <thead className="bg-muted/40">{children}</thead>,
    th: ({ children }) => (
        <th className="border border-border/50 px-2 py-1.5 text-left font-semibold">{children}</th>
    ),
    td: ({ children }) => <td className="border border-border/50 px-2 py-1.5 align-top">{children}</td>,
});

const renderContentWithCitations = (content: string, sources?: Source[]): ReactNode => (
    <div className="text-sm leading-relaxed [&_ol]:my-2 [&_ul]:my-2 [&_li]:leading-relaxed">
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={getAssistantMarkdownComponents(sources)}
        >
            {injectCitationLinks(content)}
        </ReactMarkdown>
    </div>
);

// ---------------------------------------------------------------------------
// Error message helpers
// ---------------------------------------------------------------------------

const errorMessageForStatus = (status: number, code?: string): string => {
    if (status === 401) return "Session expired. Please refresh and sign in again.";
    if (code === "llm_unavailable" || status === 503) {
        return "The AI service is temporarily unavailable. Please try again in a moment.";
    }
    if (status === 400) return "Invalid message. Please try a different question.";
    if (status === 429) return "Rate limit reached (20 messages/hour). Please wait before trying again.";
    return "Something went wrong. Please try again.";
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HNChatPage() {
    const { data: session, status } = useSession();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content:
                "Hello! I'm the Hacker News RAG Agent. I can help you explore recent tech news using semantic search over Hacker News articles.\n\nTry asking about AI, web frameworks, programming languages, or any tech topic.",
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [expandedMetadata, setExpandedMetadata] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // ── NDJSON stream parser ───────────────────────────────────────────
    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input.trim(),
        };

        const assistantId = (Date.now() + 1).toString();

        setMessages((prev) => [
            ...prev,
            userMessage,
            { id: assistantId, role: "assistant", content: "" },
        ]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMessage.content }),
            });

            if (!response.ok) {
                const body = await response.json().catch(() => null);
                const errorText = errorMessageForStatus(response.status, body?.code);
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === assistantId
                            ? { ...msg, content: errorText, isError: true }
                            : msg,
                    ),
                );
                return;
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error("No response body");

            const decoder = new TextDecoder();
            let buffer = "";
            let accContent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop()!;

                for (const line of lines) {
                    if (!line.trim()) continue;

                    let event: StreamEvent;
                    try {
                        event = JSON.parse(line);
                    } catch {
                        continue;
                    }

                    switch (event.type) {
                        case "delta":
                            accContent += event.text;
                            setMessages((prev) =>
                                prev.map((msg) =>
                                    msg.id === assistantId
                                        ? { ...msg, content: accContent }
                                        : msg,
                                ),
                            );
                            break;

                        case "done":
                            setMessages((prev) =>
                                prev.map((msg) =>
                                    msg.id === assistantId
                                        ? { ...msg, metadata: event.meta, sources: event.sources }
                                        : msg,
                                ),
                            );
                            break;

                        case "error":
                            setMessages((prev) =>
                                prev.map((msg) =>
                                    msg.id === assistantId
                                        ? { ...msg, content: event.message, isError: true }
                                        : msg,
                                ),
                            );
                            break;
                    }
                }
            }
        } catch {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === assistantId
                        ? {
                              ...msg,
                              content: "Could not reach the server. Check your connection and try again.",
                              isError: true,
                          }
                        : msg,
                ),
            );
        } finally {
            setIsLoading(false);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (status === "unauthenticated") {
        return <AuthGate />;
    }

    return (
        <div className="flex flex-col h-screen bg-background text-foreground">
            {/* Header */}
            <header className="flex items-center justify-between px-4 h-14 border-b border-border/40 bg-background/95 backdrop-blur shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/hackernews" aria-label="Back to Hacker News RAG Agent showcase">
                        <Button variant="ghost" size="icon-sm" className="rounded-full">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-sm font-bold leading-none">Hacker News RAG Agent</h1>
                        <p className="text-[10px] text-muted-foreground mt-1">Seeded Dataset · Demo</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        Live Preview
                    </div>
                    {session?.user && (
                        <div className="flex items-center gap-2">
                            {session.user.image && (
                                <Image
                                    src={session.user.image}
                                    alt={session.user.name ?? "User"}
                                    width={28}
                                    height={28}
                                    className="rounded-full"
                                    referrerPolicy="no-referrer"
                                />
                            )}
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                className="rounded-full"
                                onClick={() => signOut({ callbackUrl: "/hackernews" })}
                                aria-label="Sign out"
                                tabIndex={0}
                            >
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </header>

            {/* Chat Area */}
            <main className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-border">
                <div className="max-w-3xl mx-auto space-y-6">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                        >
                            {/* Avatar */}
                            <div
                                className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                                    message.role === "user" && session?.user?.image
                                        ? "overflow-hidden border border-primary/25"
                                        : `border ${
                                              message.role === "user"
                                                  ? "bg-primary/10 border-primary/20 text-primary"
                                                  : message.isError
                                                    ? "bg-destructive/10 border-destructive/20 text-destructive"
                                                    : "bg-muted border-border text-muted-foreground"
                                          }`
                                }`}
                            >
                                {message.role === "user" ? (
                                    session?.user?.image ? (
                                        <Image
                                            src={session.user.image}
                                            alt={session.user.name ?? "You"}
                                            width={32}
                                            height={32}
                                            className="h-full w-full object-cover"
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <User className="h-4 w-4" />
                                    )
                                ) : message.isError ? (
                                    <AlertCircle className="h-4 w-4" />
                                ) : (
                                    <Bot className="h-4 w-4" />
                                )}
                            </div>

                            {/* Content column */}
                            <div
                                className={`flex flex-col max-w-[85%] gap-2 ${message.role === "user" ? "items-end" : "items-start"}`}
                            >
                                {/* Message bubble */}
                                <Card
                                    className={`px-4 py-3 text-sm leading-relaxed ${
                                        message.role === "user"
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : message.isError
                                              ? "bg-destructive/5 border-destructive/20 text-destructive"
                                              : "bg-card border-border/60"
                                    }`}
                                >
                                    {message.content ? (
                                        message.role === "assistant" && !message.isError ? (
                                            renderContentWithCitations(message.content, message.sources)
                                        ) : (
                                            <span className="whitespace-pre-wrap">{message.content}</span>
                                        )
                                    ) : (
                                        isLoading &&
                                        message.role === "assistant" && (
                                            <span className="flex items-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Searching articles…
                                            </span>
                                        )
                                    )}
                                </Card>

                                {/* Source cards */}
                                {message.sources && message.sources.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {message.sources.map((source, i) => (
                                            <a
                                                key={i}
                                                href={source.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/40 bg-muted/30 text-[11px] text-muted-foreground hover:text-foreground hover:border-border/60 transition-colors group max-w-[300px]"
                                                aria-label={`Source ${i + 1}: ${source.title}`}
                                                tabIndex={0}
                                            >
                                                <span className="font-bold text-primary shrink-0">
                                                    [{i + 1}]
                                                </span>
                                                <span className="truncate">{source.title}</span>
                                                <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </a>
                                        ))}
                                    </div>
                                )}

                                {/* Metadata disclosure panel */}
                                {message.metadata && (
                                    <div className="w-full">
                                        <button
                                            onClick={() =>
                                                setExpandedMetadata(
                                                    expandedMetadata === message.id ? null : message.id,
                                                )
                                            }
                                            className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors"
                                            aria-expanded={expandedMetadata === message.id}
                                            aria-label="Toggle execution details"
                                        >
                                            <Info className="h-3 w-3" />
                                            Execution Details
                                            {expandedMetadata === message.id ? (
                                                <ChevronUp className="h-3 w-3" />
                                            ) : (
                                                <ChevronDown className="h-3 w-3" />
                                            )}
                                        </button>

                                        <AnimatePresence>
                                            {expandedMetadata === message.id && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="mt-2 p-3 rounded-lg border border-border/40 bg-muted/30 space-y-3">
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                            <MetaStat
                                                                label="Latency"
                                                                icon={<Clock className="h-3 w-3" />}
                                                                value={`${message.metadata.latencyMs}ms`}
                                                            />
                                                            <MetaStat
                                                                label="Retrieval"
                                                                icon={<Database className="h-3 w-3" />}
                                                                value={`${message.metadata.toolCalls[0]?.resultsCount ?? 0} docs`}
                                                            />
                                                            <MetaStat
                                                                label="Tokens"
                                                                icon={<Zap className="h-3 w-3" />}
                                                                value={`${message.metadata.tokensIn + message.metadata.tokensOut}`}
                                                            />
                                                            <MetaStat
                                                                label="Model"
                                                                icon={<Cpu className="h-3 w-3" />}
                                                                value={message.metadata.model}
                                                            />
                                                        </div>

                                                        {message.metadata.toolCalls[0] && (
                                                            <div className="space-y-1">
                                                                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
                                                                    Semantic Query
                                                                </p>
                                                                <div className="flex items-center gap-1.5 text-xs font-mono bg-background/50 p-1.5 rounded border border-border/20">
                                                                    <Search className="h-3 w-3 text-muted-foreground shrink-0" />
                                                                    <span className="truncate">
                                                                        {message.metadata.toolCalls[0].args.query}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Input Area */}
            <footer className="p-4 border-t border-border/40 bg-background/95 backdrop-blur shrink-0">
                <div className="max-w-3xl mx-auto">
                    <form onSubmit={handleSendMessage} className="relative flex items-center">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about AI, web dev, or recent tech…"
                            className="w-full bg-transparent border border-border/60 rounded-xl px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                            disabled={isLoading}
                            aria-label="Chat message input"
                        />
                        <Button
                            type="submit"
                            size="icon-sm"
                            className="absolute right-2 rounded-lg h-8 w-8"
                            disabled={!input.trim() || isLoading}
                            aria-label="Send message"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </form>
                    <p className="text-[10px] text-center text-muted-foreground mt-3">
                        Grounded in recent Hacker News stories · Semantic search powered by MongoDB
                        Atlas Vector Search
                    </p>
                </div>
            </footer>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Small stat component for the metadata panel
// ---------------------------------------------------------------------------

function MetaStat({ label, icon, value }: { label: string; icon: ReactNode; value: string }) {
    return (
        <div className="space-y-1">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
                {label}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {icon}
                <span>{value}</span>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Auth gate — shown when the user is not signed in
// ---------------------------------------------------------------------------

function AuthGate() {
    const handleSignIn = () => signIn("google", { callbackUrl: "/hackernews/chat" });

    return (
        <div className="flex flex-col h-screen bg-background text-foreground">
            <header className="flex items-center px-4 h-14 border-b border-border/40 bg-background/95 backdrop-blur shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/hackernews" aria-label="Back to Hacker News RAG Agent showcase">
                        <Button variant="ghost" size="icon-sm" className="rounded-full">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-sm font-bold leading-none">Hacker News RAG Agent</h1>
                        <p className="text-[10px] text-muted-foreground mt-1">Sign in to start</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center p-4">
                <Card className="max-w-sm w-full p-6 space-y-5 text-center border-border/60">
                    <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold">Sign in to chat</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            The chat uses OpenAI under the hood, so authentication is required
                            to manage usage. Your Google account is only used to identify you —
                            nothing else is stored.
                        </p>
                    </div>
                    <Button
                        className="w-full gap-2"
                        onClick={handleSignIn}
                        aria-label="Sign in with Google"
                        tabIndex={0}
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Continue with Google
                    </Button>
                    <p className="text-[10px] text-muted-foreground">
                        Rate limited to 20 messages per hour
                    </p>
                </Card>
            </main>
        </div>
    );
}
