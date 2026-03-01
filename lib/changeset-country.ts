import { iso1A2Code } from "@rapideditor/country-coder";
import type { Changeset } from "@/types/changeset";
import {
  normalizeCountryCode as normalizeAlpha2CountryCode,
  toFlagEmoji as toFlagEmojiFromCountryCode,
} from "@/lib/country";

const countryCache = new Map<string, { countryCode: string | null; countryFlag: string | null }>();
const MAX_CACHE_ENTRIES = 4000;
const UNWANTED_CODES = new Set(["UN"]);

function resolveCountryFromCenter(lat: number, lon: number) {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const cached = countryCache.get(key);
  if (cached) {
    return cached;
  }

  const countryCode = normalizeCountryCode(iso1A2Code([lon, lat]));
  const resolved = {
    countryCode,
    countryFlag: toFlagEmojiFromCountryCode(countryCode),
  };

  if (countryCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = countryCache.keys().next().value as string | undefined;
    if (firstKey) {
      countryCache.delete(firstKey);
    }
  }

  countryCache.set(key, resolved);
  return resolved;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeCountryCode(code: string | null) {
  const normalized = normalizeAlpha2CountryCode(code);
  if (!normalized || UNWANTED_CODES.has(normalized)) {
    return null;
  }
  return normalized;
}

function resolveCountryForChangeset(changeset: Changeset) {
  const { min_lat, min_lon, max_lat, max_lon } = changeset;

  if (
    !isFiniteNumber(min_lat) ||
    !isFiniteNumber(min_lon) ||
    !isFiniteNumber(max_lat) ||
    !isFiniteNumber(max_lon)
  ) {
    return { countryCode: null, countryFlag: null };
  }

  const centerLat = (min_lat + max_lat) / 2;
  const centerLon = (min_lon + max_lon) / 2;
  const center = resolveCountryFromCenter(centerLat, centerLon);
  const normalizedCenter = normalizeCountryCode(center.countryCode);
  if (normalizedCenter) {
    return {
      countryCode: normalizedCenter,
      countryFlag: toFlagEmojiFromCountryCode(normalizedCenter),
    };
  }

  // Fallback for border-crossing/coastal bboxes where center can be in water.
  const corners = [
    [min_lon, min_lat],
    [min_lon, max_lat],
    [max_lon, min_lat],
    [max_lon, max_lat],
  ] as const;

  const countryHits = new Map<string, number>();
  for (const [lon, lat] of corners) {
    const code = normalizeCountryCode(iso1A2Code([lon, lat]));
    if (!code) continue;
    countryHits.set(code, (countryHits.get(code) ?? 0) + 1);
  }

  if (countryHits.size > 0) {
    const bestCountry = Array.from(countryHits.entries()).sort((a, b) => b[1] - a[1])[0][0];
    return {
      countryCode: bestCountry,
      countryFlag: toFlagEmojiFromCountryCode(bestCountry),
    };
  }

  return { countryCode: null, countryFlag: null };
}

export function enrichChangesetsWithCountry(changesets: Changeset[]): Changeset[] {
  return changesets.map((changeset) => {
    const { countryCode, countryFlag } = resolveCountryForChangeset(changeset);

    return {
      ...changeset,
      countryCode,
      countryFlag,
    };
  });
}
