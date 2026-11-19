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
        <span className="mode-card__status">{t(mode.id === "map-to-name" || mode.id === "flag-to-name" ? "available" : "planned")}</span>
      </div>
      <h3>{t(mode.titleKey)}</h3>
      <p>{t(mode.bodyKey)}</p>
      {(mode.id === "map-to-name" || mode.id === "flag-to-name") && (
        <a className="mode-card__play" href={"#" + mode.id + "-quiz"}>{t("play")}</a>
      )}
    </article>
  );
}
