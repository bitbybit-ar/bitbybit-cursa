export function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_BASE_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_BASE_URL is not set. Configure it in .env.local (or your hosting environment) before running the app."
    );
  }
  return url;
}
