import type { ReactNode } from "react";

export interface CountryChoice {
  countryId: string;
}

interface Props<T extends CountryChoice> {
  choices: readonly T[];
  label: string;
  disabled: boolean;
  correctCountryId?: string | null;
  selectedCountryId?: string | null;
  onSelect: (countryId: string) => void;
  renderChoice: (choice: T, index: number) => ReactNode;
  variant?: "name" | "flag";
}

/** One reusable button grid for the text-choice and flag-choice quiz modes. */
export function CountryChoiceGrid<T extends CountryChoice>({
  choices,
  label,
  disabled,
  correctCountryId = null,
  selectedCountryId = null,
  onSelect,
  renderChoice,
  variant = "name",
}: Props<T>) {
  return (
    <div className={"quiz__choices" + (variant === "flag" ? " quiz__flag-choices" : "")}
      role="group" aria-label={label}>
      {choices.map((choice, index) => {
        const correct = correctCountryId !== null && choice.countryId === correctCountryId;
        const incorrect = correctCountryId !== null && selectedCountryId === choice.countryId && !correct;
        return (
          <button
            key={choice.countryId}
            type="button"
            className={"quiz__choice" + (correct ? " quiz__choice--correct" : "") +
              (incorrect ? " quiz__choice--wrong" : "")}
            disabled={disabled}
            onClick={() => onSelect(choice.countryId)}
          >
            <span className="quiz__choice-index" aria-hidden="true">{String.fromCharCode(65 + index)}</span>
            {renderChoice(choice, index)}
            {correct && <span className="quiz__choice-mark" aria-hidden="true">✓</span>}
            {incorrect && <span className="quiz__choice-mark" aria-hidden="true">×</span>}
          </button>
        );
      })}
    </div>
  );
}
