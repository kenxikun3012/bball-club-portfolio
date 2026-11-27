import type { Metadata } from "next";
import { headers } from "next/headers";
import { Fraunces, Manrope, Noto_Sans_Myanmar } from "next/font/google";
import "./globals.css";

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

// Burmese secondary labels. Not preloaded: only a few short lines use it.
const myanmar = Noto_Sans_Myanmar({
  subsets: ["myanmar"],
  weight: ["400", "500"],
  variable: "--font-myanmar",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "University Basketball Club",
    template: "%s — University Basketball Club",
  },
  description: "Student-run university basketball club portfolio.",
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The middleware issues a per-request nonce for the strict CSP.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${manrope.variable} ${myanmar.variable}`}
      suppressHydrationWarning
    >
      <body>
        <script
          nonce={nonce}
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
        {children}
      </body>
    </html>
  );
}
