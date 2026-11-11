import { z } from "zod";

export const serviceKeys = [
  "ferryjo", "towing", "launch", "ice", "escort",
  "tugBroker", "barge", "workboat", "equipment", "project", "coordination", "other",
] as const;
export type ServiceKey = (typeof serviceKeys)[number];

export const formVariants = {
  charter: ["ferryjo", "towing", "launch", "ice", "escort", "other"],
  brokerage: ["tugBroker", "barge", "workboat", "equipment", "project", "coordination", "other"],
  contact: [
    "ferryjo", "towing", "launch", "ice", "escort",
    "tugBroker", "barge", "workboat", "equipment", "project", "coordination", "other",
  ],
} as const satisfies Record<string, readonly ServiceKey[]>;
export type FormVariant = keyof typeof formVariants;

const phoneRe = /^[+()0-9\s.-]{6,25}$/;

/** Shared by the client (instant feedback) and the API route (authoritative). */
export const enquirySchema = z.object({
  name: z.string().trim().min(2, "name").max(120, "name"),
  company: z.string().trim().max(160).optional().default(""),
  email: z.string().trim().email("email").max(200, "email"),
  phone: z
    .string()
    .trim()
    .max(25, "phone")
    .refine((v) => v === "" || phoneRe.test(v), "phone")
    .optional()
    .default(""),
  service: z.enum(serviceKeys, { errorMap: () => ({ message: "service" }) }),
  location: z.string().trim().max(200).optional().default(""),
  startDate: z.string().trim().max(40).optional().default(""),
  duration: z.string().trim().max(80).optional().default(""),
  description: z.string().trim().min(10, "description").max(5000, "description"),
  consent: z.literal(true, { errorMap: () => ({ message: "consent" }) }),
  variant: z.enum(["charter", "brokerage", "contact"]).default("contact"),
  locale: z.enum(["en", "nl"]).default("en"),
  // Spam protection
  website: z.string().max(0).optional().default(""), // honeypot: must stay empty
  startedAt: z.number().int().positive(),
});

export type EnquiryInput = z.input<typeof enquirySchema>;
export type Enquiry = z.output<typeof enquirySchema>;
