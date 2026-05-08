"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { ArrowLeftIcon } from "@/components/icons";
import { SignerMethodButtons } from "@/components/auth/signer-method-buttons";
import { NsecSignerForm } from "@/components/auth/nsec-signer-form";
import {
  useSignerContext,
  type LoginResult,
} from "@/lib/contexts/signer-context";
import { useAuthErrorLookup } from "@/lib/hooks/useAuthErrorLookup";
import {
  type AuthError,
  loginError,
  isSignerCancellation,
} from "@/lib/nostr/auth-errors";
import type { SignerHandle } from "@/lib/nostr/signers";
import type { Locale } from "@/lib/schemas/auth";
import styles from "./signin.module.scss";

type Panel = "picker" | "nsec";

const ALLOWED_NEXT_PREFIXES = ["/mis-compras", "/reclamar/", "/gracias/"];

function safeNext(raw: string | null): string {
  if (!raw) return "/mis-compras";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("..")) {
    return "/mis-compras";
  }
  if (ALLOWED_NEXT_PREFIXES.some((p) => raw.startsWith(p))) return raw;
  return "/mis-compras";
}

interface SignInClientProps {
  locale: Locale;
}

export function SignInClient({ locale }: SignInClientProps) {
  const t = useTranslations("login");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNext(searchParams.get("next"));
  const lookupAuthError = useAuthErrorLookup();
  const { completeLoginWithSigner } = useSignerContext();

  const [panel, setPanel] = useState<Panel>("picker");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messageFor = (
    result: Extract<LoginResult, { ok: false }>
  ): string | null => {
    if (result.reason === "signer") {
      // Cancel-clicks land here too — swallow them silently per the
      // arena pattern so the user doesn't see a red banner for
      // backing out of the extension prompt.
      if (isSignerCancellation(result.cause)) return null;
      return lookupAuthError(loginError("nostr_signing_rejected"));
    }
    if (result.reason === "rate_limited") {
      return lookupAuthError(loginError("rate_limited"));
    }
    if (result.reason === "network") {
      return tErr("network");
    }
    return lookupAuthError(loginError("error"));
  };

  const handleSigner = async (signer: SignerHandle) => {
    setErrorMessage(null);
    const result = await completeLoginWithSigner(signer, locale);
    if (!result.ok) {
      const msg = messageFor(result);
      if (msg) setErrorMessage(msg);
      return;
    }
    router.push(nextPath);
  };

  const handleError = (err: AuthError) => {
    setErrorMessage(lookupAuthError(err));
  };

  const closePanel = () => {
    setPanel("picker");
    setErrorMessage(null);
  };

  return (
    <Section>
      <Container column>
        <Card variant="default" className={styles.card}>
          <h1 className={styles.title}>{t("title")}</h1>
          <p className={styles.subtitle}>{t("subtitle")}</p>

          <SignerMethodButtons
            onSigner={handleSigner}
            onError={handleError}
            onSelectNsec={() => setPanel("nsec")}
            animate
          />

          {errorMessage && panel === "picker" ? (
            <p className={styles.error} role="alert">
              {errorMessage}
            </p>
          ) : null}
        </Card>

        <Link href="/" className={styles.backLink}>
          <ArrowLeftIcon size={16} />
          {t("backToHome")}
        </Link>

        {panel === "nsec" ? (
          <Modal onClose={closePanel} title={t("nsecTitle")} size="sm">
            <NsecSignerForm
              onSigner={handleSigner}
              onError={handleError}
              showWarning
              requireAcceptRisk
              submitLabel={t("nsecSignIn")}
              submittingLabel={t("nsecSigningIn")}
            />
            {errorMessage ? (
              <p className={styles.error} role="alert">
                {errorMessage}
              </p>
            ) : null}
          </Modal>
        ) : null}
      </Container>
    </Section>
  );
}
