# Kontura iOS Shell (Face ID)

Native SwiftUI-Hülle um die Kontura-Web-App:

1. App startet → **Face ID / Touch ID / Gerätecode**
2. Nach Erfolg → `WKWebView` lädt `KonturaServerURL`
3. Beim Wechsel in den Hintergrund wird die App wieder gesperrt

## Auf dem Mac öffnen

1. Xcode 16+ installieren
2. Neues iOS-App-Projekt **Kontura** anlegen (SwiftUI, Bundle ID z.B. `app.kontura.ios`)
3. Dateien aus diesem Ordner in das Target kopieren (`KonturaApp`, `RootView`, `BiometricAuth`, `WebContainer`, `Info.plist`-Keys)
4. Capability: **Face ID** (Usage Description ist in `Info.plist`)
5. `KonturaServerURL` auf deine Vercel-/LAN-URL setzen (Production HTTPS)
6. Auf Gerät bauen (Simulator: Biometrie über Features → Face ID)

## Sicherheitshinweise

- Face ID schützt den **Gerätezugriff**, nicht die Server-Session allein
- Production: nur HTTPS, kurze Cookie-Sessions, MFA in Supabase
- Bank-PINs laufen nur über finAPI Web Form — nie in der WebView abfragen

## Lokal mit Dev-Server

```bash
cd finanz-ai && npm run dev -- --port 3001
# Info.plist: KonturaServerURL = http://<dein-mac-lan-ip>:3001
```
