"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { BoltIcon } from "@/components/icons";

interface BuyButtonProps {
  offeringId: string;
}

interface CheckoutResponse {
  order_id: string;
}

export function BuyButton({ offeringId }: BuyButtonProps) {
  const t = useTranslations("offering");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [, startTransition] = useTransition();

  async function handleClick() {
    if (isPending) return;
    setIsPending(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ offering_id: offeringId }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        if (res.status === 404 || data.error === "offering_unavailable") {
          showToast(tErrors("offeringUnavailable"), "error");
        } else {
          showToast(tErrors("checkoutFailed"), "error");
        }
        return;
      }
      const data = (await res.json()) as CheckoutResponse;
      startTransition(() => {
        router.push(`/checkout/${data.order_id}`);
      });
    } catch {
      showToast(tErrors("network"), "error");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Button
      variant="accent"
      size="lg"
      fullWidth
      onClick={handleClick}
      disabled={isPending}
    >
      <BoltIcon size={20} />
      {isPending ? t("buying") : t("buy")}
    </Button>
  );
}

export default BuyButton;
