import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { MobileJoinBar } from "@/components/mobile-join-bar";
import { nextTraining } from "@/lib/content";
import { getClub } from "@/lib/content-db";

export async function generateMetadata(): Promise<Metadata> {
  const club = await getClub();
  // `absolute` stops the root layout's template being appended a second time.
  const title = club.name.includes(club.university)
    ? club.name
    : `${club.name} — ${club.university}`;
  return {
    title: {
      absolute: title,
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
      title,
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
  const next = nextTraining(club.training);

  return (
    <>
      <SiteNav club={club} />
      <main id="main">{children}</main>
      <SiteFooter club={club} />
      <MobileJoinBar
        nextPractice={next ? `${next.when}, ${next.slot.time}` : undefined}
      />
    </>
  );
}
