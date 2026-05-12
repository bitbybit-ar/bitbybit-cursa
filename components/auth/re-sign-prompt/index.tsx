"use client";

/**
 * Re-attach modal for post-login signing actions.
 *
 * Re-attach mode only — Cursats's login flow lives at /sign-in,
 * not in a modal. By the time we open this prompt, the user has a
 * valid session cookie but no in-memory signer (typical: nsec/NIP-46
 * user reloaded the tab). Methods are narrowed to those at least as
 * strong as the original sign-in (an extension user cannot fall back
 * to nsec just because they reloaded).
 */

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
import { SignerMethodButtons } from "@/components/auth/signer-method-buttons";
import { NsecSignerForm } from "@/components/auth/nsec-signer-form";
import { NostrConnectPanel } from "@/components/auth/nostr-connect-panel";
import { useSignerContext } from "@/lib/contexts/signer-context";
import type { SignerHandle, SignerType } from "@/lib/nostr/signers";
import { type AuthError, reSignInError } from "@/lib/nostr/auth-errors";
import { useAuthErrorLookup } from "@/lib/hooks/useAuthErrorLookup";
import styles from "./re-sign-prompt.module.scss";

interface ReSignPromptProps {
  open: boolean;
  onSigner: (signer: SignerHandle) => void;
  onCancel: () => void;
}

type Method = "pick" | "nsec" | "nip46-qr" | "nip46-bunker";

const ALL_METHODS: SignerType[] = ["extension", "nip46", "nsec"];

function methodsForSigner(
  signerType: SignerType | null | undefined
): SignerType[] {
  switch (signerType) {
    case "extension":
      return ["extension"];
    case "nip46":
      return ["extension", "nip46"];
    case "nsec":
      return ALL_METHODS;
    default:
      return ALL_METHODS;
  }
}

export function ReSignPrompt({ open, onSigner, onCancel }: ReSignPromptProps) {
  const t = useTranslations("reSignIn");
  const tLogin = useTranslations("login");
  const tForm = useTranslations("settings.form");
  const lookupAuthError = useAuthErrorLookup();
  const { session, setSigner } = useSignerContext();
  const [method, setMethod] = useState<Method>("pick");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setMethod("pick");
      setError(null);
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  // The prompt only opens when we already have a session — it's a
  // re-attach surface, not a login surface. If session is somehow
  // null, fall back to widest method set so the user can still
  // recover.
  const expectedPubkey = session?.pubkey;
  const allowedMethods = methodsForSigner(session?.signer_type);

  const handleError = (err: AuthError) => {
    setError(lookupAuthError(err));
    setBusy(false);
  };

  const handleSignerFromChild = async (next: SignerHandle) => {
    setError(null);
    setBusy(true);
    try {
      // Re-attach: child component already verified the pubkey
      // match for nsec; the extension button does the same.
      if (expectedPubkey && next.pubkey !== expectedPubkey) {
        setError(lookupAuthError(reSignInError("mismatch")));
        return;
      }
      setSigner(next);
      onSigner(next);
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    setError(null);
    setMethod("pick");
  };

  const title =
    method === "pick"
      ? tForm("signRequiredTitle")
      : method === "nsec"
        ? tLogin("nsecTitle")
        : method === "nip46-qr"
          ? tLogin("connectScanModalTitle")
          : tLogin("connectBunkerModalTitle");

  return (
    <Modal
      onClose={onCancel}
      title={title}
      size="sm"
      onBack={method === "pick" ? undefined : goBack}
    >
      {method === "pick" && (
        <>
          <p className={styles.intro}>{tForm("signRequiredBody")}</p>

          <SignerMethodButtons
            onSigner={handleSignerFromChild}
            onError={handleError}
            expectedPubkey={expectedPubkey}
            onSelectNip46Qr={() => setMethod("nip46-qr")}
            onSelectNip46Bunker={() => setMethod("nip46-bunker")}
            onSelectNsec={() => setMethod("nsec")}
            disabled={busy}
            allowedMethods={allowedMethods}
          />

          {error ? <p className={styles.error}>{error}</p> : null}
        </>
      )}

      {method === "nsec" && (
        <>
          <NsecSignerForm
            onSigner={handleSignerFromChild}
            onError={handleError}
            expectedPubkey={expectedPubkey}
            showWarning
            submitLabel={t("attachKey")}
            submittingLabel={tLogin("nsecSigningIn")}
          />
          {error ? <p className={styles.error}>{error}</p> : null}
        </>
      )}

      {method === "nip46-qr" && (
        <>
          <NostrConnectPanel
            mode="qr"
            onSigner={handleSignerFromChild}
            onError={handleError}
            expectedPubkey={expectedPubkey}
          />
          {error ? <p className={styles.error}>{error}</p> : null}
        </>
      )}

      {method === "nip46-bunker" && (
        <>
          <NostrConnectPanel
            mode="bunker"
            onSigner={handleSignerFromChild}
            onError={handleError}
            expectedPubkey={expectedPubkey}
          />
          {error ? <p className={styles.error}>{error}</p> : null}
        </>
      )}
    </Modal>
  );
}

export default ReSignPrompt;
