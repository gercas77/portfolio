export const site = {
    name: "Germán Castro",
    title: "Senior Fullstack Engineer",
    tagline:
        "I build SaaS products end to end — from product-facing Next.js apps to agentic backends on Node.js and AWS.",
    location: "Montevideo, Uruguay",
    links: {
        github: "https://github.com/gercas77",
        linkedin: "https://www.linkedin.com/in/ger-castro/",
        email: "mailto:hello@gercastro.xyz",
    },
} as const;

export const projects = [
    {
        name: "Hacker News RAG Agent",
        description:
            "A real-time Hacker News intelligence platform I am building. Event-driven ingestion, RAG with MongoDB Vector Search, and an agentic chat interface for querying tech news.",
        stack: "Next.js, RabbitMQ, MongoDB Vector Search, OpenAI, AWS ECS",
        isShowcase: true,
        href: "/hackernews",
    },
    {
        name: "VacantED",
        description:
            "A school discovery platform I co-founded, operating in Uruguay and Peru. Multi-country SaaS with SSR/SEO, school backoffice, family-facing flows, and WhatsApp Cloud API integration.",
        stack: "Next.js, MySQL, WhatsApp Cloud API",
        href: "https://vacanted.com.uy",
    },
    {
        name: "Multi-tenant e-commerce SaaS",
        description:
            "A multi-tenant e-commerce platform I built for second-hand and rental stores. Currently active in Latin America across 3 countries, with roughly 20 tenants, payments via MercadoPago integration, AWS infrastructure, CloudFront CDN tuning, electronic invoicing, and regional pricing.",
        stack: "AWS, CloudFront, MercadoPago, multi-tenant commerce",
    },
    {
        name: "Primer Saque",
        description:
            "A WhatsApp-native padel club management system I built. Agentic architecture with LLM intent classification, deterministic handlers for sensitive actions, and observability for production workflows.",
        stack: "Next.js, WhatsApp, OpenAI API, Vercel AI SDK, Langfuse",
        href: "https://primersaque.com",
    },
] as const;

export const aboutHighlights = [
    "11+ years shipping fullstack products",
    "I have built and operated 2 SaaS products independently",
    "Hands-on with AI and agentic patterns (LLMs, tooling, evals)",
] as const;

export const coreStack =
    "Next.js, TypeScript, Node.js, AWS, MongoDB & PostgreSQL, OpenAI API, Vercel AI SDK.";
