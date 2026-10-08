# finAPI Sandbox einrichten

Kontura nutzt **finAPI Access + Web Form 2.0** (PSD2). Bank-Logins und SCA laufen nur bei finAPI — nie in unserer App.

## 1. Credentials holen

1. Bei [finAPI](https://www.finapi.io/) Sandbox-/Developer-Zugang anfordern (Access Client)
2. Notiere `client_id` und `client_secret` für **Sandbox**
3. Optional: Demo-Bank in der Sandbox (finAPI Testbank) zum Durchspielen ohne echte Sparkasse

> Echte Sparkasse-Live-Daten brauchen einen lizenzierten Vertrag + oft eIDAS/TPP. Sandbox zuerst.

## 2. Env setzen

In `finanz-ai/.env.local`:

```bash
OPEN_BANKING_ENABLED=true
FINAPI_ENV=sandbox
FINAPI_CLIENT_ID=...
FINAPI_CLIENT_SECRET=...
FINAPI_CALLBACK_URL=http://localhost:3001/api/banking/callback
KONTURA_VAULT_KEY=mindestens-16-zeichen-geheim
```

`KONTURA_VAULT_KEY` verschlüsselt den **finAPI-User** (nicht die Bank-PIN).

## 3. Flow in der App

1. Bank → **finAPI Sandbox verbinden**
2. Redirect zur Web Form → Bank wählen / Demo-Login + SCA
3. Callback oder Button **SCA abgeschlossen — Status prüfen**
4. **Umsätze syncen** lädt Accounts/Transactions über Access API

## 4. API-Endpunkte (Sandbox)

| Zweck | Base |
| --- | --- |
| OAuth / Users / Accounts | `https://sandbox.finapi.io` |
| Web Form 2.0 | `https://webform-sandbox.finapi.io` |

## 5. Ohne Credentials

Die **Demo-Sparkasse** funktioniert weiter lokal ohne finAPI.
