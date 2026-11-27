import { Reveal } from "@/components/reveal";
import { JoinForm } from "@/components/join-form";
import {
  contactHandle,
  extractEmail,
  isUnofficialContact,
  type Club,
} from "@/lib/content";

const NEXT_STEPS = [
  { title: "Send the form", detail: "About a minute. Beginners welcome." },
  { title: "We message you", detail: "The committee reads applications every week in term." },
  { title: "Come and play", detail: "Turn up to a session, meet the squad, see if it fits." },
];

export function Contact({ club }: { club: Club }) {
  const email = extractEmail(club.email);
  const instagram = contactHandle(club.instagram);
  const unofficial = isUnofficialContact(club.email) || isUnofficialContact(club.instagram);

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
              <h2 id="join-title" className="type-h2 text-balance">
                Step on the <span className="text-accent">court.</span>
              </h2>
              <p className="mt-6 max-w-md type-lead text-ink-soft">
                We recruit every December, but the door stays{" "}
                <span className="text-secondary-ink">open all year</span>. No experience
                needed for the development squad.
              </p>

              <ol className="mt-12 grid gap-6 border-t border-secondary/40 pt-8">
                {NEXT_STEPS.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink type-label text-cream-100"
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="type-h4">{step.title}</p>
                      <p className="type-small text-ink-soft">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>

              {club.training.length > 0 ? (
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
              ) : null}

              <div className="mt-8 grid gap-8 border-t border-secondary/40 pt-8 sm:grid-cols-2">
                <div>
                  <h3 className="type-label text-muted">Where</h3>
                  <p className="mt-4 type-small text-ink-soft">
                    {club.homeCourt}
                    <span className="mt-2 block">{club.address}</span>
                  </p>
                </div>
                <div>
                  <h3 className="type-label text-muted">Say hello</h3>
                  <ul className="mt-2 type-small">
                    {email ? (
                      <li>
                        <a
                          href={`mailto:${email}`}
                          className="inline-flex min-h-11 items-center break-all underline decoration-ink/40 underline-offset-4 transition-colors hover:text-accent"
                        >
                          {email}
                        </a>
                      </li>
                    ) : null}
                    {instagram ? (
                      <li className="text-ink-soft">Instagram: {instagram}</li>
                    ) : null}
                  </ul>
                  {unofficial ? (
                    <p className="mt-2 type-small text-muted">
                      No official club accounts yet — these reach a committee member.
                    </p>
                  ) : null}
                </div>
              </div>
            </Reveal>
          </div>

          <div className="md:col-span-6 md:col-start-7">
            <Reveal delay={120}>
              <div className="border border-ink/10 border-t-4 border-t-accent bg-cream-50 p-6 shadow-[0_30px_70px_-50px_rgba(23,20,15,0.55)] sm:p-8">
                <div className="flex flex-col-reverse items-start gap-4 border-b border-secondary/40 pb-6 sm:flex-row sm:justify-between sm:gap-8">
                  <div>
                    <h3 className="type-h3">Apply in one minute</h3>
                    <p className="mt-2 type-small text-muted">Faster than a free throw.</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-secondary bg-secondary-wash px-2 py-2 type-label text-ink">
                    Open all year
                  </span>
                </div>
                <div className="mt-8">
                  <JoinForm club={club} />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
