import { useState } from "react";
import { ModeCard } from "../components/ModeCard";
import { MapToNameQuiz } from "../features/quiz/MapToNameQuiz";
import { FlagToNameQuiz } from "../features/quiz/FlagToNameQuiz";
import { NameToMapQuiz } from "../features/quiz/NameToMapQuiz";
import { NameToFlagQuiz } from "../features/quiz/NameToFlagQuiz";
import { countries, findCountry, getCountryName } from "../country-data";
import { quizModes } from "../features/quiz/modes";
import { CountryFlag } from "../flags/CountryFlag";
import { translate, type MessageKey } from "../i18n/messages";
import { useLocale } from "../i18n/useLocale";
import { WorldMap } from "../map/WorldMap";

type MapDemoMode = "explore" | "highlight" | "answer";

export function App() {
  const { locale, setLocale } = useLocale();
  const t = (key: MessageKey) => translate(locale, key);
  const [mapMode, setMapMode] = useState<MapDemoMode>("explore");
  const [targetId, setTargetId] = useState("JP");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewFlagId, setPreviewFlagId] = useState("JP");
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
        <div className="language-switch" role="group" aria-label={t("language")}>
          <button type="button" className={locale === "ja" ? "is-active" : ""} aria-pressed={locale === "ja"} onClick={() => setLocale("ja")}>JP</button>
          <button type="button" className={locale === "en" ? "is-active" : ""} aria-pressed={locale === "en"} onClick={() => setLocale("en")}>EN</button>
        </div>
      </header>

      <main className="page-container">
        <section className="hero" aria-labelledby="hero-title">
          <p className="eyebrow">{t("tagline")}</p>
          <h1 id="hero-title">{t("heading")}</h1>
          <p className="hero__description">{t("intro")}</p>
          <div className="foundation-note">
            <span className="foundation-note__dot" aria-hidden="true" />
            <div>
              <strong>{t("foundation")}</strong>
              <p>{t("foundationBody")}</p>
            </div>
          </div>
        </section>

        <MapToNameQuiz locale={locale} />
        <FlagToNameQuiz locale={locale} />
        <NameToMapQuiz locale={locale} />
        <NameToFlagQuiz locale={locale} />

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
          <p className="map-demo__notice">{t("mapNotice")}</p>
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

        <section aria-labelledby="modes-title">
          <div className="section-heading">
            <div>
              <h2 id="modes-title">{t("modes")}</h2>
              <p>{t("modesBody")}</p>
            </div>
            <span className="section-count">01 — 04</span>
          </div>
          <div className="mode-grid">
            {quizModes.map((mode) => <ModeCard key={mode.id} mode={mode} t={t} />)}
          </div>
        </section>

        <aside className="next-step">
          <h2>{t("nextStep")}</h2>
          <p>{t("nextStepBody")}</p>
        </aside>
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
