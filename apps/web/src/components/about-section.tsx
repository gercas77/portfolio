"use client";

import { motion } from "framer-motion";
import { aboutHighlights, coreStack } from "@/lib/site";
import { Separator } from "@/components/ui/separator";

export default function AboutSection() {
    return (
        <section
            id="about"
            aria-labelledby="about-heading"
            className="scroll-mt-24 px-4 py-20 sm:px-6"
        >
            <div className="mx-auto max-w-5xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.45 }}
                >
                    <h2
                        id="about-heading"
                        className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                    >
                        About
                    </h2>
                    <p className="mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                        I am a senior fullstack engineer focused on SaaS delivery across Latin America.
                        I build product UIs with Next.js and TypeScript, resilient APIs on Node.js,
                        data layers on MongoDB and PostgreSQL, and cloud operations on AWS. Lately
                        I have been putting a strong emphasis on AI features, from simple completions
                        to agentic workflows, instrumented for production.
                    </p>
                    <Separator className="my-10 bg-border/80" />
                    <p className="text-sm font-medium uppercase tracking-wider text-primary">
                        Core stack
                    </p>
                    <p className="mt-3 max-w-3xl text-muted-foreground">{coreStack}</p>
                    <ul className="mt-10 grid gap-4 sm:grid-cols-3" role="list">
                        {aboutHighlights.map((item) => (
                            <li
                                key={item}
                                className="rounded-xl border border-border/60 bg-card/40 px-4 py-4 text-sm text-card-foreground ring-1 ring-foreground/5"
                            >
                                {item}
                            </li>
                        ))}
                    </ul>
                </motion.div>
            </div>
        </section>
    );
}
