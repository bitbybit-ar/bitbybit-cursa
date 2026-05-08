"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import type { BunkerSigner } from "nostr-tools/nip46";
import {
  createConnectSession,
  waitForConnection,
  connectWithBunkerURL,
} from "@/lib/nostr/nip46-login";
import {
  type SignerHandle,
  makeNip46Signer,
} from "@/lib/nostr/signers";
import {
  type AuthError,
  loginError,
  reSignInError,
} from "@/lib/nostr/auth-errors";
import { Button } from "@/components/ui/button";
import { CopyIcon, LinkIcon } from "@/components/icons";
import styles from "./nostr-connect-panel.module.scss";

interface NostrConnectPanelProps {
  onSigner: (signer: SignerHandle) => void | Promise<void>;
  onError?: (error: AuthError) => void;
  /** When provided, rejects signers whose pubkey doesn't match. */
  expectedPubkey?: string;
}

type ConnectStatus = "scanning" | "connecting" | "expired";

const SLOW_HINT_MS = 10_000;

/**
 * Reject auth URLs that aren't http(s) before rendering them as a
 * link. A malicious bunker could otherwise return `javascript:`
 * and hijack the click.
 */
function safeAuthUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    // Not a valid URL; fall through.
  }
  return null;
}

/**
 * NIP-46 Nostr Connect flow. Shows a QR code with a
 * `nostrconnect://` URI and accepts a pasted `bunker://` URL as a
 * fallback. On successful connection, produces a `SignerHandle`
 * backed by the live BunkerSigner and emits it via `onSigner`. The
 * parent is responsible for keeping the signer alive (i.e. handing
 * it to SignerProvider via `completeLoginWithSigner`); if the
 * parent rejects it via mismatch, the bunker is closed here.
 */
