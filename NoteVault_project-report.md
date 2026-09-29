---
title: NoteVault — Project Report (Android App)
date: 2026-09-29
repo: GitHub 1218Anubhavmishra/NoteVault (private) · local D:\Projects\NoteVault
---

## 1) Executive summary

`NoteVault` is the **Android app** built from the voiceVault web app using **Capacitor**. It gives users the same experience as the website — record, transcribe, and search voice notes — on a phone, using the **same account, data, and backend** (`https://api.voicevault.xyz` on Render).

The package id (`xyz.voicevault.app`) and backend URL were deliberately kept the same as planned for voiceVault, so the app and website stay in sync and Render needs no separate setup.

## 1.1) Screenshots (Android emulator, 2026-09-29)

Captured from the debug build running on the `flutter_emulator` virtual device (Android 15, 1080×1920), after the status/navigation bar spacing fix. Login screen: pending (see section 11).

| Saved notes (home) | Note expanded | Search result |
| :-: | :-: | :-: |
| ![NoteVault home screen with saved notes](screenshots/notevault-01-home.png) | ![Expanded note with playback, edit, download and delete](screenshots/notevault-02-note-open.png) | ![Search for "Eyes" with matching words highlighted](screenshots/notevault-03-search.png) |

| New note | Help |
| :-: | :-: |
| ![New note panel with record button and audio file picker](screenshots/notevault-04-add-new.png) | ![In-app help text](screenshots/notevault-05-help.png) |

## 2) Scope (what it is / isn't)

- **Is**: A sideloadable and Play-Store-ready Android app wrapping the voiceVault UI, talking to the live Render backend.
- **Is not**: An offline app, a separate backend, or (yet) an iOS / desktop app.

## 3) How it relates to the voiceVault web project

| | voiceVault (web) | NoteVault (Android) |
| :-- | :-- | :-- |
| Location | `C:\Users\anubh\.cursor\projects\empty-window\voiceVault` | `D:\Projects\NoteVault` |
| Git | GitHub `1218Anubhavmishra/voiceVault` | GitHub `1218Anubhavmishra/NoteVault` (private) |
| Frontend host | Vercel (`www.voicevault.xyz`) | Inside the APK (`https://localhost` in the WebView) |
| Backend | Render (`api.voicevault.xyz`) | Same Render backend |
| Database | Render PostgreSQL | Same database |

Changes to the backend are made and pushed in the **web project**; NoteVault only changes the app shell and app-specific frontend code.

## 4) Current feature set

### Notes
- Record audio in the app (microphone permission) and save as a note.
- Server-side transcription with timestamped segments; notes show `processing` → `ready` (or `error`).
- Play full audio or individual segments; download audio.
- Edit title/transcript, delete, retry; star and pin to the top.
- Folders, tags, saved searches.

### Search
- Text and voice search, hybrid keyword + semantic retrieval.
- Natural-language queries and date filters (`yesterday`, `last 3 days`, etc.).
- Quick answer box (extractive, or OpenAI when configured on the server).

### Accounts
- Register / login with email + password; forgot-password via email OTP.
- Profile name and avatar.

### App-specific
- **Auto-sync**: every 15 s (and on returning to the app) the note list is compared with the server and re-rendered only when changed; paused while searching, editing, or playing audio.
- **API routing**: all API calls, audio, avatar, and download URLs point at the live backend.

## 5) Architecture and data flow

- **App shell**: Capacitor 7; WebView loads `public/` from inside the APK at origin `https://localhost`.
- **`public/mobile-api.js`**: sets `window.VV_API_BASE = 'https://api.voicevault.xyz'` and rewrites `fetch('/api/...')` to that host.
- **`public/main.js`**: uses `VV_API_ORIGIN` / `vvApiUrl()` so absolute URLs also go to the backend.
- **Login cookie**: the backend sets `vv_session` as `SameSite=None; Secure` when `VOICEVAULT_CROSS_SITE_COOKIES=1` (set on Render), so the cookie works from the app's `https://localhost` origin. CORS allows only listed origins.

## 6) Tech stack

- Capacitor 7 (`@capacitor/core`, `@capacitor/android`, `@capacitor/cli`)
- Android SDK: compile/target API 36, min API 23; Android Gradle Plugin 8.7.2
- JDK 22 (`C:\Program Files\Java\jdk-22`)
- Backend: Node.js + Express, PostgreSQL, ElevenLabs / Whisper STT, optional OpenAI + Pinecone

