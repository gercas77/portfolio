"use client";

import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { site } from "@/lib/site";

const links = [
    {
        label: "Email",
        href: site.links.email,
        external: false,
    },
    {
        label: "LinkedIn",
        href: site.links.linkedin,
        external: true,
    },
    {
        label: "GitHub",
        href: site.links.github,
        external: true,
    },
] as const;

export default function ContactSection() {
    return (
        <section
            id="contact"
            aria-labelledby="contact-heading"
            className="scroll-mt-24 px-4 py-24 sm:px-6"
        >
            <div className="mx-auto max-w-5xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.45 }}
                    className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 to-background px-6 py-12 ring-1 ring-foreground/5 sm:px-10 sm:py-14"
                >
                    <h2
                        id="contact-heading"
                        className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                    >
                        Contact
                    </h2>
                    <p className="mt-4 max-w-xl text-muted-foreground">
                        Prefer email for new opportunities; social links for code and background.
                    </p>
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                        {links.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                target={link.external ? "_blank" : undefined}
                                rel={link.external ? "noopener noreferrer" : undefined}
                                className={cn(
                                    buttonVariants({
                                        variant: link.external ? "outline" : "default",
                                        size: "lg",
                                    }),
                                    "inline-flex justify-center sm:w-auto",
                                )}
                            >
                                {link.label}
                                {link.external ? (
                                    <ExternalLink className="ml-2 size-4" aria-hidden />
                                ) : null}
                            </a>
                        ))}
                    </div>
                </motion.div>

                <p className="mt-12 text-center text-xs text-muted-foreground">
                    © {new Date().getFullYear()} {site.name}. Built with Next.js & Tailwind.
                </p>
            </div>
        </section>
    );
}
