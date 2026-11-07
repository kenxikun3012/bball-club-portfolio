import { Reveal } from "@/components/reveal";
import { JoinForm } from "@/components/join-form";
import { club } from "@/lib/content";

export function Contact() {
  return (
    <section
      id="join"
      aria-labelledby="join-title"
      className="scroll-mt-20 bg-secondary-wash/40 py-24 md:py-32"
    >
      <div className="mx-auto max-w-[1240px] px-6 md:px-10">
        <div className="grid gap-16 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5">
            <Reveal>
              <div className="flex items-center gap-4 type-label text-accent">
                <span>05</span>
                <span aria-hidden="true" className="h-px w-8 bg-secondary" />
                <span>Join the club</span>
              </div>
              <h2 id="join-title" className="mt-8 type-h2 text-balance">
                Step on
                <br />
                the <span className="text-secondary-ink">court.</span>
              </h2>
              <p className="mt-6 max-w-md type-lead text-ink-soft">
                We recruit every September, but the door stays{" "}
                <span className="text-secondary-ink">open all year</span>. Come to an open gym,
                say hello, and see if the club fits. No experience needed for the development
                squad.
              </p>

              <div className="mt-12 border-t border-secondary/40 pt-8">
                <h3 className="type-label text-muted">Weekly training</h3>
                <dl className="mt-4 divide-y divide-ink/10">
                  {club.training.map((slot) => (
                    <div
                      key={slot.day}
                      className="flex items-baseline justify-between gap-8 py-4"
                    >
                      <dt className="type-h4">{slot.day}</dt>
                      <dd className="text-right">
                        <span className="block type-small text-ink-soft">{slot.time}</span>
                        <span className="mt-2 block type-label text-muted">{slot.note}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="mt-8 grid gap-8 border-t border-secondary/40 pt-8 sm:grid-cols-2">
                <div>
                  <h3 className="type-label text-muted">Where</h3>
                  <p className="mt-4 type-small leading-relaxed text-ink-soft">
                    {club.homeCourt}
                    <br />
                    {club.address}
                  </p>
                </div>
                <div>
                  <h3 className="type-label text-muted">Say hello</h3>
                  <p className="mt-4 type-small leading-relaxed">
                    <a
                      href={`mailto:${club.email}`}
                      className="block break-words underline decoration-ink/20 underline-offset-4 transition-colors hover:text-accent"
                    >
                      {club.email}
                    </a>
                    <span className="mt-2 block text-ink-soft">{club.instagram}</span>
                  </p>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="md:col-span-6 md:col-start-7">
            <Reveal delay={120}>
              <div className="border border-ink/10 border-t-4 border-t-secondary bg-cream-50 p-8 shadow-[0_30px_70px_-50px_rgba(23,20,15,0.55)]">
                <div className="flex items-start justify-between gap-8 border-b border-secondary/40 pb-6">
                  <div>
                    <h3 className="type-h3">Apply in one minute</h3>
                    <p className="mt-2 type-small text-muted">Faster than a free throw.</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-secondary bg-secondary-wash px-2 py-2 type-label text-ink/80">
                    Open all year
                  </span>
                </div>
                <div className="mt-8">
                  <JoinForm />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
