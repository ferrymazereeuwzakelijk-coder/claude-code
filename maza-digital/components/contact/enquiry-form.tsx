"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, Check, CheckCircle2, Loader2 } from "lucide-react";
import type { Dictionary } from "@/content/dictionaries";
import {
  budgetKeys,
  featureKeys,
  projectTypeKeys,
  stepSchemas,
  timelineKeys,
  issuesToFieldErrors,
  type BudgetKey,
  type ErrorKey,
  type FeatureKey,
  type ProjectTypeKey,
  type TimelineKey,
} from "@/lib/enquiry-schema";
import { href, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FormState = {
  projectTypes: ProjectTypeKey[];
  description: string;
  features: FeatureKey[];
  budget: BudgetKey | "";
  timeline: TimelineKey | "";
  name: string;
  company: string;
  email: string;
  phone: string;
  consent: boolean;
  website: string; // honeypot
};

const initial: FormState = {
  projectTypes: [],
  description: "",
  features: [],
  budget: "",
  timeline: "",
  name: "",
  company: "",
  email: "",
  phone: "",
  consent: false,
  website: "",
};

const fieldStep: Record<string, number> = {
  projectTypes: 0,
  description: 1,
  features: 1,
  budget: 2,
  timeline: 2,
  name: 3,
  company: 3,
  email: 3,
  phone: 3,
  consent: 3,
  form: 3,
};

type Status = "idle" | "submitting" | "success" | "not_configured" | "rate_limited" | "error";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

export function EnquiryForm({ locale, dict, email }: { locale: Locale; dict: Dictionary["form"]; email: string }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Record<string, ErrorKey>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [token, setToken] = useState<string>("");
  const startedAt = useRef<number>(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileId = useRef<string | null>(null);
  const reduce = useReducedMotion();
  const uid = useId();
  const total = dict.stepLabels.length;

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  // Move focus to the step heading when the step changes (keyboard & screen reader users).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const renderTurnstile = () => {
    if (!turnstileSiteKey || !window.turnstile || !turnstileRef.current || turnstileId.current) return;
    turnstileId.current = window.turnstile.render(turnstileRef.current, {
      sitekey: turnstileSiteKey,
      theme: "dark",
      language: locale,
      callback: (t: string) => setToken(t),
      "expired-callback": () => setToken(""),
    });
  };
  useEffect(() => {
    if (step === total - 1) renderTurnstile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setData((d) => ({ ...d, [key]: value }));
    if (errors[key as string])
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
  };

  const toggle = <K extends "projectTypes" | "features">(key: K, value: FormState[K][number]) => {
    const list = data[key] as string[];
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    set(key, next as FormState[K]);
  };

  const validateStep = (i: number): boolean => {
    const schema = stepSchemas[i];
    if (!schema) return true;
    const result = schema.safeParse(data);
    if (result.success) return true;
    setErrors(issuesToFieldErrors(result.error.issues));
    return false;
  };

  const next = () => {
    if (validateStep(step)) {
      setErrors({});
      setStep((s) => Math.min(s + 1, total - 1));
    }
  };
  const back = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < total - 1) return next();

    for (let i = 0; i < total; i++) {
      if (!validateStep(i)) {
        setStep(i);
        return;
      }
    }
    if (turnstileSiteKey && !token) {
      setErrors({ form: "captcha" });
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, locale, startedAt: startedAt.current, turnstileToken: token || undefined }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; fields?: Record<string, ErrorKey> };

      if (res.ok && json.ok) {
        setStatus("success");
        return;
      }
      if (json.error === "validation" && json.fields) {
        setErrors(json.fields);
        const first = Object.keys(json.fields)[0];
        setStep(first ? (fieldStep[first] ?? total - 1) : total - 1);
        setStatus("idle");
        if (turnstileId.current) window.turnstile?.reset(turnstileId.current);
        setToken("");
        return;
      }
      setStatus(json.error === "not_configured" ? "not_configured" : json.error === "rate_limited" ? "rate_limited" : "error");
    } catch {
      setStatus("error");
    }
  };

  const err = (field: string) => (errors[field] ? dict.errors[errors[field]!] : undefined);
  const errId = (field: string) => `${uid}-${field}-error`;

  if (status === "success") {
    return (
      <div role="status" className="rounded-xl border border-line bg-ink-2 p-8 md:p-12">
        <CheckCircle2 aria-hidden className="size-10 text-blue" />
        <h2 className="mt-6 text-3xl font-semibold tracking-[-0.03em]">{dict.successTitle}</h2>
        <p className="type-lead mt-4">{dict.successBody}</p>
      </div>
    );
  }

  const slide = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -24 } };

  return (
    <form onSubmit={submit} noValidate className="relative overflow-hidden rounded-xl border border-line bg-ink-2 p-6 md:p-10" aria-describedby={`${uid}-progress`}>
      {turnstileSiteKey && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="lazyOnload" onLoad={renderTurnstile} />
      )}

      {/* Progress */}
      <div id={`${uid}-progress`}>
        <p className="text-sm text-mist">
          {dict.stepOf.replace("{current}", String(step + 1)).replace("{total}", String(total))}
        </p>
        <ol className="mt-4 grid grid-cols-4 gap-2" aria-hidden>
          {dict.stepLabels.map((label, i) => (
            <li key={label}>
              <span className={cn("block h-1 rounded-full transition-colors duration-500", i <= step ? "bg-blue" : "bg-white/10")} />
              <span className={cn("mt-2 hidden text-xs md:block", i === step ? "text-white" : "text-mist")}>{label}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Honeypot: invisible to people and assistive tech, tempting for bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${uid}-website`}>Website</label>
        <input
          id={`${uid}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={data.website}
          onChange={(e) => set("website", e.target.value)}
        />
      </div>

      <div className="relative mt-10 min-h-[22rem]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} {...slide} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
            <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-[-0.03em] outline-none md:text-3xl">
              {dict.stepLabels[step]}
            </h2>

            {step === 0 && (
              <fieldset className="mt-8" aria-describedby={err("projectTypes") ? errId("projectTypes") : undefined}>
                <legend className="text-base font-medium text-white">{dict.projectType}</legend>
                <p className="mt-1 text-sm text-mist">{dict.projectTypeHint}</p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {projectTypeKeys.map((k) => (
                    <Chip key={k} checked={data.projectTypes.includes(k)} onChange={() => toggle("projectTypes", k)} label={dict.projectTypes[k]} />
                  ))}
                </div>
                <FieldError id={errId("projectTypes")} message={err("projectTypes")} />
              </fieldset>
            )}

            {step === 1 && (
              <div className="mt-8 space-y-8">
                <div>
                  <Label htmlFor={`${uid}-description`}>{dict.description}</Label>
                  <p id={`${uid}-description-hint`} className="mt-1 text-sm text-mist">
                    {dict.descriptionHint}
                  </p>
                  <Textarea
                    id={`${uid}-description`}
                    className="mt-3"
                    value={data.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder={dict.descriptionPlaceholder}
                    maxLength={5000}
                    required
                    aria-invalid={Boolean(err("description"))}
                    aria-describedby={`${uid}-description-hint ${err("description") ? errId("description") : ""}`}
                  />
                  <div className="mt-2 flex justify-between gap-4">
                    <FieldError id={errId("description")} message={err("description")} />
                    <span className="ml-auto text-xs tabular-nums text-mist">{data.description.length} / 5000</span>
                  </div>
                </div>
                <fieldset>
                  <legend className="text-base font-medium text-white">{dict.features}</legend>
                  <p className="mt-1 text-sm text-mist">{dict.featuresHint}</p>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {featureKeys.map((k) => (
                      <Chip key={k} checked={data.features.includes(k)} onChange={() => toggle("features", k)} label={dict.featureOptions[k]} />
                    ))}
                  </div>
                </fieldset>
              </div>
            )}

            {step === 2 && (
              <div className="mt-8 space-y-10">
                <RadioGroup
                  name={`${uid}-budget`}
                  legend={dict.budget}
                  hint={dict.budgetHint}
                  options={budgetKeys.map((k) => ({ value: k, label: dict.budgets[k] }))}
                  value={data.budget}
                  onChange={(v) => set("budget", v as BudgetKey)}
                  error={err("budget")}
                  errorId={errId("budget")}
                />
                <RadioGroup
                  name={`${uid}-timeline`}
                  legend={dict.timeline}
                  options={timelineKeys.map((k) => ({ value: k, label: dict.timelines[k] }))}
                  value={data.timeline}
                  onChange={(v) => set("timeline", v as TimelineKey)}
                  error={err("timeline")}
                  errorId={errId("timeline")}
                />
              </div>
            )}

            {step === 3 && (
              <div className="mt-8 grid gap-6 md:grid-cols-2">
                <TextField id={`${uid}-name`} label={dict.name} value={data.name} onChange={(v) => set("name", v)} autoComplete="name" required error={err("name")} errorId={errId("name")} />
                <TextField id={`${uid}-company`} label={dict.companyOptional} value={data.company} onChange={(v) => set("company", v)} autoComplete="organization" />
                <TextField id={`${uid}-email`} label={dict.email} type="email" value={data.email} onChange={(v) => set("email", v)} autoComplete="email" required error={err("email")} errorId={errId("email")} />
                <TextField id={`${uid}-phone`} label={dict.phone} type="tel" value={data.phone} onChange={(v) => set("phone", v)} autoComplete="tel" error={err("phone")} errorId={errId("phone")} />

                <div className="md:col-span-2">
                  <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-fog">
                    <input
                      type="checkbox"
                      checked={data.consent}
                      onChange={(e) => set("consent", e.target.checked)}
                      aria-invalid={Boolean(err("consent"))}
                      aria-describedby={err("consent") ? errId("consent") : undefined}
                      className="mt-1 size-4 shrink-0 accent-[#4B7BFF]"
                    />
                    <span>
                      {dict.consent}{" "}
                      <Link href={href(locale, "/privacy")} target="_blank" className="text-white underline underline-offset-4">
                        {dict.consentLink}
                      </Link>
                      .
                    </span>
                  </label>
                  <FieldError id={errId("consent")} message={err("consent")} />
                </div>

                {turnstileSiteKey && (
                  <div className="md:col-span-2">
                    <div ref={turnstileRef} />
                  </div>
                )}
                <div className="md:col-span-2">
                  <FieldError id={errId("form")} message={err("form")} />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Delivery problems: always explicit, never a fake success. */}
      {(status === "not_configured" || status === "error" || status === "rate_limited") && (
        <div role="alert" className="mt-8 flex gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm leading-relaxed text-white">
          <AlertCircle aria-hidden className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            {status === "rate_limited" ? (
              <p>{dict.rateLimited}</p>
            ) : (
              <>
                <p className="font-medium">{status === "not_configured" ? dict.notConfiguredTitle : dict.errorTitle}</p>
                <p className="mt-1 text-fog">
                  {status === "not_configured" ? dict.notConfiguredBody : dict.errorBody}{" "}
                  <a href={`mailto:${email}`} className="text-white underline underline-offset-4">
                    {email}
                  </a>
                  .
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-6">
        <Button type="button" variant="ghost" onClick={back} className={cn(step === 0 && "invisible")}>
          {dict.back}
        </Button>
        {step < total - 1 ? (
          <Button type="button" onClick={next}>
            {dict.next}
          </Button>
        ) : (
          <Button type="submit" variant="accent" disabled={status === "submitting"} aria-busy={status === "submitting"}>
            {status === "submitting" && <Loader2 aria-hidden className="animate-spin" />}
            {status === "submitting" ? dict.submitting : dict.submit}
          </Button>
        )}
      </div>
    </form>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 flex items-center gap-1.5 text-sm text-destructive">
      <AlertCircle aria-hidden className="size-4" />
      {message}
    </p>
  );
}

function Chip({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue",
        checked ? "border-blue bg-blue/10 text-white" : "border-line text-fog hover:border-line-strong hover:text-white",
      )}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span
        aria-hidden
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded border transition-colors",
          checked ? "border-blue bg-blue text-white" : "border-line-strong",
        )}
      >
        {checked && <Check className="size-3.5" />}
      </span>
      {label}
    </label>
  );
}

function RadioGroup({
  name,
  legend,
  hint,
  options,
  value,
  onChange,
  error,
  errorId,
}: {
  name: string;
  legend: string;
  hint?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  error?: string;
  errorId: string;
}) {
  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="text-base font-medium text-white">{legend}</legend>
      {hint && <p className="mt-1 text-sm text-mist">{hint}</p>}
      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue",
                checked ? "border-blue bg-blue/10 text-white" : "border-line text-fog hover:border-line-strong hover:text-white",
              )}
            >
              <input type="radio" name={name} value={o.value} checked={checked} onChange={() => onChange(o.value)} className="sr-only" />
              <span
                aria-hidden
                className={cn("grid size-5 shrink-0 place-items-center rounded-full border", checked ? "border-blue" : "border-line-strong")}
              >
                {checked && <span className="size-2.5 rounded-full bg-blue" />}
              </span>
              {o.label}
            </label>
          );
        })}
      </div>
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  required,
  error,
  errorId,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  error?: string;
  errorId?: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error && errorId ? errorId : undefined}
        className="mt-2"
      />
      {errorId && <FieldError id={errorId} message={error} />}
    </div>
  );
}
