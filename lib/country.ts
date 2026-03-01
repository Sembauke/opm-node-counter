const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

export function normalizeCountryCode(countryCode: string | null | undefined): string | null {
  if (!countryCode) {
    return null;
  }

  const normalized = countryCode.trim().toUpperCase();
  if (!COUNTRY_CODE_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
}

export function toFlagEmoji(countryCode: string | null | undefined): string | null {
  const normalized = normalizeCountryCode(countryCode);
  if (!normalized) {
    return null;
  }

  return normalized
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

export function getCountryName(countryCode: string): string {
  try {
    const normalized = normalizeCountryCode(countryCode);
    if (!normalized) {
      return countryCode;
    }

    const displayNames = new Intl.DisplayNames(undefined, { type: "region" });
    return displayNames.of(normalized) ?? countryCode;
  } catch {
    return countryCode;
  }
}
