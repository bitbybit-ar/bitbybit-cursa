import { z } from "zod";

const SIGNER_TYPES = ["extension", "nsec", "nip46"] as const;

export const SignerTypeSchema = z.enum(SIGNER_TYPES);
export type SignerType = (typeof SIGNER_TYPES)[number];

export const LocaleSchema = z.enum(["es", "en"]);
export type Locale = z.infer<typeof LocaleSchema>;
