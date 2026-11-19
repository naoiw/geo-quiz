import type { Locale } from "../i18n/messages";

export interface Country {
  id: string;
  names: Record<Locale, string>;
  regionIds: readonly string[];
  flagId: string;
  geometryId: string;
}

/** Issue #2 will supply the authoritative list; no fake country data here. */
export const countries: readonly Country[] = [];
