import { z } from "zod";
import { parseLightningAddress } from "@/lib/lightning";

const HEX_64_RE = /^[0-9a-f]{64}$/i;
const HEX_128_RE = /^[0-9a-f]{128}$/i;

/**
 * 64-character hex string (case-insensitive on the way in, lowercase
 * on the way out). Used for any Nostr event id or pubkey we persist —
 * the DB stores lowercase-only so the transform keeps callers honest.
 */
export const Hex64Schema = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().regex(HEX_64_RE, "must be a 64-character hex string"))
  .transform((s) => s.toLowerCase());

/** Same wire format as Hex64; semantic alias for pubkey-shaped fields. */
export const NostrPubkeySchema = Hex64Schema;

/**
 * 128-character hex string — the wire shape of a BIP-340 Schnorr
 * signature (64 raw bytes). Used for the `sig` field of a Nostr
 * event. Kept separate from Hex64Schema so we don't reject valid
 * signatures against the 64-char regex.
 */
export const Hex128Schema = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().regex(HEX_128_RE, "must be a 128-character hex string"))
  .transform((s) => s.toLowerCase());

/**
 * Lightning Address. Format: local-part@domain.tld, max 128 chars.
 * Refines on `parseLightningAddress` from lib/lightning so the one
 * place this regex lives is the same place the resolver uses. The
 * settings PATCH route does an additional LUD-21 sanity check by
 * minting a probe invoice; the schema only enforces surface shape.
 */
export const LightningAddressSchema = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => parseLightningAddress(s) !== null, {
    message: "lightning_address_invalid",
  });
