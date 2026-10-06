import type { Metadata } from "next";
import Link from "next/link";
import { LegalSection, LegalShell } from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "AGB · Peugeot Control",
  description:
    "Allgemeine Geschäftsbedingungen für die Nutzung von Peugeot Control.",
};

export default function AgbPage() {
  return (
    <LegalShell
      title="AGB"
      description="Allgemeine Geschäftsbedingungen für die Web-App Peugeot Control (peugeotcontrol.app)."
    >
      <LegalSection title="1. Anbieter und Geltungsbereich">
        <p>
          Anbieter: <strong>Florian Knoll</strong>, Kellerwiese 10, 82327
          Tutzing, Deutschland (
          <a href="mailto:mail@florianknoll.de">mail@florianknoll.de</a>).
        </p>
        <p>
          Diese AGB gelten für die Nutzung der Web-App Peugeot Control und für
          kostenpflichtige Abos („Pro“). Abweichende Bedingungen des Nutzers
          gelten nicht.
        </p>
      </LegalSection>

      <LegalSection title="2. Leistungsbeschreibung">
        <p>
          Peugeot Control ist eine <strong>inoffizielle</strong> Steuerungs- und
          Status-Oberfläche für Peugeot-Fahrzeuge über MyPeugeot. Keine
          Verbindung zu Stellantis N.V., Peugeot oder verbundenen Marken.
        </p>
        <p>
          <strong>Free:</strong> u. a. Anzeige von Statusdaten nach Verbindung
          mit MyPeugeot (soweit verfügbar).
        </p>
        <p>
          <strong>Pro:</strong> zusätzliche Fernbedienungs-Funktionen (z. B.
          Vorklima, Schloss, Finden/Hupe, 80%-Ladelimit), soweit das Fahrzeug,
          MyPeugeot und die Peugeot-Dienste das zulassen.
        </p>
        <p>
          Funktionen können von Fahrzeug, Region, Peugeot-Abo und API-Verfügbarkeit
          abhängen. Es besteht kein Anspruch auf ununterbrochene Verfügbarkeit
          oder vollständige Feature-Parität zur Serien-App.
        </p>
      </LegalSection>

      <LegalSection title="3. Registrierung und Account">
        <p>
          Für die Nutzung ist ein Konto erforderlich. Angaben müssen korrekt
          sein. Zugangsdaten sind geheim zu halten. Du bist für Aktivitäten unter
          deinem Konto verantwortlich, soweit du sie zu vertreten hast.
        </p>
      </LegalSection>

      <LegalSection title="4. MyPeugeot und Fremdleistungen">
        <p>
          Die Anbindung an MyPeugeot setzt gültige Zugangsdaten und die Einhaltung
          der Bedingungen von Stellantis/Peugeot voraus. Peugeot Control greift
          auf Schnittstellen Dritter zu; Änderungen oder Sperren dort können die
          App einschränken oder unterbrechen.
        </p>
        <p>
          Fernbedienung kann ein aktives Peugeot-/Connected-Services-Abo
          erfordern. Das ist nicht Bestandteil des Peugeot-Control-Abos.
        </p>
      </LegalSection>

      <LegalSection title="5. Pro-Abo, Preise, Zahlung">
        <p>
          Pro ist ein kostenpflichtiges Abonnement (monatlich oder jährlich).
          Angezeigte Preise sind <strong>Bruttopreise in Euro inkl. MwSt.</strong>
          , soweit Umsatzsteuer anfällt.
        </p>
        <p>
          Zahlung über Stripe. Der Vertrag kommt mit Abschluss des Checkouts /
          erfolgreicher Zahlung zustande. Abrechnung und Rechnungsversand erfolgen
          über Stripe.
        </p>
        <p>
          Das Abo verlängert sich automatisch um die gewählte Laufzeit, bis es
          zum Periodenende gekündigt wird.
        </p>
      </LegalSection>

      <LegalSection title="6. Kündigung">
        <p>
          Pro kannst du in den Einstellungen „zum Periodenende“ kündigen oder über
          das Stripe-Kundenportal. Bis Periodenende bleibt Pro nutzbar; danach
          gilt Free.
        </p>
        <p>
          Das gesetzliche Widerrufsrecht für Verbraucher bleibt unberührt (siehe{" "}
          <Link href="/widerruf">Widerrufsbelehrung</Link>).
        </p>
      </LegalSection>

      <LegalSection title="7. Pflichten der Nutzer">
        <ul>
          <li>keine missbräuchliche oder rechtswidrige Nutzung</li>
          <li>kein Umgehen von Sicherheitseinrichtungen</li>
          <li>keine Nutzung, die Rechte Dritter oder Fahrzeugsicherheit gefährdet</li>
          <li>Fahrzeugbedienung nur, wenn es die Situation erlaubt</li>
        </ul>
      </LegalSection>

      <LegalSection title="8. Haftung">
        <p>
          Nutzung auf eigenes Risiko. Für Schäden aus der Fernbedienung
          (z. B. Klima, Entriegeln) haftet der Anbieter nur bei Vorsatz und grober
          Fahrlässigkeit sowie bei Verletzung von Leben, Körper oder Gesundheit —
          im Übrigen nach den gesetzlichen Vorschriften, jedoch nicht für leichte
          Fahrlässigkeit bei nicht vertragswesentlichen Pflichten, soweit gesetzlich
          zulässig.
        </p>
        <p>
          Keine Haftung für Ausfälle oder Datenfehler von MyPeugeot/Stellantis,
          Netzwerken oder Endgeräten.
        </p>
      </LegalSection>

      <LegalSection title="9. Datenschutz">
        <p>
          Es gilt die{" "}
          <Link href="/datenschutz">Datenschutzerklärung</Link>.
        </p>
      </LegalSection>

      <LegalSection title="10. Schlussbestimmungen">
        <p>
          Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des
          UN-Kaufrechts. Zwingende Verbraucherschutzvorschriften am Wohnsitz des
          Verbrauchers bleiben unberührt.
        </p>
        <p>
          Sollten einzelne Klauseln unwirksam sein, bleibt der Rest wirksam.
        </p>
        <p>Stand: Oktober 2026.</p>
      </LegalSection>
    </LegalShell>
  );
}