export function NostrConnectPanel({
  onSigner,
  onError,
  expectedPubkey,
}: NostrConnectPanelProps) {
  const t = useTranslations("login");
  const [status, setStatus] = useState<ConnectStatus>("scanning");
  const [uri, setUri] = useState("");
  const [bunkerUrl, setBunkerUrl] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [authChallengeUrl, setAuthChallengeUrl] = useState<string | null>(
    null
  );
  const [showSlowHint, setShowSlowHint] = useState(false);

  // Refs hold the latest callbacks/expected pubkey so the
  // mount-once effect below doesn't need them in its dep list.
  // Without this, any parent re-render that passes a fresh arrow
  // (signin-client.tsx does) would restart the scan, abort the
  // in-flight BunkerSigner, and invalidate whatever QR the user
  // had just scanned.
  const onSignerRef = useRef(onSigner);
  const onErrorRef = useRef(onError);
  const expectedPubkeyRef = useRef(expectedPubkey);
  useEffect(() => {
    onSignerRef.current = onSigner;
    onErrorRef.current = onError;
    expectedPubkeyRef.current = expectedPubkey;
  }, [onSigner, onError, expectedPubkey]);

  const abortRef = useRef<AbortController | null>(null);
  const slowHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const clearSlowHint = useCallback(() => {
    if (slowHintTimerRef.current) {
      clearTimeout(slowHintTimerRef.current);
      slowHintTimerRef.current = null;
    }
    setShowSlowHint(false);
  }, []);

  const finalize = useCallback(async (bunker: BunkerSigner) => {
    try {
      const pubkey = await bunker.getPublicKey();
      const expected = expectedPubkeyRef.current;
      if (expected && pubkey !== expected) {
        await bunker.close();
        onErrorRef.current?.(reSignInError("mismatch"));
        return;
      }
      await onSignerRef.current(makeNip46Signer(bunker, pubkey));
    } catch {
      try {
        await bunker.close();
      } catch {
        // Ignore — we're tearing down anyway.
      }
      onErrorRef.current?.(loginError("connectError"));
    }
  }, []);

  const startScan = useCallback(() => {
    setLocalError(null);
    setAuthChallengeUrl(null);
    clearSlowHint();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const session = createConnectSession();
    setUri(session.uri);
    setStatus("scanning");

    slowHintTimerRef.current = setTimeout(() => {
      setShowSlowHint(true);
    }, SLOW_HINT_MS);

    waitForConnection(session, {
      abortSignal: controller.signal,
      onAuthUrl: (url) => setAuthChallengeUrl(safeAuthUrl(url)),
    })
      .then(async (bunker) => {
        clearSlowHint();
        setStatus("connecting");
        await finalize(bunker);
      })
      .catch(() => {
        clearSlowHint();
        if (!controller.signal.aborted) setStatus("expired");
      });
  }, [finalize, clearSlowHint]);

  // Mount-once effect: start the scan when the panel opens, abort
  // whatever is in flight on unmount. Intentionally no dep on
  // startScan so a parent re-render can't abort the in-flight
  // BunkerSigner.
  const startScanRef = useRef(startScan);
  useEffect(() => {
    startScanRef.current = startScan;
  }, [startScan]);
  useEffect(() => {
    startScanRef.current();
    return () => {
      abortRef.current?.abort();
      if (slowHintTimerRef.current) {
        clearTimeout(slowHintTimerRef.current);
      }
    };
  }, []);

  // Cheap shape check before we tear down the QR session and burn
  // the round-trip to the bunker. Catches the typo case AND
  // validates the host portion is a 64-char hex pubkey or an npub1
  // — the only two shapes the NIP-46 spec allows after `bunker://`.
  // Anything looser would let a half-valid URL slip past us and
  // surface the deeper "Connection failed" message a few seconds
  // later, which read as a different error to users even though
  // it's the same root cause.
  const BUNKER_HOST_RE = /^(?:[0-9a-f]{64}|npub1[ac-hj-np-z02-9]{58,})/i;
  const looksLikeBunkerUrl = (raw: string): boolean => {
    const trimmed = raw.trim();
    if (!trimmed.startsWith("bunker://")) return false;
    const remainder = trimmed.slice("bunker://".length);
    return BUNKER_HOST_RE.test(remainder);
  };

  const handleBunkerConnect = async () => {
    const trimmed = bunkerUrl.trim();
    if (!trimmed) return;
    if (!looksLikeBunkerUrl(trimmed)) {
      // Inline field error — do NOT abort the QR scan. The user
      // can either fix the URL and resubmit or switch back to the
      // QR path without losing the in-progress session.
      setLocalError(t("connectInvalidBunker"));
      return;
    }
    abortRef.current?.abort();
    clearSlowHint();
    setStatus("connecting");
    setLocalError(null);
    try {
      const bunker = await connectWithBunkerURL(trimmed, {
        onAuthUrl: (url) => setAuthChallengeUrl(safeAuthUrl(url)),
      });
      await finalize(bunker);
    } catch {
      setLocalError(t("connectError"));
      startScan();
    }
  };

  const handleCopyURI = async () => {
    try {
      await navigator.clipboard.writeText(uri);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Insecure context — the QR is the fallback.
    }
  };

  if (status === "connecting") {
    return (
      <div className={styles.connectingState}>
        <span className={styles.spinner} aria-hidden />
        <p className={styles.waiting}>{t("connectConnecting")}</p>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className={styles.expired}>
        <p>{t("connectExpired")}</p>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={startScan}
        >
          {t("connectRetry")}
        </Button>
      </div>
    );
  }

  return (
    <>
      {authChallengeUrl ? (
        <a
          href={authChallengeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.approveBanner}
          onClick={() => setAuthChallengeUrl(null)}
        >
          <LinkIcon size={16} />
          {t("connectApproveInSigner")}
        </a>
      ) : null}

      <p className={styles.scanTitle}>{t("connectScanTitle")}</p>
      <div
        className={styles.qrWrapper}
        role="img"
        aria-label={t("connectQrAlt")}
      >
        <QRCodeSVG
          value={uri}
          size={180}
          level="M"
          bgColor="transparent"
          fgColor="currentColor"
        />
      </div>
      <Button
        type="button"
        variant="link"
        size="sm"
        className={styles.copyURIBtn}
        onClick={handleCopyURI}
      >
        <CopyIcon size={14} />
        {isCopied ? t("connectCopiedURI") : t("connectCopyURI")}
      </Button>
      <p className={styles.waiting}>{t("connectScanning")}</p>
      {showSlowHint ? (
        <p className={styles.slowHint}>{t("connectSlowHint")}</p>
      ) : null}

      <div className={styles.divider}>
        <span>{t("connectOrPaste")}</span>
      </div>

      <label htmlFor="bunker-input" className={styles.bunkerLabel}>
        {t("connectBunkerLabel")}
      </label>
      <div className={styles.bunkerInputRow}>
        <input
          id="bunker-input"
          type="text"
          className={styles.bunkerInput}
          placeholder={t("connectBunkerPlaceholder")}
          value={bunkerUrl}
          onChange={(e) => setBunkerUrl(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleBunkerConnect}
          disabled={!bunkerUrl.trim()}
        >
          {t("connectBunkerSubmit")}
        </Button>
      </div>

      {localError ? (
        <p className={styles.errorInModal}>{localError}</p>
      ) : null}

      <p className={styles.compatible}>{t("connectCompatible")}</p>
    </>
  );
}

export default NostrConnectPanel;
