# Stencit

Tattoo-Vorschau am eigenen Foto: Foto vom Arm hochladen → Tiefe (Depth Anything V2) + Haut (MediaPipe) →
Motiv oberflächentreu platzieren → „Stechen“ (lokales Rendering der Tinte in der Haut).
Motive lassen sich per Lasso aus Screenshots ausschneiden, der Hintergrund (Papier oder Haut) wird entfernt.

- Analyse und Rendering laufen im Browser, das Foto verlässt das Gerät nicht.
- Kein Build-Schritt: `public/index.html` ist die ganze App. `/studio` leitet auf `/` weiter.
- Die frühere Live-Kamera-Version (Webcam-Tracking) und die Snap-Camera-Kit-PoC wurden entfernt; sie stehen in der Git-Historie.

## Lokal starten

```bash
python3 -m http.server 5173 --directory public
```

Dann http://localhost:5173 öffnen.

## Deployment

Der Cloudflare Worker `tryonflash` ist mit diesem Repo verbunden (Workers Builds). Er liefert die statischen
Dateien aus `public/` aus und hat eine eigene Route (`src/worker.js`, konfiguriert in `wrangler.jsonc`).
Jeder Push auf `main` wird automatisch veröffentlicht.

- `/hf/*`: lädt die Dateien des Tiefenmodells über die eigene Domain (Safari blockiert sonst die Weiterleitung von Hugging Face).
- `/api/share`, `/api/share/:id`, `/f/:id`: verschlüsselte Flash-Links. Der Browser verschlüsselt die Flashes (AES-GCM),
  der Schlüssel steht nur im `#`-Teil des Links. Der Worker speichert nur den verschlüsselten Inhalt im KV-Namespace
  `SHARES` mit fester Laufzeit (1 Std bis 30 Tage) und einem Lösch-Token für das vorzeitige Beenden.

## Flashes

Im Menü unten gibt es neben dem Studio den Bereich **Flashes**: eigene Flash-Bögen hochladen (bleiben im Browser
des Geräts, IndexedDB), auswählen und per Link mit Ablaufzeit an Kunden schicken. Kunden sehen sie unter `/f/:id`
und können ein Flash direkt im Studio auf ihrer Haut ansehen.
