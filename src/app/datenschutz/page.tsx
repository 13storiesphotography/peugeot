import type { Metadata } from "next";
import Link from "next/link";
import { LegalSection, LegalShell } from "@/components/LegalShell";
import { CONTACT, mailto } from "@/lib/contact";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Datenschutz · Peugeot Control",
  description:
    "Datenschutzerklärung für Peugeot Control (peugeotcontrol.app) gemäß DSGVO.",
  path: "/datenschutz",
});

export default function DatenschutzPage() {
  return (
    <LegalShell
      title="Datenschutz"
      description="Informationen zur Verarbeitung personenbezogener Daten bei Nutzung von Peugeot Control (peugeotcontrol.app)."
    >
      <LegalSection title="1. Verantwortlicher">
        <p>
          Verantwortlich im Sinne der DSGVO:
          <br />
          <strong>Florian Knoll</strong>
          <br />
          Kellerwiese 10, 82327 Tutzing, Deutschland
          <br />
          E-Mail:{" "}
          <a href={mailto(CONTACT.privacy)}>{CONTACT.privacy}</a>
        </p>
      </LegalSection>

      <LegalSection title="2. Überblick">
        <p>
          Peugeot Control ist eine inoffizielle Web-App zur Anzeige und Steuerung
          von Peugeot-Fahrzeugen über MyPeugeot. Wir verarbeiten Daten nur, soweit
          das für Betrieb, Sicherheit, Abrechnung und Support nötig ist.
        </p>
      </LegalSection>

      <LegalSection title="3. Hosting und Infrastruktur">
        <p>
          Die App wird bei <strong>Vercel Inc.</strong> betrieben. Zugriffe
          erzeugen technisch notwendige Server-Logs (z. B. IP-Adresse, Zeitpunkt,
          User-Agent) zur Auslieferung und Absicherung.
        </p>
        <p>
          Authentifizierung und Datenbank laufen über <strong>Supabase</strong>{" "}
          (Auth, Postgres). Zahlungen und Rechnungen über{" "}
          <strong>Stripe</strong>.
        </p>
      </LegalSection>

      <LegalSection title="4. Konto und Anmeldung">
        <p>Bei Registrierung und Login verarbeiten wir:</p>
        <ul>
          <li>E-Mail-Adresse</li>
          <li>Passwort (nur gehasht beim Auth-Dienst)</li>
          <li>optional Zwei-Faktor-Authentifizierung (TOTP)</li>
          <li>Sitzungs-Cookies für den Login-Zustand</li>
        </ul>
        <p>
          Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertrag / vorvertragliche
          Maßnahmen) sowie lit. f (Sicherheit der Accounts).
        </p>
      </LegalSection>

      <LegalSection title="5. MyPeugeot-Anbindung">
        <p>
          Zum Abrufen von Fahrzeugstatus und Fernbedienung speichern wir mit
          deiner Zustimmung:
        </p>
        <ul>
          <li>MyPeugeot-E-Mail</li>
          <li>verschlüsseltes MyPeugeot-Passwort (zur automatischen Sitzungserneuerung)</li>
          <li>OAuth-/API-Tokens und Metadaten der Verbindung</li>
          <li>Fahrzeugkennungen und Statusdaten (z. B. Batterie, Laden, Klima, Standort, sofern vom MyPeugeot-Konto geliefert)</li>
        </ul>
        <p>
          Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO. Die Daten kommen von
          Diensten von Stellantis/Peugeot; Peugeot Control ist kein offizielles
          Angebot dieser Unternehmen.
        </p>
      </LegalSection>

      <LegalSection title="6. Zahlungen (Pro)">
        <p>
          Für bezahlte Abos verarbeitet <strong>Stripe</strong> Zahlungsdaten,
          Rechnungsadresse, optional USt-Id und Transaktionshistorie. Wir speichern
          in unserer Datenbank vor allem Entitlement-Status und Stripe-Kunden- bzw.
          Session-IDs — keine vollständigen Kartendaten.
        </p>
        <p>
          Rechtsgrundlage: Art. 6 Abs. 1 lit. b und c DSGVO (Vertrag und
          steuer-/handelsrechtliche Aufbewahrung).
        </p>
      </LegalSection>

      <LegalSection title="7. Reichweitenmessung und Cookies">
        <p>
          Nach Einwilligung nutzen wir optionale Statistik:
        </p>
        <ul>
          <li>
            eigene anonyme Seitenaufrufe (zufällige Visitor-ID in localStorage,
            Pfad, Referrer) für ein internes Traffic-Dashboard
          </li>
          <li>
            <strong>Vercel Analytics</strong> (aggregierte Nutzungsstatistiken)
          </li>
        </ul>
        <p>
          Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung). Du kannst die
          Einwilligung jederzeit über den Cookie-Hinweis widerrufen bzw. neu setzen
          (localStorage-Schlüssel <code>pc_cookie_consent</code>).
        </p>
        <p>
          Technisch notwendige Cookies/Speicher (Login, Passwort-Reset, PWA) sind
          für den Betrieb erforderlich (Art. 6 Abs. 1 lit. b/f DSGVO).
        </p>
      </LegalSection>

      <LegalSection title="8. E-Mails">
        <p>
          Transaktionsmails (Bestätigung, Passwort-Reset, ggf. Hinweise) versenden
          wir über <strong>Resend</strong> bzw. angebundene Auth-Hooks.
          Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
        </p>
      </LegalSection>

      <LegalSection title="9. Speicherdauer">
        <p>
          Kontodaten bleiben bis zur Löschung des Accounts gespeichert.
          Zahlungs-/Rechnungsdaten behalten wir so lange, wie gesetzliche
          Aufbewahrungsfristen es verlangen. Logs und Statistikdaten werden
          regelmäßig bereinigt bzw. nur in aggregierter Form genutzt.
        </p>
      </LegalSection>

      <LegalSection title="10. Deine Rechte">
        <p>Du hast insbesondere Rechte auf:</p>
        <ul>
          <li>Auskunft (Art. 15 DSGVO)</li>
          <li>Berichtigung (Art. 16)</li>
          <li>Löschung (Art. 17)</li>
          <li>Einschränkung (Art. 18)</li>
          <li>Datenübertragbarkeit (Art. 20)</li>
          <li>Widerspruch (Art. 21)</li>
          <li>Widerruf erteilter Einwilligungen</li>
        </ul>
        <p>
          Konto löschen kannst du in den Einstellungen. Beschwerden richtest du an
          die zuständige Aufsichtsbehörde.
        </p>
      </LegalSection>

      <LegalSection title="11. Weitergabe">
        <p>
          Eine Weitergabe erfolgt nur an Auftragsverarbeiter (Vercel, Supabase,
          Stripe, Resend) und nur soweit für den Betrieb nötig, oder wenn wir
          gesetzlich dazu verpflichtet sind. Kein Verkauf von Daten.
        </p>
      </LegalSection>

      <LegalSection title="12. Sicherheit">
        <p>
          Übertragung per HTTPS, Zugriffsschutz (Login, optional MFA),
          verschlüsselte Ablage sensibler MyPeugeot-Zugangsdaten. Absolute
          Sicherheit kann kein Internetsystem garantieren.
        </p>
      </LegalSection>

      <LegalSection title="13. Weitere Hinweise">
        <p>
          Siehe auch{" "}
          <Link href="/impressum">Impressum</Link>,{" "}
          <Link href="/agb">AGB</Link> und{" "}
          <Link href="/widerruf">Widerrufsbelehrung</Link>.
        </p>
        <p>Stand: Oktober 2026.</p>
      </LegalSection>
    </LegalShell>
  );
}
