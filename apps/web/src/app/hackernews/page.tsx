import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
    ArrowRight, 
    Zap, 
    Search, 
    ShieldCheck, 
    Cpu, 
    Database, 
    Network,
    ExternalLink,
    CheckCircle2
} from "lucide-react";

export default function HackerNewsRagAgentPage() {
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            {/* Navigation */}
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-4 sm:px-6">
                    <Link href="/" className="flex items-center space-x-2">
                        <span className="font-bold text-lg tracking-tight">Germán Castro</span>
                    </Link>
                    <nav className="flex items-center space-x-4">
                        <Link href="/#projects" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                            Projects
                        </Link>
                        <Button size="sm" variant="default" className="cursor-pointer">
                            <Link href="/hackernews/chat" className="flex items-center">
                                Try Chat <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </nav>
                </div>
            </header>

            <main className="flex-1">
                {/* Hero Section */}
                <section className="py-20 px-4 sm:px-6">
                    <div className="mx-auto max-w-4xl text-center">
                        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-6">
                            Showcase Project
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6">
                            Hacker News RAG Agent
                        </h1>
                        <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                            I am building an event-driven platform that ingests Hacker News stories in real time, enriches them with content and summaries, and makes them searchable through conversational AI.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button size="lg" className="h-12 px-8 cursor-pointer">
                                <Link href="/hackernews/chat" className="flex items-center">
                                    Launch Interactive Chat <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                            <Button size="lg" variant="outline" className="h-12 px-8 cursor-pointer">
                                <a href="https://github.com/gercas77/portfolio" target="_blank" rel="noopener noreferrer" className="flex items-center">
                                    View Source Code <ExternalLink className="ml-2 h-4 w-4" />
                                </a>
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Architecture Overview */}
                <section className="py-20 bg-muted/30 px-4 sm:px-6">
                    <div className="mx-auto max-w-5xl">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold mb-4">Engineering Showcase</h2>
                            <p className="text-muted-foreground max-w-2xl mx-auto">
                                I built this project to practice and demonstrate production-grade event-driven architecture, RAG, and agentic AI patterns.
                            </p>
                        </div>

                        <div className="grid gap-8 md:grid-cols-3">
                            <Card className="border-border/60 bg-card/50">
                                <CardHeader>
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
                                        <Zap className="h-6 w-6" />
                                    </div>
                                    <CardTitle>Event-Driven</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        I use Firebase SSE for real-time ingestion and RabbitMQ for parallel processing of embeddings, content extraction, and summarization.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-border/60 bg-card/50">
                                <CardHeader>
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
                                        <Search className="h-6 w-6" />
                                    </div>
                                    <CardTitle>RAG & Vector Search</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        I implemented Retrieval-Augmented Generation using MongoDB Vector Search, with semantic matching on title embeddings and structured pre-filtering.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-border/60 bg-card/50">
                                <CardHeader>
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
                                        <Cpu className="h-6 w-6" />
                                    </div>
                                    <CardTitle>Agentic Patterns</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        The chat uses an LLM agent with tool use (search_hn) that autonomously decides how to generate queries and apply filters.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* The Problem & Solution */}
                <section className="py-24 px-4 sm:px-6">
                    <div className="mx-auto max-w-4xl">
                        <div className="grid gap-12 md:grid-cols-2 items-center">
                            <div>
                                <h2 className="text-3xl font-bold mb-6">Why Hacker News?</h2>
                                <div className="space-y-4 text-muted-foreground leading-relaxed">
                                    <p>
                                        I chose Hacker News because it provides a publicly verifiable, text-rich, real-time data source — a good fit for demonstrating semantic search in practice.
                                    </p>
                                    <p>
                                        Unlike keyword search, the RAG agent understands the <em>meaning</em> behind your queries. Asking about &quot;modern database trends&quot; will find articles about Vector DBs, SQLite&apos;s resurgence, and Edge-native storage, even if those exact words aren&apos;t in the query.
                                    </p>
                                    <ul className="space-y-2 mt-6">
                                        <li className="flex items-center gap-2 text-foreground font-medium">
                                            <CheckCircle2 className="h-4 w-4 text-primary" />
                                            Real-time SSE Ingestion
                                        </li>
                                        <li className="flex items-center gap-2 text-foreground font-medium">
                                            <CheckCircle2 className="h-4 w-4 text-primary" />
                                            Article Content Extraction
                                        </li>
                                        <li className="flex items-center gap-2 text-foreground font-medium">
                                            <CheckCircle2 className="h-4 w-4 text-primary" />
                                            GPT-4o Summarization
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <div className="relative aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center p-8 overflow-hidden">
                                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]"></div>
                                <div className="relative z-10 space-y-4 w-full">
                                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm transform -rotate-2">
                                        <div className="flex gap-2 mb-2">
                                            <div className="h-2 w-2 rounded-full bg-red-500"></div>
                                            <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                        </div>
                                        <p className="text-xs font-mono text-primary">search_hn(&quot;AI agents in production&quot;)</p>
                                    </div>
                                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm transform translate-x-4">
                                        <p className="text-xs text-muted-foreground mb-2">Found 3 relevant articles...</p>
                                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-primary w-2/3"></div>
                                        </div>
                                    </div>
                                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm transform rotate-1 translate-x-1">
                                        <p className="text-xs leading-relaxed">Based on recent HN stories, AI agents are shifting from simple wrappers to complex multi-step workflows...</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Technical Decisions */}
                <section className="py-24 bg-muted/30 px-4 sm:px-6">
                    <div className="mx-auto max-w-5xl">
                        <h2 className="text-3xl font-bold mb-12 text-center">Technical Decisions</h2>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="p-6 rounded-xl border border-border/60 bg-card/50">
                                <h3 className="font-bold mb-2 flex items-center gap-2">
                                    <Network className="h-4 w-4 text-primary" />
                                    RabbitMQ vs SQS
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    I chose RabbitMQ for explicit control over messaging topology. Exchanges, queues, and bindings are declared in code, keeping the event-driven logic versioned and reviewable.
                                </p>
                            </div>
                            <div className="p-6 rounded-xl border border-border/60 bg-card/50">
                                <h3 className="font-bold mb-2 flex items-center gap-2">
                                    <Database className="h-4 w-4 text-primary" />
                                    MongoDB Vector Search
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    I use MongoDB for unified storage of structured metadata and vector embeddings. This enables efficient pre-filtering (e.g., &quot;only stories from the last 24h&quot;) before performing semantic similarity search.
                                </p>
                            </div>
                            <div className="p-6 rounded-xl border border-border/60 bg-card/50">
                                <h3 className="font-bold mb-2 flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-primary" />
                                    Circuit Breakers
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    I implemented circuit breakers on the OpenAI-dependent consumers. If OpenAI is down, the consumer unsubscribes, letting messages accumulate safely in RabbitMQ instead of wasting retry budget.
                                </p>
                            </div>
                            <div className="p-6 rounded-xl border border-border/60 bg-card/50">
                                <h3 className="font-bold mb-2 flex items-center gap-2">
                                    <Cpu className="h-4 w-4 text-primary" />
                                    ECS on EC2 (Single Instance)
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    I chose a single EC2 instance over Fargate to keep costs low while getting hands-on experience managing containerized infrastructure on AWS.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-24 px-4 sm:px-6">
                    <div className="mx-auto max-w-3xl text-center">
                        <h2 className="text-3xl font-bold mb-6">Ready to explore?</h2>
                        <p className="text-xl text-muted-foreground mb-10">
                            The chat is currently running on a seeded dataset I prepared for validation. Try asking about recent trends in AI, web development, or system design.
                        </p>
                        <Button size="lg" className="h-14 px-10 text-lg cursor-pointer">
                            <Link href="/hackernews/chat" className="flex items-center">
                                Open Interactive Chat <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                    </div>
                </section>
            </main>

            <footer className="border-t border-border/40 py-12 px-4 sm:px-6">
                <div className="mx-auto max-w-5xl flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-sm text-muted-foreground">
                        Built by Germán Castro &copy; 2026
                    </p>
                    <div className="flex items-center space-x-6">
                        <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            Portfolio
                        </Link>
                        <a href="https://github.com/gercas77" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            GitHub
                        </a>
                        <a href="https://linkedin.com/in/ger-castro" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            LinkedIn
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
