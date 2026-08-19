# Lwin Car Info Notes PWA

A private, installable car information notes app with instant search, editing, press-and-hold deletion, offline support, automatic on-device saving, and external backup/restore through iCloud Drive or Files.

## Back up and restore

Use **Backup to Files** to export a dated JSON backup through the iPhone share sheet, then choose **Save to Files** and select iCloud Drive. Use **Restore backup** to select that file on this or another iPhone. Restoring merges the backup with any existing notes.

## Run locally

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

1. Create a GitHub repository and upload this project's files.
2. Open **Settings → Pages** in the repository.
3. Under **Build and deployment**, select **GitHub Actions**.
4. Push to the `main` branch. The included workflow will build and publish the app.

## Install on iPhone

1. Open the published GitHub Pages URL in **Safari**.
2. Tap the **Share** button.
3. Choose **Add to Home Screen**, then tap **Add**.

Notes are stored in the browser on that device. Clearing Safari website data will remove them.
