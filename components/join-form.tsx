"use client";

import { useState } from "react";
import { club } from "@/lib/content";
import { POSITIONS, YEARS } from "@/lib/form-options";

type Status = "idle" | "sending" | "success" | "error";

const fieldClass =
  "w-full rounded-sm border border-ink/15 bg-cream-50 px-4 py-4 type-small text-ink placeholder:text-muted/60 transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 aria-[invalid=true]:border-accent";

const labelClass = "mb-2 block type-label text-muted";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 type-small text-accent">
      {message}
    </p>
  );
}

export function JoinForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [feedback, setFeedback] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

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

    setStatus("sending");
    setFeedback("");
    setErrors({});

    try {
      const response = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        fields?: Record<string, string>;
      };

      if (!response.ok) {
        setStatus("error");
        setFeedback(result.message ?? "Could not send your application.");
        setErrors(result.fields ?? {});
        return;
      }

      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
      setFeedback("Network error — check your connection and try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="border border-secondary/60 bg-secondary-wash p-8">
        <p className="type-label text-secondary-ink">Application received</p>
        <p className="mt-4 type-h4">Thanks — we&apos;ll be in touch.</p>
        <p className="mt-2 type-small text-ink-soft/75">
          The committee reviews applications every week during term. If you don&apos;t hear
          back within ten days, email us at{" "}
          <a
            href={`mailto:${club.email}`}
            className="underline decoration-ink/20 underline-offset-4 hover:text-accent"
          >
            {club.email}
          </a>
          .
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-4 type-small underline decoration-ink/25 underline-offset-4 transition-colors hover:text-accent"
        >
          Send another application
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-8"
      aria-describedby="join-form-note"
      noValidate
    >
      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          <label htmlFor="join-name" className={labelClass}>
            Your name
          </label>
          <input
            id="join-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Alex Morgan"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "join-name-error" : undefined}
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
            placeholder="you@your-university.edu"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "join-email-error" : undefined}
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
            placeholder="+1 555 123 4567"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "join-phone-error" : undefined}
            className={fieldClass}
          />
          <FieldError id="join-phone-error" message={errors.phone} />
        </div>
        <div>
          <label htmlFor="join-year" className={labelClass}>
            Year of study
          </label>
          <select
            id="join-year"
            name="year"
            required
            defaultValue=""
            aria-invalid={Boolean(errors.year)}
            aria-describedby={errors.year ? "join-year-error" : undefined}
            className={fieldClass}
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
          <FieldError id="join-year-error" message={errors.year} />
        </div>
      </div>

      <div>
        <label htmlFor="join-position" className={labelClass}>
          Preferred position
        </label>
        <select
          id="join-position"
          name="position"
          required
          defaultValue=""
          aria-invalid={Boolean(errors.position)}
          aria-describedby={errors.position ? "join-position-error" : undefined}
          className={fieldClass}
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
        <FieldError id="join-position-error" message={errors.position} />
      </div>

      <div>
        <label htmlFor="join-message" className={labelClass}>
          Anything else?
        </label>
        <textarea
          id="join-message"
          name="message"
          rows={4}
          placeholder="Experience, availability, or just say hello."
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "join-message-error" : undefined}
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

      <label className="flex items-start gap-4 type-small text-ink-soft">
        <input
          type="checkbox"
          name="consent"
          required
          aria-invalid={Boolean(errors.consent)}
          className="mt-2 h-4 w-4 shrink-0 accent-[#c2410c]"
        />
        <span>
          I agree to be contacted about my application and to the club storing these
          details for recruitment.
        </span>
      </label>
      <FieldError id="join-consent-error" message={errors.consent} />

      {status === "error" && feedback ? (
        <p
          role="alert"
          className="border border-accent/30 bg-accent-wash px-4 py-2 type-small text-accent"
        >
          {feedback}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex items-center justify-center gap-4 rounded-sm bg-ink px-8 py-4 type-label text-cream-100 transition-colors hover:bg-secondary hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Send application"}
          <span aria-hidden="true">→</span>
        </button>
        <p id="join-form-note" aria-live="polite" className="type-small leading-relaxed text-muted">
          Stored securely — up to 3 applications per person per day.
        </p>
      </div>

      <p className="border-t border-secondary/40 pt-4 type-small leading-relaxed text-muted">
        Prefer to write directly? Email{" "}
        <a
          href={`mailto:${club.email}`}
          className="underline decoration-ink/20 underline-offset-4 hover:text-accent"
        >
          {club.email}
        </a>
        .
      </p>
    </form>
  );
}
