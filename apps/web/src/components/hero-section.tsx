"use client";

import { motion } from "framer-motion";
import { ArrowDown, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GitHubIcon, LinkedInIcon } from "@/components/social-icons";
import { site } from "@/lib/site";

const socialLinks = [
    {
        label: "GitHub",
        href: site.links.github,
        Icon: GitHubIcon,
    },
    {
        label: "LinkedIn",
        href: site.links.linkedin,
        Icon: LinkedInIcon,
    },
    {
        label: "Email",
        href: site.links.email,
        Icon: Mail,
    },
] as const;

const handleScrollToProjects = () => {
    document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" });
};

const handleKeyDownScroll = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleScrollToProjects();
};

export default function HeroSection() {
    return (
        <section
            id="top"
            aria-labelledby="hero-heading"
            className="relative isolate overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24"
        >
            <div
                className="pointer-events-none absolute inset-0 -z-10 opacity-90"
                aria-hidden
            >
                <div
                    className="absolute inset-0"
                    style={{
                        background: `
              radial-gradient(ellipse 80% 60% at 20% 20%, oklch(0.35 0.08 195 / 0.45), transparent 55%),
              radial-gradient(ellipse 70% 50% at 80% 30%, oklch(0.32 0.06 280 / 0.35), transparent 50%),
              radial-gradient(ellipse 60% 45% at 50% 90%, oklch(0.28 0.05 195 / 0.3), transparent 55%),
              linear-gradient(180deg, oklch(0.145 0 0) 0%, oklch(0.12 0 0) 100%)
            `,
                    }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(1_0_0/0.03)_1px,transparent_1px),linear-gradient(to_bottom,oklch(1_0_0/0.03)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />
            </div>

            <div className="mx-auto max-w-5xl">
                <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-4 text-sm font-medium tracking-wide text-primary"
                >
                    {site.location}
                </motion.p>
                <motion.h1
                    id="hero-heading"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.05 }}
                    className="font-heading text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl"
                >
                    {site.name}
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.12 }}
                    className="mt-4 max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl"
                >
                    {site.title} — {site.tagline}
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.2 }}
                    className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"
                >
                    <div className="flex flex-wrap gap-3">
                        <Button type="button" onClick={handleScrollToProjects} onKeyDown={handleKeyDownScroll}>
                            View projects
                            <ArrowDown className="ml-1 size-4" aria-hidden />
                        </Button>
                    </div>
                    <ul className="flex flex-wrap gap-2 sm:justify-end" role="list">
                        {socialLinks.map(({ label, href, Icon }) => (
                            <li key={label}>
                                <a
                                    href={href}
                                    target={href.startsWith("mailto") ? undefined : "_blank"}
                                    rel={href.startsWith("mailto") ? undefined : "noopener noreferrer"}
                                    aria-label={label}
                                    className="inline-flex size-10 items-center justify-center rounded-lg border border-border/80 bg-background/50 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <Icon className="size-4" aria-hidden />
                                </a>
                            </li>
                        ))}
                    </ul>
                </motion.div>
            </div>
        </section>
    );
}
