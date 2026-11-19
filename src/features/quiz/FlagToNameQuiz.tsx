import type { Locale } from "../../i18n/messages";
import { NameQuiz } from "./NameQuiz";

export function FlagToNameQuiz({ locale }: { locale: Locale }) {
  return <NameQuiz kind="flag-to-name" locale={locale} />;
}
