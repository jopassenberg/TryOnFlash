# Snap Body Mesh – Proof of Concept

Ziel: Prüfen, ob Snaps Body Mesh den Arm deutlich besser trackt als unser MediaPipe-Ansatz.
Dafür eine Lens mit **Upper Body Mesh** und einem fest eingebauten Test-Tattoo bauen und über
**Camera Kit Web** auf der Seite `/snap` laden.

Live: https://tryonflash.jopassenberg.workers.dev/snap

## 1. Accounts (machst du)

1. **Snapchat-Account**: ein normaler, kostenloser Account reicht.
2. **Snap Developer Portal / My Lenses**: mit dem Snapchat-Account anmelden
   (https://my-lenses.snapchat.com) und eine **Organisation** anlegen.
3. **Camera-Kit-App** in der Organisation anlegen. Danach siehst du dort:
   - den **API Token** – für den Test den **Staging-Token** nehmen.
     Der Production-Token funktioniert erst nach einer Freigabe durch Snap (sonst Fehler 401).
   - den Bereich **Lens Groups**: eine Lens Group anlegen.
4. **Lens Studio** (Mac-App, kostenlos) installieren und mit demselben Account anmelden.

Kosten: Snap hat bisher angegeben, Camera Kit nicht zu berechnen. Bitte im Portal prüfen, ob das noch gilt.

## 2. Lens bauen (Lens Studio, ca. 30 Min.)

1. Neues Projekt anlegen.
2. **Upper Body Mesh** hinzufügen (Szene → „+“ → Body/Upper Body Mesh bzw. Body-Mesh-Template).
   Doku: https://developers.snap.com/lens-studio/features/ar-tracking/body/upper-body-tracking
3. Aus der Doku die **Referenz-UV-Map** herunterladen. Das ist die „ausgerollte“ Haut des Meshes.
4. In einem Bildprogramm auf diese UV-Map an die Stelle des **Unterarms** ein Flash legen,
   Rest transparent lassen, als PNG speichern.
5. Das PNG importieren und als Textur auf das Material des Upper Body Mesh legen
   (Uber-PBR- oder Unlit-Material, Blend Mode „Normal“ bzw. „Multiply“ für Tinten-Look).
6. Optional: **Body Segmentation** als Maske, damit das Tattoo unter Kleidung verschwindet.
7. In der Vorschau mit Webcam testen.
8. **Publish / Push to My Lenses** und die Lens in deiner **Lens Group** in der Camera-Kit-App eintragen.

## 3. Testen

1. https://tryonflash.jopassenberg.workers.dev/snap öffnen.
2. **API Token (Staging)**, **Lens Group ID** und **Lens ID** eintragen → Speichern.
   Die Werte bleiben nur in deinem Browser (localStorage), sie landen nicht im Repo.
3. **Kamera starten**, Arm ins Bild, Handfläche drehen, Arm bewegen.

Fehlermeldungen auf der Seite:

| Meldung | Ursache |
|---|---|
| Keine Antwort von Snap (401) | Token falsch oder Production-Token ohne Freigabe |
| Lens nicht geladen | Lens ID / Lens Group ID falsch, Lens nicht in der Gruppe |
| Kein Kamerazugriff | Kamera im Browser erlauben |

## 4. Wenn es überzeugt: nächste Stufe

- Hochgeladene Flashes zur Laufzeit in die Lens schicken: über die **Remote API**
  (Lens fragt beim Start das Flash-Bild an, die Seite antwortet mit den Bilddaten).
  Dafür braucht die Lens eine *RemoteServicesModule API Spec* (im Portal anlegen, Plattform CAMERA_KIT).
  Doku: https://developers.snap.com/camera-kit/integrate-sdk/web/guides/remote-api
- Position, Größe und Drehung als **Launch-Parameter** an die Lens übergeben
  (Zahlen/Strings, max. 3 KB), damit unser Steuerfeld weiter funktioniert.

## Technik auf der Seite

- `@snap/camera-kit` 1.22.0 über esm.sh (gebündelt, weil das SDK CommonJS-Abhängigkeiten hat).
- Kamera in 4:3 (1280×960), Frontkamera gespiegelt, Kamera-Wechsel oben rechts.
- Unterstützt laut Snap: Chrome ≥ 95, Safari ≥ 16, Edge ≥ 79 (Firefox noch nicht offiziell).
