import { z } from "zod";

export const projectTypeKeys = ["website", "webshop", "app", "webapp", "software", "ai", "game", "platform", "other"] as const;
export const featureKeys = ["cms", "payments", "accounts", "booking", "multilingual", "integrations", "dashboard", "ai", "seo"] as const;
export const budgetKeys = ["lt5k", "5-10k", "10-25k", "25-50k", "gt50k", "unsure"] as const;
export const timelineKeys = ["asap", "1-3m", "3-6m", "flexible"] as const;

export type ProjectTypeKey = (typeof projectTypeKeys)[number];
export type FeatureKey = (typeof featureKeys)[number];
export type BudgetKey = (typeof budgetKeys)[number];
export type TimelineKey = (typeof timelineKeys)[number];

/** Error messages are dictionary keys (form.errors.*) so client and server stay in sync. */
export type ErrorKey =
  | "projectTypes"
  | "description"
  | "descriptionMax"
  | "budget"
  | "timeline"
  | "name"
  | "email"
  | "phone"
  | "consent"
  | "captcha";

const phonePattern = /^\+?[0-9\s\-().]{6,20}$/;

export const step1Schema = z.object({
  projectTypes: z.array(z.enum(projectTypeKeys)).min(1, "projectTypes").max(projectTypeKeys.length),
});

export const step2Schema = z.object({
  description: z.string().trim().min(30, "description").max(5000, "descriptionMax"),
  features: z.array(z.enum(featureKeys)).max(featureKeys.length).default([]),
});

export const step3Schema = z.object({
  budget: z.enum(budgetKeys, { errorMap: () => ({ message: "budget" }) }),
  timeline: z.enum(timelineKeys, { errorMap: () => ({ message: "timeline" }) }),
});

export const step4Schema = z.object({
  name: z.string().trim().min(2, "name").max(100, "name"),
  company: z.string().trim().max(120).optional().default(""),
  email: z.string().trim().max(200, "email").email("email"),
  phone: z
    .string()
    .trim()
    .max(20, "phone")
    .refine((v) => v === "" || phonePattern.test(v), "phone")
    .optional()
    .default(""),
  consent: z.literal(true, { errorMap: () => ({ message: "consent" }) }),
});

export const stepSchemas = [step1Schema, step2Schema, step3Schema, step4Schema] as const;

export const enquirySchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema)
  .merge(step4Schema)
  .extend({
    locale: z.enum(["nl", "en"]).default("nl"),
    /** Honeypot: must stay empty. Hidden from humans and assistive tech. */
    website: z.string().max(500).optional().default(""),
    /** Client timestamp when the form was rendered; used for a minimum fill-time check. */
    startedAt: z.number().int().positive(),
    turnstileToken: z.string().max(4096).optional(),
  });

export type EnquiryInput = z.input<typeof enquirySchema>;
export type Enquiry = z.output<typeof enquirySchema>;

/** Flatten zod issues to { field: errorKey } for the UI. */
export function issuesToFieldErrors(issues: z.ZodIssue[]): Record<string, ErrorKey> {
  const out: Record<string, ErrorKey> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "form");
    if (!out[field]) out[field] = issue.message as ErrorKey;
  }
  return out;
}
