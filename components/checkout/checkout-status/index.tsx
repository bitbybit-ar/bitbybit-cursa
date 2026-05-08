"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import styles from "./checkout-status.module.scss";

interface CheckoutStatusProps {
  orderId: string;
  /** Initial status from the server render. */
  initialStatus: "pending" | "paid" | "failed" | "refunded";
  /** Unix seconds — when the BOLT11 invoice expires. */
  expiresAt: number;
}

interface OrderStatusResponse {
  order_id: string;
  status: "pending" | "paid" | "failed" | "refunded";
  paid_at: string | null;
}

const POLL_INTERVAL_MS = 3000;

export function CheckoutStatus({
  orderId,
  initialStatus,
  expiresAt,
}: CheckoutStatusProps) {
  const t = useTranslations("checkout");
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, expiresAt - Math.floor(Date.now() / 1000))
  );
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (status === "paid") {
      router.replace(`/gracias/${orderId}`);
      return;
    }
    if (status === "failed" || status === "refunded") return;

    let timer: ReturnType<typeof setInterval> | null = null;

    async function tick() {
      if (stoppedRef.current) return;
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as OrderStatusResponse;
        setStatus(data.status);
      } catch {
        // Transient — keep polling. The expiry tick below is the
        // hard stop.
      }
    }

    timer = setInterval(tick, POLL_INTERVAL_MS);
    void tick();

    return () => {
      stoppedRef.current = true;
      if (timer) clearInterval(timer);
    };
  }, [orderId, router, status]);

  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const isExpired = secondsLeft <= 0 && status === "pending";
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const countdown = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  if (isExpired) {
    return (
      <div className={styles.statusExpired}>
        <p className={styles.message}>{t("expired")}</p>
      </div>
    );
  }

  if (status === "failed" || status === "refunded") {
    return (
      <div className={styles.statusFailed}>
        <p className={styles.message}>{t("status.failed")}</p>
      </div>
    );
  }

  if (status === "paid") {
    return (
      <div className={styles.statusPaid}>
        <span className={styles.spinner} aria-hidden />
        <p className={styles.message}>{t("status.paid")}</p>
      </div>
    );
  }

  return (
    <div className={styles.statusWaiting}>
      <span className={styles.spinner} aria-hidden />
      <div className={styles.waitingText}>
        <p className={styles.message}>{t("status.waiting")}</p>
        <p className={styles.expires}>
          {t("expiresIn")} {countdown}
        </p>
      </div>
    </div>
  );
}

export default CheckoutStatus;
