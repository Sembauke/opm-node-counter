import "server-only";
import { borders } from "@rapideditor/country-coder";

const COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;

const sovereignCountryCodes = new Set<string>();

for (const feature of borders.features) {
  const properties = feature?.properties;
  const code = properties?.iso1A2;
  const level = properties?.level;

  if (level !== "country") {
    continue;
  }

  if (typeof code !== "string" || !COUNTRY_CODE_REGEX.test(code)) {
    continue;
  }

  sovereignCountryCodes.add(code);
}

export const TOTAL_SOVEREIGN_COUNTRIES = sovereignCountryCodes.size;

export function isSovereignCountryCode(countryCode: string) {
  return sovereignCountryCodes.has(countryCode.toUpperCase());
}
