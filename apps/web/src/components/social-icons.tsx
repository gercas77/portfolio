import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

const iconClass = "size-4 shrink-0";

export function GitHubIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className={cn(iconClass, className)}
            aria-hidden
            {...props}
        >
            <path d="M12 .5C5.65.5.5 5.37.5 11.77c0 5 3.24 9.23 7.75 10.73.57.1.79-.24.79-.55 0-.27-.01-1.14-.01-2.06-3.14.66-3.8-1.54-3.8-1.54-.51-1.31-1.26-1.66-1.26-1.66-1.03-.69.08-.68.08-.68 1.14.08 1.74 1.18 1.74 1.18 1.01 1.73 2.66 1.23 3.31.94.1-.73.39-1.23.72-1.52-2.51-.28-5.14-1.25-5.14-5.57 0-1.23.44-2.24 1.16-3.03-.12-.29-.5-1.45.11-3.02 0 0 .95-.3 3.11 1.16.9-.25 1.88-.38 2.85-.38.96 0 1.94.13 2.85.38 2.16-1.46 3.11-1.16 3.11-1.16.61 1.58.23 2.73.11 3.02.72.79 1.16 1.8 1.16 3.03 0 4.33-2.64 5.28-5.16 5.56.41.35.77 1.04.77 2.09 0 1.51-.01 2.73-.01 3.11 0 .31.21.66.8.55 4.5-1.5 7.74-5.73 7.74-10.73C23.5 5.37 18.35.5 12 .5Z" />
        </svg>
    );
}

export function LinkedInIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className={cn(iconClass, className)}
            aria-hidden
            {...props}
        >
            <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.96v5.65H9.35V9h3.41v1.56h.05c.48-.9 1.65-1.85 3.4-1.85 3.63 0 4.3 2.39 4.3 5.5v6.24ZM5.34 7.43a2.07 2.07 0 0 1-2.09-2.06 2.07 2.07 0 1 1 2.09 2.06ZM3.56 20.45h3.56V9H3.56v11.45Z" />
        </svg>
    );
}
