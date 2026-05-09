"use client";

import type { ReactNode } from "react";
import { SignerProvider } from "@/lib/contexts/signer-context";
import { ReSignPrompt } from "@/components/auth/re-sign-prompt";

/**
 * Client wrapper that mounts SignerProvider and supplies the re-sign
 * modal renderer. Kept separate from the locale layout so the layout
 * stays a server component (functions can't cross the RSC boundary).
 *
 * The modal handles "re-attach to existing session" only — Cursá's
 * full login flow lives at /sign-in, not in a modal. The
 * modal is rendered unconditionally; it returns null when not open.
 */
export function SignerProviderClient({ children }: { children: ReactNode }) {
  return (
    <SignerProvider
      renderReSignInModal={({ open, onSigner, onCancel }) => (
        <ReSignPrompt open={open} onSigner={onSigner} onCancel={onCancel} />
      )}
    >
      {children}
    </SignerProvider>
  );
}
