"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { Offering } from "@/lib/admin/offerings";
import styles from "./offering-form.module.scss";

interface OfferingFormProps {
  /** When provided, the form pre-populates and submits a PATCH. */
  offering?: Offering;
}

interface OfferingPayload {
  slug: string;
  type: "code" | "download";
  title: string;
  description: string;
  price_ars: number;
  price_sats: number | null;
  image_url: string | null;
  code_pool: string[];
  download_url: string | null;
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function parseCodePool(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function OfferingForm({ offering }: OfferingFormProps) {
  const t = useTranslations("panel.offerings.form");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const { showToast } = useToast();

  const [isPending, setIsPending] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const isEdit = offering !== undefined;

  const [slug, setSlug] = useState(offering?.slug ?? "");
  const [type, setType] = useState<"code" | "download">(
    offering?.type ?? "code"
  );
  const [title, setTitle] = useState(offering?.title ?? "");
  const [description, setDescription] = useState(
    offering?.description ?? ""
  );
  const [priceArs, setPriceArs] = useState(
    offering ? String(offering.price_ars) : ""
  );
  const [priceSats, setPriceSats] = useState(
    offering?.price_sats ? String(offering.price_sats) : ""
  );
  const [imageUrl, setImageUrl] = useState(offering?.image_url ?? "");
  const [codePool, setCodePool] = useState(
    (offering?.code_pool ?? []).join("\n")
  );
  const [downloadUrl, setDownloadUrl] = useState(
    offering?.download_url ?? ""
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    const priceArsNum = Number.parseInt(priceArs, 10);
    if (Number.isNaN(priceArsNum) || priceArsNum <= 0) {
      showToast(t("invalidPriceArs"), "error");
      return;
    }
    const priceSatsNum = priceSats.trim()
      ? Number.parseInt(priceSats, 10)
      : null;
    if (priceSats.trim() && (priceSatsNum === null || Number.isNaN(priceSatsNum) || priceSatsNum <= 0)) {
      showToast(t("invalidPriceSats"), "error");
      return;
    }

    const payload: OfferingPayload = {
      slug: slug.trim(),
      type,
      title: title.trim(),
      description: description.trim(),
      price_ars: priceArsNum,
      price_sats: priceSatsNum,
      image_url: emptyToNull(imageUrl),
      code_pool: type === "code" ? parseCodePool(codePool) : [],
      download_url:
        type === "download" ? emptyToNull(downloadUrl) : null,
    };

    setIsPending(true);
    try {
      const url = isEdit
        ? `/api/admin/offerings/${offering!.id}`
        : "/api/admin/offerings";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        if (res.status === 401 || res.status === 404) {
          // Session expired or not admin — bounce home.
          router.push("/");
          return;
        }
        if (data.error === "slug_taken") {
          showToast(t("slugTaken"), "error");
        } else {
          showToast(t("saveFailed"), "error");
        }
        return;
      }
      showToast(t("saved"), "success");
      router.push("/panel/ofertas");
      router.refresh();
    } catch {
      showToast(tErr("network"), "error");
    } finally {
      setIsPending(false);
    }
  }

  async function handleArchive() {
    if (!offering) return;
    if (isArchiving) return;
    if (!window.confirm(t("archiveConfirm"))) return;

    setIsArchiving(true);
    try {
      const res = await fetch(`/api/admin/offerings/${offering.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        showToast(t("archiveFailed"), "error");
        return;
      }
      showToast(t("archived"), "success");
      router.push("/panel/ofertas");
      router.refresh();
    } catch {
      showToast(tErr("network"), "error");
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="slug" className={styles.label}>
          {t("slug")}
        </label>
        <input
          id="slug"
          type="text"
          className={styles.input}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          maxLength={80}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          autoComplete="off"
          spellCheck={false}
        />
        <p className={styles.hint}>{t("slugHint")}</p>
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{t("type")}</legend>
        <label className={styles.radio}>
          <input
            type="radio"
            name="type"
            value="code"
            checked={type === "code"}
            onChange={() => setType("code")}
          />
          <span>
            <strong>{t("typeCode")}</strong>
            <span className={styles.radioHint}>{t("typeCodeHint")}</span>
          </span>
        </label>
        <label className={styles.radio}>
          <input
            type="radio"
            name="type"
            value="download"
            checked={type === "download"}
            onChange={() => setType("download")}
          />
          <span>
            <strong>{t("typeDownload")}</strong>
            <span className={styles.radioHint}>
              {t("typeDownloadHint")}
            </span>
          </span>
        </label>
      </fieldset>

      <div className={styles.field}>
        <label htmlFor="title" className={styles.label}>
          {t("title")}
        </label>
        <input
          id="title"
          type="text"
          className={styles.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="description" className={styles.label}>
          {t("description")}
        </label>
        <textarea
          id="description"
          className={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={5}
        />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="priceArs" className={styles.label}>
            {t("priceArs")}
          </label>
          <input
            id="priceArs"
            type="number"
            min={1}
            step={1}
            className={styles.input}
            value={priceArs}
            onChange={(e) => setPriceArs(e.target.value)}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="priceSats" className={styles.label}>
            {t("priceSats")}
            <span className={styles.optional}>{t("optional")}</span>
          </label>
          <input
            id="priceSats"
            type="number"
            min={1}
            step={1}
            className={styles.input}
            value={priceSats}
            onChange={(e) => setPriceSats(e.target.value)}
          />
          <p className={styles.hint}>{t("priceSatsHint")}</p>
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="imageUrl" className={styles.label}>
          {t("imageUrl")}
          <span className={styles.optional}>{t("optional")}</span>
        </label>
        <input
          id="imageUrl"
          type="url"
          className={styles.input}
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://…"
        />
      </div>

      {type === "code" ? (
        <div className={styles.field}>
          <label htmlFor="codePool" className={styles.label}>
            {t("codePool")}
          </label>
          <textarea
            id="codePool"
            className={styles.textarea}
            value={codePool}
            onChange={(e) => setCodePool(e.target.value)}
            rows={6}
            placeholder={t("codePoolPlaceholder")}
            spellCheck={false}
          />
          <p className={styles.hint}>{t("codePoolHint")}</p>
        </div>
      ) : null}

      {type === "download" ? (
        <div className={styles.field}>
          <label htmlFor="downloadUrl" className={styles.label}>
            {t("downloadUrl")}
          </label>
          <input
            id="downloadUrl"
            type="url"
            className={styles.input}
            value={downloadUrl}
            onChange={(e) => setDownloadUrl(e.target.value)}
            placeholder="https://…"
          />
          <p className={styles.hint}>{t("downloadUrlHint")}</p>
        </div>
      ) : null}

      <div className={styles.actions}>
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending
            ? t("saving")
            : isEdit
              ? t("saveEdit")
              : t("saveCreate")}
        </Button>
        {isEdit ? (
          <Button
            type="button"
            variant="danger"
            onClick={handleArchive}
            disabled={isArchiving}
          >
            {isArchiving ? t("archiving") : t("archive")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export default OfferingForm;
