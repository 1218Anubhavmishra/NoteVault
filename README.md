# NoteVault — Android app version of voiceVault

NoteVault is the **mobile app build of [voiceVault](https://github.com/1218Anubhavmishra/voiceVault)**. It wraps the voiceVault web UI (`public/`) in a native Android app with [Capacitor](https://capacitorjs.com/) and uses the same live backend (`https://api.voicevault.xyz`), so accounts and notes are shared with the website.

- Package id: `xyz.voicevault.app` · Target: Android 16 (API 36), min Android 6 (API 23)
- Backend / website changes belong in the voiceVault repo; this repo holds the app shell and app-specific frontend tweaks (`public/mobile-api.js`, API URL handling, auto-sync, system-bar spacing).
- Details: `docs/NoteVault_project-report.md` · Change log: `docs/NoteVault_Edits_made.md`

| Home | Note | Search |
| :-: | :-: | :-: |
| ![Home](images/notevault-01-home.png) | ![Note](images/notevault-02-note-open.png) | ![Search](images/notevault-03-search.png) |

## Build the Android app (Windows)

Requires JDK 22, Android SDK (API 36), Node.js 20+. Run `npm install` once.

```powershell
.\start-emulator.ps1      # start the flutter_emulator virtual device
.\build-android.ps1       # debug APK -> NoteVault-debug.apk
.\install-sideload.ps1    # install + launch on the emulator
.\build-release.ps1       # signed release -> release\NoteVault-release.aab / .apk
```

Release signing needs `android-signing\notevault-upload.jks` + `keystore.properties`, which are **not** in this repo (kept offline).

## iOS (Capacitor, Swift Package Manager)

The Xcode project is in `ios/App` (bundle id `xyz.voicevault.app`). Building requires macOS + Xcode (or a cloud Mac such as Codemagic):

```bash
npm ci
npm run cap:sync:ios    # copies public/ into the iOS project and sets the iOS origin to capacitor://app.voicevault.xyz (needed for login cookies)
open ios/App/App.xcodeproj
```

## Desktop (Electron)

```powershell
npm run desktop         # opens NoteVault in a desktop window
npm run desktop:win     # builds/desktop: NoteVault-Setup-<version>.exe + NoteVault-Portable-<version>.exe
npm run desktop:linux   # builds/desktop: NoteVault-<version>-linux-x64.tar.gz (the AppImage is built by the Codemagic macos-desktop workflow)
```

`electron/main.cjs` serves `public/` at `https://localhost` (the same origin as the Android app), so it talks to the live backend with no server changes. electron-builder packages only `electron/` and `public/`. The installers are not code-signed, so Windows SmartScreen warns on first run (More info > Run anyway).

macOS and Linux AppImage: run the Codemagic workflow **macOS desktop app (unsigned .dmg) + Linux AppImage** (`npm run desktop:mac` only works on a Mac, and the AppImage packing tool doesn't exist for Windows). The .dmg is universal (Apple silicon + Intel) and unsigned: right-click the app > Open the first time.

---

# voiceVault (web app, original README)

Local audio recording + storage app with cross-note search (audio-only).

## What it does

- Record audio in your browser (MediaRecorder)
- Upload and store audio files locally
- Auto-transcribe audio offline (faster-whisper) and store transcript in SQLite (notes show as **processing** until ready)
- Search across all notes by recording a short audio query (also transcribed offline)
- Jump + play **timestamped segments** from saved transcripts (clip-style playback)
- Search supports **natural language** + **time filters** (e.g. `yesterday`, `last 3 days`, `2026-04-22`)
- Search is **hybrid by default**: keyword matching + local semantic retrieval over transcript segments.
- The left column is organized into **New note**, **Processes**, and **Help**. Opening any left window restores a **50/50** split; collapsing makes Search wider. Only one window can be open at a time (mutually exclusive). On load, all three start collapsed by default; if any note is in **error**, **Processes** auto-opens (and the Processes card otherwise stays hidden unless there are failures).
- In **Help**, opening **App hint** or **UI steps** triggers the **50/50** split (no extra Help Show/Hide button).

## Run locally

Prereqs: **Node.js 22 LTS (recommended)**, Python 3.10+, ffmpeg (on PATH)

1) Install transcription dependencies:

```powershell
.\scripts\install-ffmpeg.ps1
.\scripts\setup-transcription.ps1
```

```bash
npm install
npm run dev
```

Then open `http://localhost:5177`.

## Publish to your GitHub (1218nubhavmishra)

From the project folder in PowerShell:

```powershell
.\scripts\publish-to-github.ps1
```

## Data storage

- Audio: stored in SQLite as a BLOB (new notes), with backward compatibility for older notes that used `data/audio/`
- SQLite DB: `data/voicevault.sqlite`

Both are ignored by git.

## One-time migration (old audio files → SQLite BLOB)

If you have older notes where audio still exists in `data/audio/` and you want to import all of them into the DB in one shot, run:

```bash
node .\scripts\migrate-audio-files-to-blob.mjs
```

To delete the old `data/audio/*` files after they are imported:

```powershell
$env:DELETE_FILES=1
node .\scripts\migrate-audio-files-to-blob.mjs
```

## Backfill timestamped segments (existing notes)

New notes automatically store **timestamped segments** (for click-to-play transcript sections).

To generate timestamps for older notes that were saved before this feature:

```bash
node .\scripts\backfill-note-timestamps.mjs
```

Optional:

- **Limit work**: `LIMIT=25 node .\scripts\backfill-note-timestamps.mjs`
- **Choose model**: `WHISPER_MODEL=tiny node .\scripts\backfill-note-timestamps.mjs`

## Troubleshooting

- If notes get stuck on **processing**, check the server console output.
- If transcription fails:
  - Ensure `ffmpeg` is on PATH (`ffmpeg -version`)
  - Ensure Python 3.10+ is on PATH (`python --version`)
  - Re-run `.\scripts\setup-transcription.ps1` (creates `.venv` and installs `faster-whisper`)
