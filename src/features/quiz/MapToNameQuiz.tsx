import type { Locale } from "../../i18n/messages";
import { NameQuiz } from "./NameQuiz";

export function MapToNameQuiz({ locale }: { locale: Locale }) {
  return <NameQuiz kind="map-to-name" locale={locale} />;
}
