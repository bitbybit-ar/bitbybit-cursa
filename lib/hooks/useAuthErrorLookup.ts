"use client";

import { useTranslations } from "next-intl";
import type { AuthError } from "@/lib/nostr/auth-errors";

/**
 * Returns a lookup function that translates an `AuthError` by
 * dispatching to the correct i18n namespace. Use this in any
 * component that consumes error events from the shared Nostr auth
 * children (`ExtensionSignerButton`, `NsecSignerForm`,
 * `SignerMethodButtons`).
 */
export function useAuthErrorLookup(): (error: AuthError) => string {
  const tLogin = useTranslations("login");
  const tReSign = useTranslations("reSignIn");

  return (error) => {
    if (error.namespace === "login") {
      return tLogin(error.key);
    }
    return tReSign(error.key);
  };
}
