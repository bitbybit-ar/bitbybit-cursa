"use client";

import type { ReactNode } from "react";
import {
  SignerProvider,
  type SessionUser,
} from "@/lib/contexts/signer-context";
import { ReSignPrompt } from "@/components/auth/re-sign-prompt";

/**
 * Client wrapper that mounts SignerProvider and supplies the re-sign
 * modal renderer. Kept separate from the locale layout so the layout
 * stays a server component (functions can't cross the RSC boundary).
 *
 * `initialSession` is read server-side from the request cookie so the
 * navbar renders the correct state on first paint; the provider's
 * on-mount fetch still runs to catch a cookie that flipped between
 * the SSR pass and hydration.
 *
 * The modal handles "re-attach to existing session" only — Cursats's
 * full login flow lives at /sign-in, not in a modal. The
 * modal is rendered unconditionally; it returns null when not open.
 */
export function SignerProviderClient({
  children,
  initialSession,
}: {
  children: ReactNode;
  initialSession: SessionUser | null;
}) {
  return (
    <SignerProvider
      initialSession={initialSession}
      renderReSignInModal={({ open, onSigner, onCancel }) => (
        <ReSignPrompt open={open} onSigner={onSigner} onCancel={onCancel} />
      )}
    >
      {children}
    </SignerProvider>
  );
}
