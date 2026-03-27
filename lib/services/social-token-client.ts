/**
 * social-token-client.ts — TAX4US client for resolving social tokens from SuperSeller API
 *
 * Reads tokens from the SuperSeller social_tokens DB via the resolve API.
 * Auth: Bearer SUPERSELLER_CRON_SECRET
 * Endpoint: api/social/tokens/resolve
 *
 * Required env vars:
 *   SUPERSELLER_API_URL     — defaults to https://api.superseller.agency
 *   SUPERSELLER_CRON_SECRET — shared cron secret from SuperSeller platform
 */

const SUPERSELLER_API_URL = process.env.SUPERSELLER_API_URL || 'https://api.superseller.agency';
const SUPERSELLER_CRON_SECRET = process.env.SUPERSELLER_CRON_SECRET;

/**
 * Fetch a social platform token from SuperSeller's encrypted DB.
 * Throws if SUPERSELLER_CRON_SECRET is missing or the API returns non-200.
 */
export async function getSocialTokenViaApi(
  brandId: string,
  platform: 'facebook' | 'linkedin' | 'instagram',
  tokenType: string = 'long_lived'
): Promise<string> {
  if (!SUPERSELLER_CRON_SECRET) {
    throw new Error('SUPERSELLER_CRON_SECRET env var required for token resolution');
  }

  const url = `${SUPERSELLER_API_URL}/api/social/tokens/resolve?brandId=${brandId}&platform=${platform}&tokenType=${tokenType}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${SUPERSELLER_CRON_SECRET}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Token resolve failed for ${brandId}/${platform}/${tokenType}: ${res.status} ${body}`);
  }

  const data = await res.json();
  return data.token;
}
