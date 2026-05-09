"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_POLL_INTERVAL_MS = 4000;
// Cap polling at ~10 minutes (150 ticks × 4s). Lightning invoices
// expire on the order of 5-15 minutes; once the cap is reached we
// stop wasting bandwidth and surface `expired` so the modal can show
// a "regenerate invoice" CTA instead of pretending to still be live.
const DEFAULT_MAX_ATTEMPTS = 150;

interface UseZapPollingOptions {
  invoice: string | null | undefined;
  onSuccess: () => void;
  onExpired?: () => void;
  intervalMs?: number;
  maxAttempts?: number;
  signal?: AbortSignal;
}

interface UseZapPollingResult {
  polling: boolean;
  lastStatus: string | null;
  expired: boolean;
}

/**
 * Polls `/api/zap/status` on a fixed interval until the invoice
 * settles, then fires `onSuccess` exactly once.
 */
export function useZapPolling({
  invoice,
  onSuccess,
  onExpired,
  intervalMs = DEFAULT_POLL_INTERVAL_MS,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  signal,
}: UseZapPollingOptions): UseZapPollingResult {
  // Hold callbacks in refs so a caller passing inline arrows doesn't
  // churn the polling interval on every render.
  const onSuccessRef = useRef(onSuccess);
  const onExpiredRef = useRef(onExpired);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onExpiredRef.current = onExpired;
  }, [onSuccess, onExpired]);

  const [polling, setPolling] = useState(false);
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!invoice) {
      setPolling(false);
      setExpired(false);
      return;
    }
    if (signal?.aborted) {
      setPolling(false);
      return;
    }

    setLastStatus(null);
    setExpired(false);
    setPolling(true);

    // A poll tick can resolve *after* the caller has unmounted (modal
    // closed, route changed, etc.). Guard every state update and the
    // callbacks on this flag so a late fetch doesn't fire on a
    // disposed component.
    let mounted = true;
    let attempts = 0;

    let fired = false;
    const fireSuccess = () => {
      if (fired || !mounted) return;
      fired = true;
      clearInterval(timer);
      setPolling(false);
      onSuccessRef.current();
    };

    const fireExpired = () => {
      if (fired || !mounted) return;
      fired = true;
      clearInterval(timer);
      setPolling(false);
      setExpired(true);
      onExpiredRef.current?.();
    };

    const tick = async () => {
      attempts += 1;
      try {
        const res = await fetch("/api/zap/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoice }),
        });
        if (!mounted) return;
        if (!res.ok) {
          if (attempts >= maxAttempts) fireExpired();
          return;
        }
        const body: unknown = await res.json();
        if (!mounted) return;
        if (
          body &&
          typeof body === "object" &&
          "paid" in body &&
          (body as { paid: unknown }).paid === true
        ) {
          fireSuccess();
          return;
        }
        if (
          body &&
          typeof body === "object" &&
          "status" in body &&
          typeof (body as { status: unknown }).status === "string"
        ) {
          setLastStatus((body as { status: string }).status);
        }
        if (attempts >= maxAttempts) fireExpired();
      } catch {
        if (attempts >= maxAttempts) fireExpired();
      }
    };

    const timer = setInterval(tick, intervalMs);

    const onAbort = () => {
      clearInterval(timer);
      setPolling(false);
    };
    signal?.addEventListener("abort", onAbort);

    return () => {
      mounted = false;
      clearInterval(timer);
      signal?.removeEventListener("abort", onAbort);
      setPolling(false);
    };
  }, [invoice, intervalMs, maxAttempts, signal]);

  return { polling, lastStatus, expired };
}
