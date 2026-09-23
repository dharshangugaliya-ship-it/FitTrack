/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Bidirectional mapping between frontend mock/slug challenge IDs and database UUIDs.
 * The UUIDs match the authoritative seed records defined in supabase/migrations/20260918010000_create_challenges.sql.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MOCK_TO_UUID_MAP: Record<string, string> = {
  'ch-squat-10k': '11111111-1111-1111-1111-111111111101',
  'ch-streak-30d': '11111111-1111-1111-1111-111111111102',
  'ch-run-100k': '11111111-1111-1111-1111-111111111103',
  'ch-run-100km': '11111111-1111-1111-1111-111111111103',
  'ch-plank-core': '11111111-1111-1111-1111-111111111104',
  'ch-pushups-500': '11111111-1111-1111-1111-111111111105',
  'ch-yoga-mindful': '11111111-1111-1111-1111-111111111106',
  'ch-cycling-150k': '11111111-1111-1111-1111-111111111107',
};

export const UUID_TO_MOCK_MAP: Record<string, string> = Object.entries(MOCK_TO_UUID_MAP).reduce(
  (acc, [slug, uuid]) => {
    acc[uuid] = slug;
    return acc;
  },
  {} as Record<string, string>
);

/**
 * Returns true if the string is a valid RFC 4122 UUID.
 */
export function isUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Translates a slug or mock ID to its corresponding database UUID.
 * If the input is already a UUID or has no mapped equivalent, returns the original ID.
 */
export function toDatabaseChallengeId(id: string): string {
  if (!id) return id;
  if (MOCK_TO_UUID_MAP[id]) {
    return MOCK_TO_UUID_MAP[id];
  }
  return id;
}

/**
 * Translates a database UUID to its corresponding mock/slug ID.
 * If the input is not mapped, returns the original ID.
 */
export function toFrontendChallengeId(id: string): string {
  if (!id) return id;
  if (UUID_TO_MOCK_MAP[id]) {
    return UUID_TO_MOCK_MAP[id];
  }
  return id;
}
