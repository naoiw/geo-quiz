import { ModeCard } from "../components/ModeCard";
import { quizModes } from "../features/quiz/modes";
import { translate, type MessageKey } from "../i18n/messages";
import { useLocale } from "../i18n/useLocale";

export function App() {
  const { locale, setLocale } = useLocale();
  const t = (key: MessageKey) => translate(locale, key);

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
