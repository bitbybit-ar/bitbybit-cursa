"use client";

import { useEffect, useState } from "react";
import { UserIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import styles from "./avatar.module.scss";

export type AvatarSize = "sm" | "md" | "lg";

interface AvatarProps {
  /** Picture URL from Nostr metadata. Missing or failing loads fall through
   *  to the initial; missing initial falls through to the user icon. */
  src?: string | null;
  /** Accessibility label. Pass "" for decorative avatars. */
  alt: string;
  /** Name used to derive the fallback initial. */
  name?: string | null;
  size?: AvatarSize;
  className?: string;
}

const sizeClass: Record<AvatarSize, string> = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
};

const iconSizeFor: Record<AvatarSize, number> = {
  sm: 16,
  md: 20,
  lg: 28,
};

function initialFor(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  return trimmed.charAt(0).toUpperCase();
}

export function Avatar({
  src,
  alt,
  name,
  size = "sm",
  className,
}: AvatarProps) {
  const [failed, setFailed] = useState(false);
  // Reset on src change so a stale failure flag doesn't pin a later
  // (valid) URL onto the fallback.
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = !!src && !failed;
  const initial = initialFor(name);
  const decorative = alt === "";

  let visual: React.ReactNode;
  if (showImage) {
    visual = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src ?? undefined}
        alt={alt}
        className={styles.image}
        onError={() => setFailed(true)}
      />
    );
  } else if (initial) {
    visual = decorative ? (
      <span aria-hidden="true">{initial}</span>
    ) : (
      <span role="img" aria-label={alt}>
        <span aria-hidden="true">{initial}</span>
      </span>
    );
  } else {
    visual = <UserIcon size={iconSizeFor[size]} />;
  }

  return (
    <span
      className={cn(styles.avatar, sizeClass[size], className)}
      aria-hidden={decorative ? true : undefined}
    >
      {visual}
    </span>
  );
}

export default Avatar;
