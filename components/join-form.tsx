"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown } from "@/components/icons";
import { cn } from "@/lib/cn";
import { POSITIONS, YEARS } from "@/lib/form-options";
import { extractEmail, type Club } from "@/lib/content";
import { joinFieldSchemas } from "@/lib/validation";

type Status = "idle" | "sending" | "success" | "error";
type FieldName = "name" | "email" | "phone" | "year" | "position" | "message" | "consent";

const DRAFT_FIELDS = ["name", "email", "phone", "year", "position", "message"] as const;
const DRAFT_KEY = "ytu-join-draft-v1";

/** Keep the sending state on screen long enough to read, even on a fast connection. */
const MIN_SENDING_MS = 600;

const riseDelay = (ms: number) => ({ "--rise-delay": `${ms}ms` }) as React.CSSProperties;

const fieldClass =
  "w-full rounded-sm border border-ink/15 bg-cream-50 px-4 py-4 type-small text-ink placeholder:text-muted transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50 aria-[invalid=true]:border-accent aria-[invalid=true]:bg-accent-wash/40";

const labelClass = "mb-2 block type-label text-muted";

/** Same rules as the server (shared zod schemas), run in the browser first. */
function validateField(name: FieldName, value: string | boolean): string | undefined {
  switch (name) {
    case "name":
    case "email":
    case "phone":
    case "message": {
      const result = joinFieldSchemas[name].safeParse(String(value));
      return result.success ? undefined : result.error.issues[0]?.message;
    }
    case "year":
      return value ? undefined : "Choose your year of study.";
    case "position":
      return value ? undefined : "Choose a position — “Not sure yet” is fine.";
    case "consent":
      return value ? undefined : "Please agree to be contacted so we can reply.";
  }
}

function isField(name: string): name is FieldName {
  return ["name", "email", "phone", "year", "position", "message", "consent"].includes(name);
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 type-small text-accent">
      {message}
    </p>
  );
}

function describedBy(...ids: (string | false | undefined)[]) {
  const value = ids.filter(Boolean).join(" ");
  return value || undefined;
}