## 7) Build, sign, install

| Script | Purpose |
| :-- | :-- |
| `start-emulator.ps1` | Start the `flutter_emulator` AVD (swiftshader GPU, no snapshot) |
| `build-android.ps1` | Sync web files + build `NoteVault-debug.apk` |
| `install-sideload.ps1` | Wait for full boot, install, launch |
| `launch-on-emulator.ps1` | Install if missing + launch |
| `build-release.ps1` | Signed `release\NoteVault-release.aab` + `.apk` |

**Signing**: `android-signing\notevault-upload.jks` + `keystore.properties` (password). Referenced by `android\app\build.gradle`. Ignored by `.gitignore`. **Back up both files off this PC.**

**Updates**: increase `versionCode` / `versionName` in `android\app\build.gradle` before each release build.

## 8) Test plan (quick)

- Log in with an existing web account → notes list matches the website.
- Record → save → note goes `processing` → `ready`.
- Delete / add a note on the website → app updates within ~15 s without relaunch.
- Play audio, play a segment, download audio.
- Log out / log in again.

## 9) Publishing checklist

### Google Play
- Play Console account ($25 one-time); new personal accounts need a 12-tester, 14-day closed test.
- Privacy policy URL; Data safety form (audio, email, notes).
- **In-app account deletion** (not implemented yet — required).
- 512×512 icon, feature graphic, screenshots; replace the default Capacitor launcher icon.

### Apple (future)
- Add `@capacitor/ios` (`npx cap add ios`) in this same project.
- Build on a Mac or cloud Mac (e.g. Codemagic); Apple Developer Program ($99/yr).
- Add microphone usage description; account deletion also required.

### Desktop (future)
- Electron or Tauri wrapper in this same project for Windows `.exe`, Linux AppImage/.deb/Flatpak; Steam possible but a poor fit.

## 10) Known constraints

- Requires internet; no offline mode.
- Relies on Render backend + `VOICEVAULT_CROSS_SITE_COOKIES=1`.
- Build warns that AGP 8.7.2 is older than compileSdk 36 (harmless).
- The first search used to take ~40 s after a server restart (model download/load + lazy chunk embedding); fixed in section 12. Notes saved before the fix are still embedded on their first search.

## 11) Open reminders

- **Login screenshot**: not captured yet (the app stayed logged in). Take it the next time the login screen appears and add it to section 1.1.
- **Panel close (×) buttons**: work with a mouse on the emulator, but automated taps did not register. Test on a physical Android phone before release.

## 12) Speeding up first search

**Applied 2026-09-29** (web repo commit `e44a5b0`, copied into this project's `server/` and `Dockerfile`):
- The embedding model is loaded as soon as the server starts (`warmupEmbedder()` in `server/embeddings.js`, called after `app.listen`); Render logs show `[semantic] embedding model ready in … ms`.
- The Docker build downloads the model into `/app/.model-cache` (`VOICEVAULT_MODEL_CACHE_DIR`), so restarts don't re-download it.
- `ensureNoteChunks` embeds a note's chunks right after transcription, before the note is marked ready; if embedding fails, the note still saves and search embeds it later.

Other options below are not applied.

Causes: the embedding model is fetched from Hugging Face and loaded only when the first search arrives (and again after every Render restart/deploy); older note chunks are embedded lazily during that search.

| Option | Where | Effect |
| :-- | :-- | :-- |
| Warm up the embedding model right after the server starts | backend (`server/index.js`) | First user search no longer pays the model load |
| Download the model into the Docker image at build time | `Dockerfile` | No download after restarts; only a few seconds to load |
| Embed chunks when a note finishes transcribing | backend ingestion | First search doesn't embed old chunks |
| Show keyword results first, add semantic results when ready | frontend | Results appear instantly |
| Warm-up request when the app/search opens | frontend | Hides remaining warm-up behind the user's typing |
| Keep the Render service from sleeping (paid instance) | Render | Avoids cold starts if on the free tier |
- The Pixel_8_Pro_API_36 emulator hangs during boot; use `flutter_emulator`.
- `android-signing\` (upload key) and `.env` are deliberately not in Git; back them up separately.
