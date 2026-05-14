"use client";

/**
 * Image upload field for the offering form.
 *
 * Wraps the Blossom client (`lib/blossom/client`) with a small UI
 * that picks a file, runs client-side type/size checks, asks the
 * existing signer to authenticate the upload, and reports progress.
 * A paste-URL fallback survives so a user who already self-hosts
 * is not forced through Blossom.
 *
 * The component is fully controlled — it stores `value` (the
 * persisted URL) on the parent. Local state covers the in-flight
 * upload only.
 */

import { useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useSignerContext } from "@/lib/contexts/signer-context";
import {
  BlossomUploadError,
  readBlossomServers,
  uploadToBlossom,
} from "@/lib/blossom/client";
import { isSignerCancellation } from "@/lib/nostr/auth-errors";
import styles from "./image-upload.module.scss";

interface ImageUploadProps {
  /** Currently persisted URL or null. */
  value: string | null;
  onChange: (url: string | null) => void;
  /** Field label, sourced from the parent's translation namespace. */
  label: string;
  /** When set, render the field as optional with the supplied label. */
  optionalLabel?: string;
  /** When true, the form requires a value (used for the "required" tag). */
  required?: boolean;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

type Phase =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "error"; message: string };

function readServersFromEnv(): string[] {
  // Read at call time, not module load, so the value is bound to
  // whatever the bundler injected for this build.
  return readBlossomServers(process.env.NEXT_PUBLIC_BLOSSOM_SERVERS);
}

export function ImageUpload({
  value,
  onChange,
  label,
  optionalLabel,
  required,
}: ImageUploadProps) {
  const t = useTranslations("myCourses.form.imageUpload");
  const { signWithPrompt } = useSignerContext();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the native input so the same filename can be re-picked
    // after an error without forcing the user to choose another.
    e.target.value = "";
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setPhase({ kind: "error", message: t("errorBadType") });
      return;
    }
    if (file.size > MAX_BYTES) {
      setPhase({ kind: "error", message: t("errorTooLarge") });
      return;
    }

    const servers = readServersFromEnv();
    if (servers.length === 0) {
      setPhase({ kind: "error", message: t("errorNoServers") });
      return;
    }

    setPhase({ kind: "uploading" });
    try {
      const result = await uploadToBlossom(file, {
        servers,
        signWithPrompt,
      });
      onChange(result.url);
      setPhase({ kind: "idle" });
    } catch (err) {
      if (isSignerCancellation(err)) {
        setPhase({ kind: "error", message: t("errorCancelled") });
        return;
      }
      if (err instanceof Error && err.message === "re_sign_in_cancelled") {
        setPhase({ kind: "error", message: t("errorCancelled") });
        return;
      }
      if (err instanceof BlossomUploadError) {
        setPhase({ kind: "error", message: t("errorUploadFailed") });
        return;
      }
      setPhase({ kind: "error", message: t("errorUploadFailed") });
    }
  }

  function handleClear() {
    onChange(null);
    setPhase({ kind: "idle" });
  }

  return (
    <div className={styles.field}>
      <span className={styles.label}>
        {label}
        {optionalLabel && !required ? (
          <span className={styles.optional}>{optionalLabel}</span>
        ) : null}
      </span>

      {value ? (
        <div className={styles.preview}>
          <div className={styles.thumbWrap}>
            <Image
              src={value}
              alt=""
              fill
              sizes="200px"
              className={styles.thumb}
              unoptimized
            />
          </div>
          <div className={styles.previewMeta}>
            <span className={styles.urlText}>{value}</span>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={handleClear}
            >
              {t("remove")}
            </Button>
          </div>
        </div>
      ) : null}

      <div className={styles.controls}>
        <label className={styles.fileButton}>
          <input
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            className={styles.fileInput}
            onChange={handleFile}
            disabled={phase.kind === "uploading"}
          />
          <span>
            {phase.kind === "uploading" ? t("uploading") : t("pickFile")}
          </span>
        </label>
      </div>

      <details className={styles.fallback}>
        <summary className={styles.fallbackSummary}>
          {t("pasteUrlInstead")}
        </summary>
        <input
          type="url"
          className={styles.urlInput}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="https://…"
        />
      </details>

      {phase.kind === "error" ? (
        <p className={styles.error} role="alert">
          {phase.message}
        </p>
      ) : null}
      <p className={styles.hint}>{t("hint")}</p>
    </div>
  );
}

export default ImageUpload;
