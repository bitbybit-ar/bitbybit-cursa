"use client";

/**
 * SignerProvider — combined session + in-memory Nostr signer state.
 *
 * The arena reference (bitbybit-arena/lib/signer-context.tsx) splits
 * this into a SessionProvider + SignerProvider pair plus a
 * re-sign-in modal so logged-in users who reload mid-session can
 * re-attach their nsec/nip46 signer for ad-hoc signing actions.
 *
 * Cursá's buyer flow only signs once — at login. After that, the
 * session cookie carries the user; nothing else needs the signer.
 * So this slimmed version owns:
 *   - session fetch (`/api/auth/session`)
 *   - the in-memory signer for the current page session only
 *   - the NIP-98 login round-trip
 *   - sign-out (clears cookie + signer)
 *
 * If a future feature needs post-login signing (e.g. a buyer
 * re-publishing a receipt DM), reach for the arena reference and
 * pull in the `signWithPrompt` + `requestReSignIn` machinery rather
 * than retrofitting it here.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  type SignerHandle,
  makeExtensionSigner,
} from "@/lib/nostr/signers";
import type { SignerType, Locale } from "@/lib/schemas/auth";

export interface SessionUser {
  pubkey: string;
  locale: Locale;
  signer_type: SignerType | null;
  is_admin: boolean;
}

/**
 * Outcome of `completeLoginWithSigner`. The discriminator lets
 * callers tell a 429 apart from a real auth failure and a
 * cancellation apart from an actual error.
 *
 *  - `network`      — `fetch` itself rejected (offline, CORS, DNS).
 *  - `rate_limited` — server returned 429.
 *  - `api`          — server returned a non-OK status. `code` is
 *                     whatever the server emitted (e.g.
 *                     `auth_invalid_signature`, `auth_clock_skew`).
 *  - `signer`       — the signer threw before we even hit the API
 *                     (user cancelled, extension declined). `cause`
 *                     carries the original error so the caller can
 *                     decide whether to swallow it
 *                     (`isSignerCancellation`) or surface it.
 */
export type LoginResult =
  | { ok: true }
  | { ok: false; reason: "network" }
  | { ok: false; reason: "rate_limited" }
  | { ok: false; reason: "api"; code?: string }
  | { ok: false; reason: "signer"; cause: unknown };

interface SignerContextValue {
  session: SessionUser | null;
  /** True until the initial session fetch resolves. */
  sessionLoading: boolean;
  signer: SignerHandle | null;
  setSigner: (signer: SignerHandle) => void;
  completeLoginWithSigner: (
    signer: SignerHandle,
    locale: Locale
  ) => Promise<LoginResult>;
  signOut: () => Promise<void>;
  /** Re-fetch the session from /api/auth/session. */
  refresh: () => Promise<void>;
}

const SignerContext = createContext<SignerContextValue | null>(null);

export function useSignerContext(): SignerContextValue {
  const ctx = useContext(SignerContext);
  if (!ctx) {
    throw new Error("useSignerContext must be used within SignerProvider");
  }
  return ctx;
}

export function SignerProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [signer, setSignerState] = useState<SignerHandle | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (!res.ok) {
        setSession(null);
        return;
      }
      const data = (await res.json()) as { session: SessionUser | null };
      setSession(data.session);
    } catch {
      setSession(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await refresh();
      if (!cancelled) setSessionLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const setSigner = useCallback((next: SignerHandle) => {
    setSignerState((prev) => {
      if (prev && prev !== next) prev.close?.();
      return next;
    });
  }, []);

  // Auto-restore extension signer when the session is valid and
  // window.nostr is present. The extension is the only signer that
  // survives reloads — the key lives in the extension itself, not
  // in our app memory.
  useEffect(() => {
    if (!session || signer) return;
    if (session.signer_type !== "extension") return;

    let cancelled = false;
    const tryAttach = async () => {
      if (typeof window === "undefined" || !window.nostr) return;
      try {
        const pk = await window.nostr.getPublicKey();
        if (cancelled) return;
        if (pk === session.pubkey) {
          setSigner(makeExtensionSigner(pk));
        }
      } catch {
        // Extension declined or unavailable — leave signer null.
      }
    };

    void tryAttach();
    // Extensions can inject window.nostr asynchronously after page
    // load; retry once after a short delay.
    const timer = setTimeout(() => void tryAttach(), 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [session, signer, setSigner]);

  const completeLoginWithSigner = useCallback(
    async (next: SignerHandle, locale: Locale): Promise<LoginResult> => {
      // NIP-98 HTTP Auth: build a kind:27235 event whose `u` tag
      // pins the absolute request URL, `method` tag pins the verb,
      // and the custom `cursa_signer` + `cursa_locale` tags travel
      // inside the signed envelope (a MITM cannot forge different
      // values without invalidating the signature). Empty content
      // per the spec.
      const url = new URL(
        "/api/auth/nostr",
        window.location.origin
      ).toString();

      let signed;
      try {
        signed = await next.sign({
          kind: 27235,
          created_at: Math.floor(Date.now() / 1000),
          tags: [
            ["u", url],
            ["method", "POST"],
            ["cursa_signer", next.type],
            ["cursa_locale", locale],
          ],
          content: "",
        });
      } catch (cause) {
        return { ok: false, reason: "signer", cause };
      }

      let authRes: Response;
      try {
        authRes = await fetch("/api/auth/nostr", {
          method: "POST",
          headers: {
            Authorization: `Nostr ${btoa(JSON.stringify(signed))}`,
          },
        });
      } catch {
        return { ok: false, reason: "network" };
      }

      if (authRes.status === 429) {
        return { ok: false, reason: "rate_limited" };
      }
      if (!authRes.ok) {
        const json = (await authRes.json().catch(() => null)) as {
          error?: string;
        } | null;
        return { ok: false, reason: "api", code: json?.error };
      }

      setSigner(next);
      await refresh();
      return { ok: true };
    },
    [setSigner, refresh]
  );

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch {
      // Best-effort — clear local state regardless.
    }
    setSignerState((prev) => {
      prev?.close?.();
      return null;
    });
    setSession(null);
  }, []);

  const value = useMemo<SignerContextValue>(
    () => ({
      session,
      sessionLoading,
      signer,
      setSigner,
      completeLoginWithSigner,
      signOut,
      refresh,
    }),
    [
      session,
      sessionLoading,
      signer,
      setSigner,
      completeLoginWithSigner,
      signOut,
      refresh,
    ]
  );

  return (
    <SignerContext.Provider value={value}>{children}</SignerContext.Provider>
  );
}
