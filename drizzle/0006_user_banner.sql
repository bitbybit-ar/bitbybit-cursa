-- Add the user's profile banner image, seeded from kind:0 `banner`
-- at sign-in and editable from /settings. Null when the user has
-- no banner set. Displayed as the background of the seller's
-- public storefront hero on /[userSlug].
--
-- Pure additive change; existing rows pick up null and render the
-- fallback gradient until the user sets a value.

ALTER TABLE "users" ADD COLUMN "banner_url" text;
