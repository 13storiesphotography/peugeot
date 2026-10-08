export function LandingSections() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <h2 className="font-display text-3xl font-bold text-ink md:text-4xl">
          Eine Frage. Eine klare Antwort.
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">
          Kontura rechnet mit deinen Umsätzen und Budgets — nicht mit Bauchgefühl.
          Die AI sieht nur aggregierte Zahlen, nie Passwörter oder PINs.
        </p>
        <blockquote className="mt-10 border-l-2 border-teal pl-5 text-xl text-ink md:text-2xl">
          „Kann ich mir den Schrank für 799 € diesen Monat leisten — oder wie
          viel muss ich sparen?“
        </blockquote>
      </section>

      <section
        id="sicherheit"
        className="border-y border-[#10253a]/10 bg-[#10253a] text-white"
      >
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Sicherheit vor Features.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-white/75">
            Bankzugang nur über lizenziertes Open Banking (PSD2). Tokens
            verschlüsselt. Face-ID-Lock für iOS geplant. Kein Scraping von
            Sparkasse-Logins.
          </p>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              ["PSD2-Consent", "Sparkasse & Co. über finAPI/Tink — mit SCA."],
              ["Minimale AI-Daten", "Nur Salden, Budgets, Kategorien — keine Secrets."],
              ["iOS-ready", "PWA jetzt, native Shell mit Biometrie als nächster Schritt."],
            ].map(([title, body]) => (
              <li key={title}>
                <h3 className="font-display text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-white/70">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-ink-soft">
        <p>
          Kontura MVP · Demo-Daten · Kein Anlageprodukt · Open-Banking-Anbindung
          folgt.
        </p>
      </footer>
    </>
  );
}
