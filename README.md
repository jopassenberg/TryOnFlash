# Stencit

Tattoo-Vorschau am eigenen Foto: Foto vom Arm hochladen → Tiefe (Depth Anything V2) + Haut (MediaPipe) →
Motiv oberflächentreu platzieren → „Stechen“ (lokales Rendering mit Alters-Regler frisch bis 10+ Jahre).
Motive lassen sich per Lasso aus Screenshots ausschneiden, der Hintergrund (Papier oder Haut) wird entfernt.

- Analyse und Rendering laufen im Browser, das Foto verlässt das Gerät nicht (außer beim optionalen KI-Finish).
- Kein Build-Schritt: `public/index.html` ist die ganze App. `/studio` leitet auf `/` weiter.
- Die frühere Live-Kamera-Version (Webcam-Tracking) und die Snap-Camera-Kit-PoC wurden entfernt; sie stehen in der Git-Historie.

## Lokal starten

```bash
python3 -m http.server 5173 --directory public
```

Dann http://localhost:5173 öffnen.

## Deployment

Der Cloudflare Worker `tryonflash` ist mit diesem Repo verbunden (Workers Builds). Er liefert die statischen
Dateien aus `public/` aus und hat zwei eigene Routen (`src/worker.js`, konfiguriert in `wrangler.jsonc`).
Jeder Push auf `main` wird automatisch veröffentlicht.

- `/hf/*`: lädt die Dateien des Tiefenmodells über die eigene Domain (Safari blockiert sonst die Weiterleitung von Hugging Face).
- `POST /api/ink`: KI-Finish (siehe unten).

## KI-Finish

„KI-Finish“ schickt nur den Bildausschnitt ums Tattoo plus das Flash an `POST /api/ink`,
der Worker ruft fal.ai (`fal-ai/nano-banana-2/edit`) auf. Das Ergebnis wird nur im Tattoo-Bereich eingeblendet.

Einrichtung:
1. Account auf https://fal.ai, Guthaben aufladen, unter *Keys* einen API-Key anlegen.
2. Cloudflare → Workers & Pages → `tryonflash` → Settings → Variables and Secrets → **Add**:
   Typ **Secret**, Name `FAL_KEY`, Wert = der fal-Key → Deploy.
3. Ohne Key antwortet `/api/ink` mit `503 {"error":"no_key"}`, die App zeigt „KI nicht eingerichtet“.

Schutz: Rate-Limit 5 Anfragen pro Minute und IP (`INK_LIMIT` in `wrangler.jsonc`).
