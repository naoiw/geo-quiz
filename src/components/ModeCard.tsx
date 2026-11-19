import type { QuizModeDefinition } from "../features/quiz/modes";
import type { MessageKey } from "../i18n/messages";

interface Props {
  mode: QuizModeDefinition;
  t: (key: MessageKey) => string;
}

export function ModeCard({ mode, t }: Props) {
  return (
    <article className="mode-card">
      <div className="mode-card__top">
        <span className="mode-card__icon" aria-hidden="true">{mode.symbol}</span>
        <span className="mode-card__status">{t("planned")}</span>
      </div>
      <h3>{t(mode.titleKey)}</h3>
      <p>{t(mode.bodyKey)}</p>
    </article>
  );
}
