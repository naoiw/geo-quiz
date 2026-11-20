import { useEffect, useRef, useState } from "react";
import { ModeCard } from "../components/ModeCard";
import { MapToNameQuiz } from "../features/quiz/MapToNameQuiz";
import { FlagToNameQuiz } from "../features/quiz/FlagToNameQuiz";
import { NameToMapQuiz } from "../features/quiz/NameToMapQuiz";
import { NameToFlagQuiz } from "../features/quiz/NameToFlagQuiz";
import { countries, findCountry, getCountryName } from "../country-data";
import { quizModes } from "../features/quiz/modes";
import type { QuizKind } from "../game-engine/types";
import { CountryFlag } from "../flags/CountryFlag";
import { translate, type MessageKey } from "../i18n/messages";
import { useLocale } from "../i18n/useLocale";
import { WorldMap } from "../map/WorldMap";
import { useAndroidBackButton } from "../android/useAndroidBackButton";

type MapDemoMode = "explore" | "highlight" | "answer";

function readModeFromHash(): QuizKind | null {
  const hash = window.location.hash;
  return quizModes.find((mode) => hash === "#" + mode.id + "-quiz")?.id ?? null;
}

export function App() {
  const { locale, setLocale } = useLocale();
  const t = (key: MessageKey) => translate(locale, key);
  const [activeMode, setActiveMode] = useState<QuizKind | null>(readModeFromHash);
  const quizPanelRef = useRef<HTMLDivElement>(null);
  const modeHeadingRef = useRef<HTMLHeadingElement>(null);
  const navigationStarted = useRef(readModeFromHash() !== null);

  useEffect(() => {
    const syncRoute = () => {
      navigationStarted.current = true;
      setActiveMode(readModeFromHash());
    };
    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  useEffect(() => {
    if (!navigationStarted.current) return;
    const target = activeMode ? quizPanelRef.current : modeHeadingRef.current;
    target?.focus();
  }, [activeMode]);

  const openMode = (mode: QuizKind) => {
    navigationStarted.current = true;
    setActiveMode(mode);
    window.location.hash = mode + "-quiz";
  };

  const backToModes = () => {
    navigationStarted.current = true;
    setActiveMode(null);
    window.location.hash = "modes";
  };

  // Android system back follows the same navigation as the visible back button.
  useAndroidBackButton(activeMode !== null, backToModes);

  const [mapMode, setMapMode] = useState<MapDemoMode>("explore");
  const [targetId, setTargetId] = useState("JP");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewFlagId, setPreviewFlagId] = useState("JP");
  const [showPreviews, setShowPreviews] = useState(false);
  const target = findCountry(targetId);
  const selection = selectedId ? findCountry(selectedId) : undefined;
  const previewFlagCountry = findCountry(previewFlagId);

  const selectMode = (mode: MapDemoMode) => {
    setMapMode(mode);
    setSelectedId(null);
  };

  const changeTarget = (id: string) => {
    setTargetId(id);
    setSelectedId(null);
  };

  const selectionText = mapMode === "answer"
    ? selectedId
      ? selectedId === targetId ? t("mapCorrect") : t("mapIncorrect")
      : t("mapAnswerHelp")
    : selection
      ? t("mapSelected") + getCountryName(selection, locale)
      : t("mapExploreHelp");

  return (
    <div className="app-shell">
      <header className="site-header page-container">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="Geo Quiz home">
          <span className="brand__mark" aria-hidden="true">◎</span>
          <span>GEO QUIZ</span>
        </a>
        <details className="language-settings">
          <summary>
            <span aria-hidden="true">⚙</span>
            {t("settings")}
            <span className="language-settings__current">{locale.toUpperCase()}</span>
          </summary>
          <div className="language-settings__panel">
            <fieldset>
              <legend>{t("language")}</legend>
              <p className="language-settings__help">{t("languageHelp")}</p>
              <label>
                <input
                  type="radio"
                  name="geo-quiz-language"
                  value="ja"
                  checked={locale === "ja"}
                  onChange={() => setLocale("ja")}
                />
                {t("languageJapanese")}
              </label>
              <label>
                <input
                  type="radio"
                  name="geo-quiz-language"
                  value="en"
                  checked={locale === "en"}
                  onChange={() => setLocale("en")}
                />
                {t("languageEnglish")}
              </label>
              <p className="language-settings__hint">{t("languageSaved")}</p>
            </fieldset>
          </div>
        </details>
      </header>

      <main className="page-container">
        {!activeMode && (
        <section className="hero" aria-labelledby="hero-title">
          <p className="eyebrow">{t("tagline")}</p>
          <h1 id="hero-title">{t("heading")}</h1>
          <p className="hero__description">{t("intro")}</p>
        </section>
        )}

        {!activeMode ? (
          <section id="modes" className="mode-selection" aria-labelledby="modes-title">
            <div className="section-heading">
              <div>
                <h2 id="modes-title" ref={modeHeadingRef} tabIndex={-1}>{t("modes")}</h2>
                <p>{t("modesBody")}</p>
              </div>
              <span className="section-count">01 — 04</span>
            </div>
            <div className="mode-grid">
              {quizModes.map((mode) => (
                <ModeCard key={mode.id} mode={mode} t={t} onPlay={openMode} />
              ))}
            </div>
          </section>
        ) : (
          <section className="active-quiz" aria-label={t("activeQuiz")}>
            <nav className="active-quiz__navigation" aria-label={t("quizNavigation")}>
              <button type="button" className="active-quiz__back" onClick={backToModes}>
                <span aria-hidden="true">←</span> {t("backToModes")}
              </button>
              <span className="active-quiz__mode-name">
                {t(quizModes.find((mode) => mode.id === activeMode)?.titleKey ?? "modes")}
              </span>
            </nav>
            <div ref={quizPanelRef} tabIndex={-1} aria-label={t("activeQuiz")} role="region">
              {activeMode === "map-to-name" && <MapToNameQuiz locale={locale} />}
              {activeMode === "flag-to-name" && <FlagToNameQuiz locale={locale} />}
              {activeMode === "name-to-map" && <NameToMapQuiz locale={locale} />}
              {activeMode === "name-to-flag" && <NameToFlagQuiz locale={locale} />}
            </div>
          </section>
        )}

        {!activeMode && (
        <>
        <details
          className="reference-demos"
          onToggle={(event) => setShowPreviews(event.currentTarget.open)}
        >
          <summary>{t("referenceDemos")}</summary>
          {showPreviews && <div className="reference-demos__content">
            <section className="map-demo" aria-labelledby="map-title">
              <div className="section-heading">
                <div>
                  <h2 id="map-title">{t("mapSection")}</h2>
                  <p>{t("mapSectionBody")}</p>
                </div>
                <span className="section-count">2D / 197</span>
              </div>
              <div className="map-demo__settings">
                <div className="map-demo__modes" role="group" aria-label={t("mapModeLabel")}>
                  {(["explore", "highlight", "answer"] as const).map((mode) => (
                    <button
                      type="button"
                      key={mode}
                      aria-pressed={mapMode === mode}
                      className={mapMode === mode ? "is-active" : ""}
                      onClick={() => selectMode(mode)}
                    >
                      {t(mode === "explore" ? "mapExplore" : mode === "highlight" ? "mapHighlight" : "mapAnswer")}
                    </button>
                  ))}
                </div>
                {mapMode !== "explore" && (
                  <label className="map-demo__target">
                    {t("mapTarget")}
                    <select value={targetId} onChange={(event) => changeTarget(event.target.value)}>
                      {countries.map((country) => (
                        <option key={country.id} value={country.id}>{getCountryName(country, locale)}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              {mapMode === "answer" && target && (
                <p className="map-demo__question">
                  {locale === "ja"
                    ? "地図から「" + getCountryName(target, locale) + "」を選択してください。"
                    : "Select " + getCountryName(target, locale) + " on the map."}
                </p>
              )}
              {mapMode === "highlight" && (
                <p className="map-demo__question">{t("mapHighlightHelp")}</p>
              )}
              <WorldMap
                locale={locale}
                mode={mapMode}
                highlightedCountryId={mapMode === "highlight" ? targetId : null}
                selectedCountryId={selectedId}
                focusCountryId={mapMode === "highlight" ? targetId : null}
                onCountrySelect={setSelectedId}
              />
              <div className="map-demo__feedback" role="status" aria-live="polite">
                {selectionText}
              </div>
            </section>
    
            <section className="flag-demo" aria-labelledby="flag-title">
              <div className="section-heading">
                <div>
                  <h2 id="flag-title">{t("flagSection")}</h2>
                  <p>{t("flagSectionBody")}</p>
                </div>
                <span className="section-count">197 FLAGS</span>
              </div>
              <div className="flag-demo__panel">
                <label className="flag-demo__control">
                  {t("flagTarget")}
                  <select value={previewFlagId} onChange={(event) => setPreviewFlagId(event.target.value)}>
                    {countries.map((country) => (
                      <option key={country.id} value={country.id}>{getCountryName(country, locale)}</option>
                    ))}
                  </select>
                </label>
                {previewFlagCountry && (
                  <div className="flag-demo__sample">
                    <CountryFlag country={previewFlagCountry} locale={locale} />
                    <p>{getCountryName(previewFlagCountry, locale)}</p>
                  </div>
                )}
              </div>
              <p className="flag-demo__notice">{t("flagNotice")}</p>
            </section>
          </div>}
        </details>

        </>
        )}
      </main>

      <footer className="site-footer page-container">
        <span>© 2026 naoiw</span>
        <a href="https://github.com/naoiw/geo-quiz" target="_blank" rel="noopener noreferrer">
          GitHub <span aria-hidden="true">↗</span>
        </a>
      </footer>
    </div>
  );
}
