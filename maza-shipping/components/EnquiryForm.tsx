"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { LuArrowRight, LuCircleAlert, LuCircleCheck, LuLoader } from "react-icons/lu";
import { enquirySchema, formVariants, type FormVariant, type ServiceKey } from "@/lib/enquiry-schema";
import type { Dictionary } from "@/content/dictionaries";
import type { Locale } from "@/content/i18n";
import { company } from "@/content/site";

type Props = {
  locale: Locale;
  t: Dictionary["form"];
  variant: FormVariant;
  privacyHref: string;
  defaultService?: ServiceKey;
};

type FieldName = "name" | "company" | "email" | "phone" | "service" | "location" | "startDate" | "duration" | "description" | "consent";
type Status = "idle" | "sending" | "success" | "error";

export default function EnquiryForm({ locale, t, variant, privacyHref, defaultService }: Props) {
  const uid = useId();
  const id = (f: string) => `${uid}-${f}`;
  const formRef = useRef<HTMLFormElement>(null);
  const startedAt = useRef<number>(0);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverMsg, setServerMsg] = useState("");

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const services = formVariants[variant];

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      ...Object.fromEntries(
        ["name", "company", "email", "phone", "service", "location", "startDate", "duration", "description", "website"].map((k) => [
          k,
          String(fd.get(k) ?? ""),
        ]),
      ),
      consent: fd.get("consent") === "on",
      variant,
      locale,
      startedAt: startedAt.current || Date.now(),
    };

    const parsed = enquirySchema.omit({ website: true }).safeParse(payload);
    if (!parsed.success) {
      const next: Partial<Record<FieldName, string>> = {};
      for (const issue of parsed.error.issues) {
        const f = issue.path[0] as FieldName;
        if (f in t.errors && !next[f]) next[f] = t.errors[f as keyof typeof t.errors];
      }
      setErrors(next);
      const first = Object.keys(next)[0];
      if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }

    setErrors({});
    setStatus("sending");
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setStatus("success");
        formRef.current?.reset();
        return;
      }
      setServerMsg(res.status === 429 ? t.rateLimited : t.error);
      setStatus("error");
    } catch {
      setServerMsg(t.error);
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div role="status" className="rounded-2xl border border-teal/30 bg-teal/5 p-8 sm:p-10">
        <LuCircleCheck aria-hidden className="h-10 w-10 text-teal" />
        <h3 className="mt-5 text-2xl font-bold text-navy">{t.success.title}</h3>
        <p className="mt-3 text-slate">{t.success.text}</p>
        <a href={company.phoneHref} className="btn-outline-dark mt-6">
          {company.phoneDisplay}
        </a>
      </div>
    );
  }

  const label = (f: FieldName, required = false) => (
    <label htmlFor={id(f)} className="mb-2 block text-sm font-semibold text-navy">
      {t.fields[f as keyof typeof t.fields]}
      {required && (
        <span className="ml-1 text-signal-dark" aria-hidden>
          *
        </span>
      )}
      {required && <span className="sr-only"> ({t.required})</span>}
    </label>
  );
  const err = (f: FieldName) =>
    errors[f] ? (
      <p id={id(`${f}-err`)} className="mt-2 flex items-center gap-1.5 text-sm font-medium text-red-700">
        <LuCircleAlert aria-hidden className="h-4 w-4" /> {errors[f]}
      </p>
    ) : null;
  const a11y = (f: FieldName) => ({
    id: id(f),
    name: f,
    "aria-invalid": errors[f] ? true : undefined,
    "aria-describedby": errors[f] ? id(`${f}-err`) : undefined,
  });

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-2" aria-busy={status === "sending"}>
      {hasErrors && (
        <p role="alert" className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800 sm:col-span-2">
          <LuCircleAlert aria-hidden className="h-4 w-4" /> {t.errors.summary}
        </p>
      )}

      <div>
        {label("name", true)}
        <input {...a11y("name")} type="text" autoComplete="name" required className="field" />
        {err("name")}
      </div>
      <div>
        {label("company")}
        <input {...a11y("company")} type="text" autoComplete="organization" className="field" />
      </div>
      <div>
        {label("email", true)}
        <input {...a11y("email")} type="email" autoComplete="email" inputMode="email" required className="field" />
        {err("email")}
      </div>
      <div>
        {label("phone")}
        <input {...a11y("phone")} type="tel" autoComplete="tel" inputMode="tel" className="field" />
        {err("phone")}
      </div>
      <div className="sm:col-span-2">
        {label("service", true)}
        <select {...a11y("service")} required defaultValue={defaultService ?? ""} className="field appearance-none bg-[length:16px] bg-[right_1rem_center] bg-no-repeat pr-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23071827' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}>
          <option value="" disabled>
            {t.selectPlaceholder}
          </option>
          {services.map((s) => (
            <option key={s} value={s}>
              {t.services[s]}
            </option>
          ))}
        </select>
        {err("service")}
      </div>
      <div className="sm:col-span-2">
        {label("location")}
        <input {...a11y("location")} type="text" placeholder={t.placeholders.location} className="field" />
      </div>
      <div>
        {label("startDate")}
        <input {...a11y("startDate")} type="date" className="field" />
      </div>
      <div>
        {label("duration")}
        <input {...a11y("duration")} type="text" placeholder={t.placeholders.duration} className="field" />
      </div>
      <div className="sm:col-span-2">
        {label("description", true)}
        <textarea {...a11y("description")} rows={5} required placeholder={t.placeholders.description} className="field resize-y" />
        {err("description")}
      </div>

      {/* Honeypot – hidden from people and assistive tech */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={id("website")}>Website</label>
        <input id={id("website")} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={id("consent")} className="flex cursor-pointer items-start gap-3 text-sm text-slate">
          <input
            {...a11y("consent")}
            type="checkbox"
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-line accent-teal"
          />
          <span>
            {t.consent}{" "}
            <Link href={privacyHref} className="font-semibold text-teal underline underline-offset-2">
              {t.privacyLink}
            </Link>
          </span>
        </label>
        {err("consent")}
      </div>

      <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-xs leading-relaxed text-slate">{t.privacy}</p>
        <button type="submit" disabled={status === "sending"} className="btn-dark shrink-0 disabled:opacity-60">
          {status === "sending" ? (
            <>
              <LuLoader aria-hidden className="h-4 w-4 animate-spin" /> {t.sending}
            </>
          ) : (
            <>
              {t.submit} <LuArrowRight aria-hidden className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      {status === "error" && (
        <p role="alert" className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800 sm:col-span-2">
          <LuCircleAlert aria-hidden className="h-4 w-4 shrink-0" /> {serverMsg}{" "}
          <a className="underline" href={`mailto:${company.email}`}>
            {company.email}
          </a>
        </p>
      )}
    </form>
  );
}
