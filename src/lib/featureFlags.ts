/**
 * Feature flags — flip to `true` to re-enable a feature.
 */

/** Temporarily disabled: PG Management (public page, admin section, nav/footer links). */
export const PG_MANAGEMENT_ENABLED = false;

/**
 * Temporarily hidden: the partner-registration funnel ("How Partnership Works",
 * "Register as Partner", "Become a Partner"). Set to `true` to turn the
 * partnership flow back on. Routes stay wired; only the public links/prompts hide.
 */
export const PARTNER_REGISTRATION_ENABLED = false;

/**
 * Open listings: any signed-in user can list a property without registering
 * as a partner. Set to `false` to restore the partners-only gate on /list-property
 * (keep in sync with the same flag in api/data-proxy.ts and the dev proxy plugin).
 */
export const OPEN_LISTING_ENABLED = true;
