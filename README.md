# Flash Try-On

Interaktiver Tattoo-Try-On-Prototyp: Flash-Motiv wählen, Kamera an, das Motiv wird per Body-Tracking (MediaPipe Pose + Hand) auf die Haut gelegt. Enthält einen Konverter, der Fotos von Flash-Sheets in transparente PNGs verwandelt.

- Alles läuft im Browser auf dem Gerät, keine Bilder verlassen das Handy.
- Kein Build-Schritt: `index.html` ist die ganze App.

## Lokal starten

```bash
python3 -m http.server 5173
```

Dann http://localhost:5173 öffnen.

## Deployment

Cloudflare Pages ist mit diesem Repo verbunden (Framework: None, kein Build-Befehl, Ausgabeordner `/`). Jeder Push auf `main` wird automatisch veröffentlicht.