export function JoinForm({ club }: { club: Club }) {
  const [status, setStatus] = useState<Status>("idle");
  const [feedback, setFeedback] = useState("");
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [restored, setRestored] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const email = extractEmail(club.email);

  // Bring back anything typed before a refresh or an accidental tab close.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    try {
      const raw = window.sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<Record<(typeof DRAFT_FIELDS)[number], string>>;
      let any = false;
      for (const name of DRAFT_FIELDS) {
        const field = form.elements.namedItem(name) as HTMLInputElement | null;
        const value = draft[name];
        if (field && typeof value === "string" && value) {
          field.value = value;
          any = true;
        }
      }
      setRestored(any);
    } catch {
      // Storage can be unavailable (private mode); the form still works.
    }
  }, [status === "success"]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard and screen-reader users land on the outcome instead of losing focus
  // when the form is replaced or comes back with errors.
  useEffect(() => {
    if (status === "success") {
      successRef.current?.focus();
    } else if (status === "error") {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  function saveDraft(form: HTMLFormElement) {
    const data = new FormData(form);
    const draft = Object.fromEntries(DRAFT_FIELDS.map((name) => [name, String(data.get(name) ?? "")]));
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }

  function fieldValue(target: EventTarget): [FieldName, string | boolean] | null {
    const field = target as HTMLInputElement;
    if (!field.name || !isField(field.name)) return null;
    return [field.name, field.type === "checkbox" ? field.checked : field.value];
  }

  function setFieldError(name: FieldName, message: string | undefined) {
    setErrors((previous) => {
      if (previous[name] === message) return previous;
      const next = { ...previous };
      if (message) next[name] = message;
      else delete next[name];
      return next;
    });
  }

  function handleBlur(event: React.FocusEvent<HTMLFormElement>) {
    const entry = fieldValue(event.target);
    if (!entry) return;
    const [name, value] = entry;
    // Don't scold an empty field the visitor merely tabbed past.
    if (value === "" && !errors[name]) return;
    setFieldError(name, validateField(name, value));
  }

  function handleChange(event: React.FormEvent<HTMLFormElement>) {
    saveDraft(event.currentTarget);
    const entry = fieldValue(event.target);
    if (!entry) return;
    const [name, value] = entry;
    // Once a field has an error, clear it the moment the input becomes valid.
    if (errors[name]) setFieldError(name, validateField(name, value));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    const payload = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? ""),
      position: String(data.get("position") ?? ""),
      year: String(data.get("year") ?? ""),
      message: String(data.get("message") ?? ""),
      consent: data.get("consent") === "on",
      website: String(data.get("website") ?? ""),
    };

    const found: Partial<Record<FieldName, string>> = {};
    for (const name of ["name", "email", "phone", "year", "position", "message", "consent"] as const) {
      const message = validateField(name, payload[name]);
      if (message) found[name] = message;
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setFeedback(
        Object.keys(found).length === 1
          ? "One thing to fix before sending."
          : `${Object.keys(found).length} things to fix before sending.`,
      );
      setStatus("error");
      // Re-run the focus effect even if the status was already "error".
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }

    setStatus("sending");
    setFeedback("");
    setErrors({});

    try {
      const [response] = await Promise.all([
        fetch("/api/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
        new Promise((resolve) => setTimeout(resolve, MIN_SENDING_MS)),
      ]);

      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        fields?: Partial<Record<FieldName, string>>;
      };

      if (!response.ok) {
        setStatus("error");
        setFeedback(result.message ?? "Could not send your application.");
        setErrors(result.fields ?? {});
        return;
      }

      try {
        window.sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      setRestored(false);
      setStatus("success");
    } catch {
      setStatus("error");
      setFeedback("Network error — your answers are kept. Check your connection and try again.");
    }
  }

  const sending = status === "sending";

  if (status === "success") {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="rise-in border border-secondary/60 bg-secondary-wash p-8 focus:outline-none"
      >
        <svg
          viewBox="0 0 48 48"
          aria-hidden="true"
          className="h-12 w-12 text-accent"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle className="check-ring" cx="24" cy="24" r="20" transform="rotate(-90 24 24)" />
          <path className="check-mark" d="M15 25 l6 6 l12 -13" />
        </svg>
        <p className="rise-in mt-6 type-label text-secondary-ink" style={riseDelay(150)}>
          Application received
        </p>
        <p className="rise-in mt-4 type-h4" style={riseDelay(250)}>
          Thanks — we&apos;ll be in touch.
        </p>
        <p className="rise-in mt-2 type-small text-ink-soft" style={riseDelay(350)}>
          The committee reads applications every week during term and will message you
          with a session to come to. If you don&apos;t hear back within ten days,{" "}
          {email ? (
            <>
              email{" "}
              <a
                href={`mailto:${email}`}
                className="underline decoration-ink/40 underline-offset-4 hover:text-accent"
              >
                {email}
              </a>
              .
            </>
          ) : (
            "find us at training."
          )}
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          style={riseDelay(450)}
          className="rise-in mt-4 inline-flex min-h-11 items-center type-small underline decoration-ink/30 underline-offset-4 transition-colors hover:text-accent"
        >
          Send another application
        </button>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onBlur={handleBlur}
      onChange={handleChange}
      className="grid gap-8"
      aria-describedby="join-form-note"
      aria-busy={sending}
      noValidate
    >
      <div
        aria-hidden="true"
        className={cn(
          "sending-bar -mb-8 transition-opacity duration-300",
          sending ? "opacity-100" : "opacity-0",
        )}
      />

      {restored ? (
        <p className="border-l border-secondary px-4 type-small text-ink-soft">
          We kept what you typed earlier — pick up where you left off.
        </p>
      ) : null}

      <fieldset
        disabled={sending}
        className="grid min-w-0 gap-8 transition-opacity duration-300 disabled:opacity-50"
      >
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <label htmlFor="join-name" className={labelClass}>
              Full name
            </label>
            <input
              id="join-name"
              name="name"
              type="text"
              required
              autoComplete="name"
              placeholder="As on your student ID"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={describedBy(errors.name && "join-name-error")}
              className={fieldClass}
            />
            <FieldError id="join-name-error" message={errors.name} />
          </div>
          <div>
            <label htmlFor="join-email" className={labelClass}>
              Email
            </label>
            <input
              id="join-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              spellCheck={false}
              placeholder="you@example.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={describedBy(errors.email && "join-email-error")}
              className={fieldClass}
            />
            <FieldError id="join-email-error" message={errors.email} />
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <label htmlFor="join-phone" className={labelClass}>
              Phone
            </label>
            <input
              id="join-phone"
              name="phone"
              type="tel"
              required
              inputMode="tel"
              autoComplete="tel"
              placeholder="09 123 456 789"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={describedBy(
                "join-phone-hint",
                errors.phone && "join-phone-error",
              )}
              className={fieldClass}
            />
            {errors.phone ? (
              <FieldError id="join-phone-error" message={errors.phone} />
            ) : (
              <p id="join-phone-hint" className="mt-2 type-small text-muted">
                Myanmar numbers starting 09 are fine.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="join-year" className={labelClass}>
              Year of study
            </label>
            <div className="relative">
              <select
                id="join-year"
                name="year"
                required
                defaultValue=""
                aria-invalid={Boolean(errors.year)}
                aria-describedby={describedBy(errors.year && "join-year-error")}
                className={cn(fieldClass, "appearance-none pr-10")}
              >
                <option value="" disabled>
                  Choose one
                </option>
                {YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
            </div>
            <FieldError id="join-year-error" message={errors.year} />
          </div>
        </div>

        <div>
          <label htmlFor="join-position" className={labelClass}>
            Preferred position
          </label>
          <div className="relative">
            <select
              id="join-position"
              name="position"
              required
              defaultValue=""
              aria-invalid={Boolean(errors.position)}
              aria-describedby={describedBy(errors.position && "join-position-error")}
              className={cn(fieldClass, "appearance-none pr-10")}
            >
              <option value="" disabled>
                Choose one
              </option>
              {POSITIONS.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
          </div>
          <FieldError id="join-position-error" message={errors.position} />
        </div>

        <div>
          <label htmlFor="join-message" className={labelClass}>
            Anything else? <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <textarea
            id="join-message"
            name="message"
            rows={4}
            placeholder="Experience, availability, or just say hello."
            aria-invalid={Boolean(errors.message)}
            aria-describedby={describedBy(errors.message && "join-message-error")}
            className={fieldClass}
          />
          <FieldError id="join-message-error" message={errors.message} />
        </div>

        {/* Honeypot — hidden from people, tempting to bots. */}
        <div className="sr-only" aria-hidden="true">
          <label htmlFor="join-website">Website</label>
          <input
            id="join-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            defaultValue=""
          />
        </div>

        <div>
          <label className="flex min-h-11 cursor-pointer items-start gap-4 type-small text-ink-soft">
            <input
              type="checkbox"
              name="consent"
              required
              aria-invalid={Boolean(errors.consent)}
              aria-describedby={describedBy(errors.consent && "join-consent-error")}
              className="h-5 w-5 shrink-0"
            />
            <span>
              I agree to be contacted about my application and to the club storing these
              details for recruitment.
            </span>
          </label>
          <FieldError id="join-consent-error" message={errors.consent} />
        </div>
      </fieldset>

      {status === "error" && feedback ? (
        <p
          role="alert"
          className="nudge border border-accent/50 bg-accent-wash px-4 py-2 type-small text-ink"
        >
          {feedback}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={sending}
          className="group inline-flex min-h-12 items-center justify-center gap-4 rounded-sm bg-ink px-8 type-label text-cream-100 transition-colors hover:bg-accent disabled:cursor-progress disabled:hover:bg-ink"
        >
          {sending ? "Sending…" : "Send application"}
          {sending ? (
            <span aria-hidden="true" className="spinner" />
          ) : (
            <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
          )}
        </button>
        <p id="join-form-note" className="type-small text-muted">
          All fields are required unless marked optional.
        </p>
      </div>
    </form>
  );
}
