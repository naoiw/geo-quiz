import type { QuizModeDefinition } from "../features/quiz/modes";
import type { QuizKind } from "../game-engine/types";
import type { MessageKey } from "../i18n/messages";

interface Props {
  mode: QuizModeDefinition;
  t: (key: MessageKey) => string;
  onPlay?: (mode: QuizKind) => void;
}

export function ModeCard({ mode, t, onPlay }: Props) {
  return (
    <article className="mode-card">
      <div className="mode-card__top">
        <span className="mode-card__icon" aria-hidden="true">{mode.symbol}</span>
        <span className="mode-card__status">{t("available")}</span>
      </div>
      <h3>{t(mode.titleKey)}</h3>
      <p>{t(mode.bodyKey)}</p>
      <a
        className="mode-card__play"
        href={"#" + mode.id + "-quiz"}
        onClick={(event) => {
          if (!onPlay) return;
          event.preventDefault();
          onPlay(mode.id);
        }}
      >{t("play")}</a>
    </article>
  );
}
