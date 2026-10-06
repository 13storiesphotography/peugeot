import type { Metadata } from "next";
import Link from "next/link";
import { LegalSection, LegalShell } from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Widerrufsbelehrung · Peugeot Control",
  description:
    "Widerrufsbelehrung und Muster-Widerrufsformular für Peugeot Control Pro.",
};

export default function WiderrufPage() {
  return (
    <LegalShell
      title="Widerrufsbelehrung"
      description="Informationen zum Widerrufsrecht für Verbraucher beim Abschluss von Peugeot Control Pro."
    >
      <LegalSection title="Widerrufsrecht">
        <p>
          Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen
          Vertrag zu widerrufen.
        </p>
        <p>
          Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des
          Vertragsabschlusses.
        </p>
        <p>
          Um dein Widerrufsrecht auszuüben, musst du uns
          <br />
          <strong>Florian Knoll</strong>, Kellerwiese 10, 82327 Tutzing,
          Deutschland
          <br />
          E-Mail:{" "}
          <a href="mailto:mail@florianknoll.de">mail@florianknoll.de</a>
          <br />
          mittels einer eindeutigen Erklärung (z. B. per E-Mail) über deinen
          Entschluss, diesen Vertrag zu widerrufen, informieren. Du kannst dafür
          das unten stehende Muster-Widerrufsformular verwenden, das jedoch nicht
          vorgeschrieben ist.
        </p>
        <p>
          Zur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung
          über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist
          absendest.
        </p>
      </LegalSection>

      <LegalSection title="Folgen des Widerrufs">
        <p>
          Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die
          wir von dir erhalten haben, unverzüglich und spätestens binnen
          vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über
          deinen Widerruf dieses Vertrags bei uns eingegangen ist. Für diese
          Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du bei der
          ursprünglichen Transaktion eingesetzt hast, es sei denn, mit dir wurde
          ausdrücklich etwas anderes vereinbart; in keinem Fall werden dir wegen
          dieser Rückzahlung Entgelte berechnet.
        </p>
      </LegalSection>

      <LegalSection title="Vorzeitiges Erlöschen bei digitalen Inhalten">
        <p>
          Das Widerrufsrecht erlischt bei einem Vertrag über die Lieferung von
          nicht auf einem körperlichen Datenträger gespeicherten digitalen
          Inhalten, wenn der Unternehmer mit der Ausführung des Vertrags begonnen
          hat, nachdem der Verbraucher
        </p>
        <ul>
          <li>
            ausdrücklich zugestimmt hat, dass der Unternehmer mit der Ausführung
            des Vertrags vor Ablauf der Widerrufsfrist beginnt, und
          </li>
          <li>
            seine Kenntnis davon bestätigt hat, dass er durch seine Zustimmung
            mit Beginn der Ausführung des Vertrags sein Widerrufsrecht verliert.
          </li>
        </ul>
        <p>
          Beim Kauf von <strong>Peugeot Control Pro</strong> beginnt die
          Leistung in der Regel <strong>sofort</strong> nach erfolgreicher
          Zahlung (Freischaltung der Pro-Funktionen). Im Bestellprozess wirst du
          daher um die entsprechende Zustimmung und Bestätigung gebeten.
        </p>
      </LegalSection>

      <LegalSection title="Muster-Widerrufsformular">
        <p>
          (Wenn du den Vertrag widerrufen willst, dann fülle bitte dieses Formular
          aus und sende es zurück.)
        </p>
        <p>
          An
          <br />
          Florian Knoll, Kellerwiese 10, 82327 Tutzing, Deutschland
          <br />
          E-Mail: mail@florianknoll.de
        </p>
        <p>
          Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen
          Vertrag über den Kauf der folgenden Waren (*)/die Erbringung der
          folgenden Dienstleistung (*)
          <br />
          — Bestellt am (*)/erhalten am (*)
          <br />
          — Name des/der Verbraucher(s)
          <br />
          — Anschrift des/der Verbraucher(s)
          <br />
          — Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)
          <br />
          — Datum
        </p>
        <p>(*) Unzutreffendes streichen.</p>
      </LegalSection>

      <LegalSection title="Weitere Hinweise">
        <p>
          Unabhängig vom Widerruf kannst du Pro in den Einstellungen zum
          Periodenende kündigen (siehe <Link href="/agb">AGB</Link>).
        </p>
        <p>Stand: Oktober 2026.</p>
      </LegalSection>
    </LegalShell>
  );
}
