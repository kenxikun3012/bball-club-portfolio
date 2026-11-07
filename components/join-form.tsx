"use client";

import { useState } from "react";
import { club } from "@/lib/content";

const positions = [
  "Point guard",
  "Shooting guard",
  "Small forward",
  "Power forward",
  "Center",
  "Not sure yet",
];

const years = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate"];

const fieldClass =
  "w-full rounded-sm border border-ink/15 bg-cream-50 px-4 py-4 type-small text-ink placeholder:text-muted/60 transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30";

const labelClass = "mb-2 block type-label text-muted";

export function JoinForm() {
  const [status, setStatus] = useState<"idle" | "sent">("idle");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const position = String(data.get("position") ?? "");
    const year = String(data.get("year") ?? "");
    const message = String(data.get("message") ?? "").trim();

    const subject = `Club application — ${name || "new player"}`;
    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Preferred position: ${position}`,
      `Year: ${year}`,
      "",
      "About me:",
      message,
    ].join("\n");

    window.location.href = `mailto:${club.email}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    setStatus("sent");
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8" aria-describedby="join-form-note">
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
            className={fieldClass}
          />
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
            className={fieldClass}
          />
        </div>
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          <label htmlFor="join-position" className={labelClass}>
            Preferred position
          </label>
          <select id="join-position" name="position" defaultValue="" className={fieldClass}>
            <option value="" disabled>
              Choose one
            </option>
            {positions.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="join-year" className={labelClass}>
            Year of study
          </label>
          <select id="join-year" name="year" defaultValue="" className={fieldClass}>
            <option value="" disabled>
              Choose one
            </option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
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
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-8 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-4 rounded-sm bg-ink px-8 py-4 type-label text-cream-100 transition-colors hover:bg-secondary hover:text-ink"
        >
          Send application
          <span aria-hidden="true">→</span>
        </button>
        <p id="join-form-note" aria-live="polite" className="type-small leading-relaxed text-muted">
          {status === "sent"
            ? "Your email app should open with the application ready to send."
            : "This opens your email app — no account needed."}
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
