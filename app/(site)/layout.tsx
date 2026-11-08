import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getClub } from "@/lib/content-db";

export async function generateMetadata(): Promise<Metadata> {
  const club = await getClub();
  return {
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
}

export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const club = await getClub();

  return (
    <>
      <SiteNav club={club} />
      <main id="main">{children}</main>
      <SiteFooter club={club} />
    </>
  );
}
