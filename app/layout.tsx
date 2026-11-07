import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { club } from "@/lib/content";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${club.name} — ${club.university}`,
    template: `%s — ${club.shortName}`,
  },
  description: club.seoDescription,
  keywords: [
    "university basketball",
    "basketball club",
    "college basketball",
    "student athletics",
    club.name,
  ],
  openGraph: {
    title: `${club.name} — ${club.university}`,
    description: club.seoDescription,
    type: "website",
    locale: "en_US",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${manrope.variable}`}
      // The inline script below adds a `js` class to <html> before hydration,
      // so suppress the expected attribute mismatch on this element only.
      suppressHydrationWarning
    >
      <body>
        <script
          // Adds the `js` class before first paint so reveal animations can
          // start hidden only when JavaScript is available.
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')",
          }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-sm focus:bg-ink focus:px-4 focus:py-2 focus:type-small focus:text-cream-50"
        >
          Skip to content
        </a>
        <SiteNav />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
