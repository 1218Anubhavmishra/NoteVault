---
title: NoteVault — Edits made
---

## Project setup (Android app)

- **New project**
  - Copied the voiceVault web project to `D:\Projects\NoteVault` (originally `voiceVault-android`, renamed to NoteVault).
  - Added Capacitor 7 with the Android platform; app id `xyz.voicevault.app`, app name **NoteVault**, web assets from `public/`.
  - `capacitor.config.json`: `androidScheme: https`, navigation allowed to `*.voicevault.xyz`.
- **Android configuration**
  - Added `RECORD_AUDIO` and `MODIFY_AUDIO_SETTINGS` permissions.
  - App name set to NoteVault in `strings.xml`; `local.properties` points to the Android SDK.
  - Login screen text changed to NoteVault.
- **Scripts**
  - `build-android.ps1`: sets JAVA_HOME (JDK 22) and SDK paths, syncs, builds debug APK with `--no-daemon`.
  - `start-emulator.ps1`: starts `flutter_emulator` with `-gpu swiftshader_indirect -no-snapshot-load -no-boot-anim`.
  - `install-sideload.ps1`: waits for `sys.boot_completed` **and** the package service before installing, then launches.
  - `launch-on-emulator.ps1`: install-if-missing + launch.

## Backend fixes (made in the web project and pushed; copied here)

- **Render database recovery**: old Postgres was deleted (ENOTFOUND); new Render Postgres (Singapore) created and `DATABASE_URL` updated in both `.env` files and on Render.
- **Android login (`AUTH_REQUIRED`)**
  - Session cookie becomes `SameSite=None; Secure` + `trust proxy` only when `VOICEVAULT_CROSS_SITE_COOKIES=1` (set on Render; local http dev unaffected).
  - CORS restricted to an allowlist (voicevault.xyz domains, `https://localhost`, local dev) plus optional `VOICEVAULT_CORS_ORIGINS`.
  - Documented both variables in `.env.example`.
- **Empty library box**: "No saved notes yet" box restored to a light background with dark text.

## App-specific frontend fixes

- **Notes stuck on "Displaying Saved Notes…"**
  - `main.js` built API URLs from `window.location.origin` (`https://localhost` in the app), so requests never reached the backend.
  - Added `VV_API_PREFIX`, `VV_API_ORIGIN`, and `vvApiUrl()`; notes, semantic search, jobs, stop-all, audio, avatar, and download URLs now use the backend.
  - `mobile-api.js` also rewrites absolute `https://localhost/api/...` URLs.
- **Auto-sync without relaunch**
  - Every 15 s and on returning to the app, fetches `/api/notes`, compares id/updated_at/status/favorite, and re-renders only on change.
  - Skipped while searching, editing a note, or playing audio; only active inside the app.

- **Status / navigation bar spacing (Android 15+ edge-to-edge)**
  - `capacitor.config.json`: `android.adjustMarginsForEdgeToEdge: "auto"` — the WebView stops exactly at the system bars on any device.
  - Theme: cream background (`#F4EFE4`, same as the page) behind the bars, with dark status/navigation icons (`colors.xml`, `styles.xml`).
  - `mobile-api.js` adds a `vv-native-app` class; `styles.css` adds 5 px extra top/bottom page padding in the app only (website unchanged).
- **Build script**: `build-android.ps1` now stops when Gradle fails (previously it reported success and kept the old APK).

## Release preparation (Google Play)

- Target / compile SDK raised from 35 to **36** (Play requirement).
- Created upload key `android-signing\notevault-upload.jks` + `keystore.properties`; wired into `android\app\build.gradle` release signing.
- `.gitignore`: ignores `android-signing/`, `release/`, `*.jks`, `*.keystore`.
- `build-release.ps1`: builds signed `release\NoteVault-release.aab` and `release\NoteVault-release.apk`; signatures verified.

## Technology and build map (2026-10-01)

The voiceVault website and the NoteVault apps share one frontend (`public/`) and one backend (`api.voicevault.xyz`). Each build wraps the same frontend with a different technology. The app wrappers (Capacitor, Electron) live in the NoteVault project (`D:\Projects\NoteVault`, GitHub `1218Anubhavmishra/NoteVault`). The backend calls **ElevenLabs Scribe** to turn recorded audio into text (word timestamps and language detection; `server/elevenlabs-stt-vv.js`, key `ELEVENLABS_API_KEY`). A local faster-whisper model is an optional alternative (`VOICEVAULT_STT_PROVIDER=whisper`). OpenAI generates note titles and quick answers when `OPENAI_API_KEY` is set, SMTP email sends password-reset codes, and ffmpeg prepares audio before transcription. Search embeddings run locally on the server (transformers.js), so search needs no external API.

```mermaid
flowchart LR
  subgraph Shared["Shared code"]
    FE["Frontend: public/<br/>HTML + CSS + JavaScript"]
    BE["Backend: server/<br/>Node.js + Express<br/>PostgreSQL, search embeddings<br/>(transformers.js)"]
  end

  subgraph External["External services used by the backend"]
    EL["ElevenLabs Scribe<br/>speech-to-text (transcription)"]
    OAI["OpenAI<br/>AI note titles, quick answers"]
    SMTP["Email (SMTP)<br/>password-reset codes"]
    FF["ffmpeg<br/>audio preprocessing"]
  end

  subgraph Wrappers["Wrapper technology"]
    WEB["Browser<br/>(no wrapper)"]
    CAPA["Capacitor 7<br/>+ Gradle, Android SDK 36, JDK 22"]
    CAPI["Capacitor 7<br/>+ Xcode, Swift Package Manager"]
    ELE["Electron 44<br/>+ electron-builder"]
  end

  subgraph Builds["Build output, and where it's built"]
    W["Website: voicevault.xyz<br/>Vercel (frontend) + Render (Docker)"]
    A["Android: .aab (Play Store) and .apk<br/>built on Windows (build-release.ps1)"]
    I["iOS: simulator .zip, signed .ipa later<br/>built on a Codemagic cloud Mac"]
    D["Windows: Setup .exe + Portable .exe<br/>built on Windows (npm run desktop:win)"]
    M["macOS: .dmg<br/>built on a Codemagic cloud Mac"]
    L["Linux: .tar.gz built on Windows<br/>.AppImage built on a Codemagic cloud Mac"]
  end

  BE --> EL
  BE --> OAI
  BE --> SMTP
  BE --> FF
  FE --> WEB --> W
  FE --> CAPA --> A
  FE --> CAPI --> I
  FE --> ELE --> D
  ELE --> M
  ELE --> L
  BE -. "API calls from every build" .-> W
  BE -.-> A
  BE -.-> I
  BE -.-> D
  BE -.-> M
  BE -.-> L
```
