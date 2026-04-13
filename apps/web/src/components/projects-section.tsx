"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { projects } from "@/lib/site";
import { ArrowRight, ExternalLink, Star } from "lucide-react";

export default function ProjectsSection() {
    return (
        <section
            id="projects"
            aria-labelledby="projects-heading"
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
                        id="projects-heading"
                        className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                    >
                        Showcase & Projects
                    </h2>
                    <p className="mt-4 max-w-2xl text-muted-foreground">
                        A selection of projects I have built, spanning edtech discovery, multi-tenant
                        commerce, messaging agents, and AI-native SaaS.
                    </p>
                </motion.div>

                <ul
                    className="mt-12 grid gap-6 md:grid-cols-2"
                    role="list"
                >
                    {projects.map((project, index) => {
                        const isShowcase = "isShowcase" in project && project.isShowcase;
                        const href = "href" in project ? (project.href as string) : undefined;
                        const isExternal = href?.startsWith("http");

                        const CardWrapper = ({ children }: { children: React.ReactNode }) => {
                            if (!href) {
                                return <div className="h-full">{children}</div>;
                            }
                            if (isExternal) {
                                return (
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block h-full group"
                                        aria-label={`Visit ${project.name} live site (opens in new tab)`}
                                    >
                                        {children}
                                    </a>
                                );
                            }
                            return (
                                <Link href={href} className="block h-full group">
                                    {children}
                                </Link>
                            );
                        };

                        return (
                            <motion.li
                                key={project.name}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-40px" }}
                                transition={{ duration: 0.4, delay: index * 0.06 }}
                            >
                                <CardWrapper>
                                    <Card className={`h-full border-border/60 bg-card/50 transition-all hover:border-primary/30 ${isShowcase ? "ring-1 ring-primary/20 bg-primary/[0.02]" : ""}`}>
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    {project.name}
                                                    {isShowcase && (
                                                        <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                                                    )}
                                                </CardTitle>
                                                {href &&
                                                    (isExternal ? (
                                                        <ExternalLink
                                                            aria-hidden
                                                            className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                                                        />
                                                    ) : (
                                                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                                                    ))}
                                            </div>
                                            <CardDescription className="text-xs font-mono text-primary/90">
                                                {project.stack}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                {project.description}
                                            </p>
                                            {isShowcase && (
                                                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary">
                                                    View case study{" "}
                                                    <ArrowRight className="h-3 w-3" aria-hidden />
                                                </div>
                                            )}
                                            {!isShowcase && href && isExternal && (
                                                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
                                                    Opens live site in a new tab{" "}
                                                    <ExternalLink className="h-3 w-3" aria-hidden />
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </CardWrapper>
                            </motion.li>
                        );
                    })}
                </ul>
            </div>
        </section>
    );
}
