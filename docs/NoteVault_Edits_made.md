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
- **Speaker labels and sound tags (2026-10-02)**: note transcription asks ElevenLabs Scribe for speakers (`diarize`) and sound tags (`tag_audio_events`). Transcripts are written as "Speaker N: …" lines, each segment stores its speaker (new `note_segments.speaker` column), and speakers can be renamed in the "Speakers" box after Full preview or in Edit mode (`PATCH /api/notes/:id` with `speakers`).
- **Titles (2026-10-02)**: automatic titles skip speaker labels and sound tags and end with the detected speakers ("Topic - Speaker 1, Speaker 2"); renaming a speaker updates the title.
- **Account deletion (2026-10-02)**: Profile → Delete account; `POST /api/auth/delete-account` checks the password, deletes all the user's data and audio, and signs out. Other devices are signed out because `requireUser` checks the account still exists.
- **MP4 fallback (2026-10-02)**: recording falls back to MP4/AAC when WebM isn't supported; files are named `.m4a`. In this project the audio download keeps using `vvApiUrl()`.
- **Login limit (2026-10-02)**: 3 failed logins per email, then a 30 s block (HTTP 429 `too_many_attempts` with `retry_after`), repeating; the login form counts down. Also applied to the reset code and the delete-account password.
- **Offline recording (2026-10-02)**: offline saves go to IndexedDB and upload through `POST /api/notes` when the connection returns (also every 60 s and at login). The last session user is cached so the app can open offline.
- **Reminders (2026-10-02)**: new `notes.reminder_at` column and `GET /api/reminders`; notes offer a Google Calendar link and an `.ics` file. The apps schedule phone notifications with `@capacitor/local-notifications` (added to `package.json`, synced to Android and iOS).
- **Export (2026-10-02)**: `GET /api/export/notes.zip` (`archiver`) with title-named `.txt` and audio files; the Profile button uses `vvApiUrl()` here.
- **Search highlight, Newest label, job titles (2026-10-02)**: searched words are highlighted directly (the "eyes" bug); the newest note shows a "Newest" label; background-job titles strip speaker labels read from the transcript.

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
- **Share a note (2026-10-07)**
  - Audio is shared as the file itself: `@capacitor/filesystem` (7.1.9) writes it to the cache folder (`share/<title>.<ext>`) and `@capacitor/share` (7.0.4) shares its URI; Android's FileProvider already covers `cache-path`. Gmail and WhatsApp open this share sheet with the file attached; More… opens it too.
  - Desktop share menu: `electron/preload.cjs` exposes `window.vvDesktop` (`canShareFiles`, `share({title, text, file})`). The main process checks the caller is `https://localhost`, writes the file to `%TEMP%/NoteVault-share` (cleared on start, unsafe name characters replaced) and opens the Windows share sheet via `electron-native-share` 0.1.1 (WinRT `DataTransferManager`, prebuilt N-API binary, unpacked from the asar) or Electron's `ShareMenu` on macOS. Linux has no share sheet, so Gmail/WhatsApp download the file and open the compose link there; Electron passes `window.open` to the default browser. Transcript-only Gmail/WhatsApp links in the Capacitor apps navigate so Android/iOS hand them to the app.
  - Audio and Both appear only when `vvCanShareAudio()` is true (Capacitor native, or `window.vvDesktop` in Electron); on the website the mode row is hidden and only the transcript is shared.
  - The earlier public share links (`/api/share/<token>`) are removed from the server; the `note_shares` table is dropped on start.
- **App icon (2026-10-07)**
  - Sources: `images/notevault-icon.svg` (full icon, white background) and `images/notevault-icon-logo.svg` (artwork only).
  - `npm run icons` (`scripts/build-icons.cjs`, `sharp` + dev dependency `@capacitor/assets`) writes `public/favicon.svg`, `public/icons/icon-{32,192,512}.png`, `public/apple-touch-icon.png`, `build/icon.png` (picked up by electron-builder) and all Android mipmaps/splashes (incl. night) and iOS AppIcon/splash images. The artwork is padded to 780/1024 so iOS corners and Android masks don't clip it; splash logo scale 0.45 (Android) / 1000 px wide (iOS).
  - The Electron window uses `public/icons/icon-512.png`.

## Release preparation (Google Play)

- Target / compile SDK raised from 35 to **36** (Play requirement).
- Created upload key `android-signing\notevault-upload.jks` + `keystore.properties`; wired into `android\app\build.gradle` release signing.
- `.gitignore`: ignores `android-signing/`, `release/`, `*.jks`, `*.keystore`.
- `build-release.ps1`: builds signed `release\NoteVault-release.aab` and `release\NoteVault-release.apk`; signatures verified.

## Technology and build map (2026-10-01)

The voiceVault website and the NoteVault apps share one frontend (`public/`) and one backend (`api.voicevault.xyz`). Each build wraps the same frontend with a different technology. The app wrappers (Capacitor, Electron) live in the NoteVault project (`D:\Projects\NoteVault`, GitHub `1218Anubhavmishra/NoteVault`). The backend calls **ElevenLabs Scribe** to turn recorded audio into text (word timestamps, language detection, who spoke each line, and sound tags such as laughter or music; `server/elevenlabs-stt-vv.js`, key `ELEVENLABS_API_KEY`). A local faster-whisper model is an optional alternative (`VOICEVAULT_STT_PROVIDER=whisper`). OpenAI generates note titles and quick answers when `OPENAI_API_KEY` is set, SMTP email sends password-reset codes, and ffmpeg prepares audio before transcription. Search embeddings run locally on the server (transformers.js), so search needs no external API.

```mermaid
flowchart LR
  subgraph Shared["Shared code"]
    FE["Frontend: public/<br/>HTML + CSS + JavaScript<br/>offline recording queue (IndexedDB)"]
    BE["Backend: server/<br/>Node.js + Express<br/>PostgreSQL, search embeddings<br/>(transformers.js), zip export (archiver)"]
    ICON["App icon: images/notevault-icon.svg<br/>npm run icons (@capacitor/assets, sharp)<br/>icons, splash screens, favicon"]
  end

  subgraph External["External services"]
    EL["ElevenLabs Scribe<br/>speech-to-text, speaker labels,<br/>sound tags (laughter, music)"]
    OAI["OpenAI<br/>AI note titles, quick answers"]
    SMTP["Email (SMTP)<br/>password-reset codes"]
    FF["ffmpeg<br/>audio preprocessing"]
    CAL["Calendars<br/>Google Calendar link, .ics file<br/>(opened from a note's reminder)"]
    SHR["Sharing<br/>Gmail, WhatsApp, copy, system share sheet<br/>(transcript; the audio file itself in the apps only)"]
  end

  subgraph Wrappers["Wrapper technology"]
    WEB["Browser<br/>(no wrapper)"]
    CAPA["Capacitor 7 + Local Notifications + Share + Filesystem<br/>+ Gradle, Android SDK 36, JDK 22"]
    CAPI["Capacitor 7 + Local Notifications + Share + Filesystem<br/>+ Xcode, Swift Package Manager"]
    ELE["Electron 44 + electron-builder<br/>share menu: electron-native-share (Windows),<br/>ShareMenu (macOS)"]
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
  FE -.-> CAL
  FE -.-> SHR
  ICON -.-> WEB
  ICON -.-> CAPA
  ICON -.-> CAPI
  ICON -.-> ELE
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
