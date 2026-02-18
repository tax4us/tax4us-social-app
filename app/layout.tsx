import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Assistant, Secular_One } from "next/font/google";

const assistant = Assistant({
  subsets: ["latin", "hebrew"],
  variable: "--font-assistant",
});

const secularOne = Secular_One({
  subsets: ["latin", "hebrew"],
  weight: "400",
  variable: "--font-secular-one",
});

export const metadata: Metadata = {
  title: "Tax4US Platform - AI Content Factory",
  description: "AI-powered content marketing automation system for cross-border Israeli-American tax advisory services. Bilingual content generation, SEO optimization, and multi-channel publishing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body
        className={`${assistant.variable} ${secularOne.variable} antialiased font-sans`}
        suppressHydrationWarning
      >
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
