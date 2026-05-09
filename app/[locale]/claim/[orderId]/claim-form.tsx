"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface ClaimFormProps {
  orderId: string;
}

export function ClaimForm({ orderId }: ClaimFormProps) {
  const t = useTranslations("claim");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    if (isPending) return;
    setIsPending(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/claim`, {
        method: "POST",
      });
      if (res.ok) {
        router.push(`/receipt/${orderId}`);
        router.refresh();
        return;
      }
      if (res.status === 401) {
        // Session expired between the server render and the click —
        // bounce back through sign-in keeping the same target.
        router.push(`/sign-in?next=/claim/${orderId}`);
        return;
      }
      if (res.status === 404) {
        showToast(t("notFound"), "error");
        return;
      }
      if (res.status === 409) {
        showToast(t("alreadyClaimed.toast"), "error");
        // Refresh so the server-rendered "already claimed" branch
        // takes over the page on next navigation.
        router.refresh();
        return;
      }
      showToast(tErr("network"), "error");
    } catch {
      showToast(tErr("network"), "error");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="primary"
      size="lg"
      fullWidth
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? t("claiming") : t("claim")}
    </Button>
  );
}

export default ClaimForm;
