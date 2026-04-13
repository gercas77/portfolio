import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import AuthSessionProvider from "@/components/session-provider";

const fontSans = Inter({
    subsets: ["latin"],
    variable: "--font-sans",
});

const fontMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
});

export const metadata: Metadata = {
    title: "Germán Castro — Senior Fullstack Engineer",
    description:
        "Portfolio of Germán Castro: 11+ years building SaaS across Latin America. Next.js, TypeScript, AI integration, AWS.",
    metadataBase: new URL("https://gercastro.xyz"),
    openGraph: {
        title: "Germán Castro — Senior Fullstack Engineer",
        description:
            "Portfolio and public work: VacantED, Primer Saque, e-commerce SaaS, Hacker News RAG, and more.",
        url: "https://gercastro.xyz",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={cn("dark scroll-smooth", fontSans.variable, fontMono.variable)}>
            <body className="min-h-screen bg-background font-sans text-foreground antialiased">
                <AuthSessionProvider>{children}</AuthSessionProvider>
            </body>
        </html>
    );
}
