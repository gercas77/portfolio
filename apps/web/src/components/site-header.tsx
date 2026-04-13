"use client";

import { cn } from "@/lib/utils";
import { site } from "@/lib/site";
import Link from "next/link";

const navLinkClass =
    "text-muted-foreground hover:text-foreground focus-visible:text-foreground rounded-md px-2 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const sections = [
    { id: "about", label: "About" },
    { id: "projects", label: "Projects" },
    { id: "contact", label: "Contact" },
] as const;

export default function SiteHeader() {
    return (
        <header
            className={cn(
                "sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md",
            )}
        >
            <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
                <a
                    href="#top"
                    className="font-heading text-sm font-semibold tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`${site.name} — back to top`}
                >
                    {site.name.split(" ")[0]}
                    <span className="text-primary">.</span>
                </a>
                <nav aria-label="Page sections" className="flex items-center gap-1 sm:gap-3">
                    {sections.map((item) => (
                        <Link
                            key={item.id}
                            href={`#${item.id}`}
                            className={navLinkClass}
                            scroll
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>
            </div>
        </header>
    );
}
