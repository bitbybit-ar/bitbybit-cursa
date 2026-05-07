import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateNip98AuthEvent } from "@/lib/nostr/verify";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { LocaleSchema, SignerTypeSchema, type Locale, type SignerType } from "@/lib/schemas/auth";
import { SESSION_DURATION_DAYS } from "@/lib/auth-constants";

/**
 * NIP-98 (HTTP Auth) login.
 *
 * The request carries the signed event in the `Authorization` header,
 * base64-encoded per the spec:
 *
 *     Authorization: Nostr <base64(JSON.stringify(event))>
 *
 * No challenge cookie, no GET round-trip. Replay protection comes
 * from:
 *   - the `u` tag binding the event to this exact URL
 *   - the `method` tag binding it to POST
 *   - the ±30s `created_at` window (validateNip98AuthEvent)
 *
 * The signer method (extension / nsec / nip46) and the buyer's
 * locale travel in custom `["cursa_signer", ...]` and
 * `["cursa_locale", ...]` tags so they are part of the signed
 * envelope — a man-in-the-middle cannot forge a different value
 * onto a captured event without invalidating the signature.
 */

const SIGNER_TAG = "cursa_signer";
const LOCALE_TAG = "cursa_locale";

function parseAuthorizationHeader(header: string | null): unknown {
  if (!header) {
    throw new BadAuth("auth_missing_header");
  }
  const [scheme, encoded] = header.split(/\s+/, 2);
  if (scheme !== "Nostr" || !encoded) {
    throw new BadAuth("auth_invalid_scheme");
  }
  try {
    const json = Buffer.from(encoded, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    throw new BadAuth("auth_invalid_base64");
  }
}

function readTag(
  tags: ReadonlyArray<ReadonlyArray<string>>,
  name: string
): string | undefined {
  return tags.find((t) => t[0] === name)?.[1];
}

function readSignerType(
  tags: ReadonlyArray<ReadonlyArray<string>>
): SignerType | null {
  const raw = readTag(tags, SIGNER_TAG);
  if (!raw) return null;
  const parsed = SignerTypeSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function readLocale(tags: ReadonlyArray<ReadonlyArray<string>>): Locale {
  const raw = readTag(tags, LOCALE_TAG);
  if (!raw) return "es";
  const parsed = LocaleSchema.safeParse(raw);
  return parsed.success ? parsed.data : "es";
}

class BadAuth extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let signedEvent: unknown;
  try {
    signedEvent = parseAuthorizationHeader(req.headers.get("authorization"));
  } catch (err) {
    if (err instanceof BadAuth) {
      return NextResponse.json({ error: err.code }, { status: 400 });
    }
    throw err;
  }

  const validation = validateNip98AuthEvent(signedEvent, {
    url: req.nextUrl.toString(),
    method: req.method,
  });
  if (!validation.ok) {
    // Clock skew gets its own code so the client can show the
    // user-actionable "sync your device's time" message instead of
    // a generic signature error.
    if (validation.reason === "clock") {
      return NextResponse.json({ error: "auth_clock_skew" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "auth_invalid_signature", reason: validation.reason },
      { status: 400 }
    );
  }

  const event = validation.event;
  const pubkey = event.pubkey;
  const signerType = readSignerType(event.tags);
  const locale = readLocale(event.tags);

  const token = await createSession({
    pubkey,
    locale,
    signer_type: signerType,
  });

  // sameSite: "strict" — Cursá auth is entirely client-side (NIP-07
  // extension, NIP-46 bunker, or pasted nsec). There is no OAuth
  // callback or partner-site form post that needs the looser "lax"
  // policy. Strict is the tighter default.
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    path: "/",
  });

  return NextResponse.json({ pubkey, locale, signer_type: signerType });
}
