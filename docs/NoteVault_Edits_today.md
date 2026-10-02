---
title: NoteVault — Edits today (2026-09-28 to 2026-10-02)
---

## 2026-10-02: speaker labels, sound tags, account deletion, MP4 fallback

The same changes were made in voiceVault (shared frontend and backend) and copied here.

- **Speaker labels**: note transcription now asks ElevenLabs Scribe to tell speakers apart (`diarize`). Each line of the transcript starts with "Speaker 1:", "Speaker 2:" and so on, and each saved segment remembers its speaker (`segments_json` and the new `note_segments.speaker` column). Search queries and the live preview are not labelled.
- **Renaming speakers**: after "Full preview" a "Speakers" box lists each speaker with an editable name (for example "Speaker 1" to "David"); the transcript updates as you type. Saved notes have the same box in Edit mode, and the server renames the speaker everywhere in the note (`PATCH /api/notes/:id` with `speakers`).
- **Titles**: automatic titles (AI or heuristic) are made from the transcript without speaker labels and sound tags, then list every detected speaker, for example "Project Deadline Plan - Speaker 1, Speaker 2". Renaming a speaker also renames it in the title, wherever the name appears (including older titles that start with "Speaker 1").
- **Sound tags**: Scribe also adds tags such as "(laughter)" or "(music)" to note transcripts (`tag_audio_events`). It doesn't name specific instruments.
- **In-app account deletion** (required by Google Play and the App Store): Profile has a "Delete account" section. After the password is confirmed, the account, all notes, drafts, folders, tags, saved searches, audio and the profile picture are removed and the app signs out. Sessions on other devices stop working.
- **MP4 recording fallback**: devices that can't record WebM/Opus (older iPhones) record MP4 (AAC) instead, uploaded as `.m4a`.
- **Builds**: Android release + debug, Windows and Linux rebuilt with these changes; run the Codemagic workflows for iOS, macOS and the AppImage.

## Session summary (2026-09-28 to 2026-10-01)

- **Auto-sync**: the app's saved-notes list now refreshes on its own (every 15 s and when returning to the app) when notes change on the website or localhost — no relaunch needed. Paused while searching, editing, or playing audio.
- **Target Android 16**: compile/target SDK raised to API 36 for Google Play.
- **Signing key**: created `android-signing\notevault-upload.jks` + `keystore.properties` and wired release signing into Gradle; folder is git-ignored and must be backed up.
- **Release build**: new `build-release.ps1` produces `release\NoteVault-release.aab` (Play upload) and `release\NoteVault-release.apk` (direct install), both signature-verified; version 1.0 (code 1).
- **Reports**: renamed the copied voiceVault reports to `NoteVault_*.md` and rewrote them for the Android app.
- **Screenshots**: captured 5 emulator screenshots into `images/` (home, expanded note, search, new note, help) and added them to the reports.
- **Bar spacing fix**: content no longer runs under the status bar / navigation bar (native margins + 5 px app-only padding + matching bar colour); screenshots retaken after the fix.
- **First-search speed**: backend now warms the embedding model on start, the Docker image includes the model, and chunks are embedded after transcription before the note is saved as ready (web commit `e44a5b0`, pushed; copied here).
- **GitHub**: pushed to `1218Anubhavmishra/NoteVault`, made public on 2026-09-29 (README marks it as the app version of voiceVault; signing key, `.env`, APK/AAB excluded).
- **Repo public**: `1218Anubhavmishra/NoteVault` is now public.
- **iOS platform**: installed `@capacitor/ios` 7.6.9, added `ios/` (Swift Package Manager, bundle id `xyz.voicevault.app`), microphone usage text in `Info.plist`, `npm run cap:sync:ios`. Build needs a Mac / Codemagic.
- **Electron**: installed Electron 44; `electron/main.cjs` serves `public/` at `https://localhost` so the live backend works unchanged; `npm run desktop` opens the desktop app (login screen verified).
- **Codemagic**: connected to `1218Anubhavmishra/NoteVault`; added `codemagic.yaml`. First `ios-simulator-build` run succeeded (Mac mini M2, ~1.5 min, artifact `NoteVault-simulator.zip` 1.56 MB). `ios-release` still needs an Apple Developer account + App Store Connect key.
- **iOS live testing**: Appetize rejected (free plan 30 min/month, 3-min sessions, browser only). Added `ios-simulator-vnc` Codemagic workflow: builds, boots an iPhone simulator, installs + launches NoteVault, then waits up to 30 min for a VNC connection (uses Codemagic's 500 free M2 minutes/month).
 - **iOS login fixes**: form fields are 16px on touch screens (iOS was zooming in on focus, making the login card look oversized and cut off). Login failed with AUTH_REQUIRED because WKWebView blocked the `api.voicevault.xyz` session cookie as third-party; the iOS app now loads from `capacitor://app.voicevault.xyz` (`ios-config.mjs`, run by `npm run cap:sync:ios`), added to `WKAppBoundDomains` and the server CORS allowlist.
 - **2026-10-01 builds**: rebuilt the signed Android release (AAB + APK) and debug APK with all fixes; collected everything in `builds/` (git-ignored, see `builds/README.txt`). Added electron-builder: `npm run desktop:win` makes a Windows installer and portable .exe (unsigned); new Codemagic workflow `macos-desktop` makes an unsigned universal macOS .dmg. `npm run desktop:linux` makes a Linux .tar.gz (the AppImage target needs Windows Developer Mode for symlinks).
 - **Reminders**: take the login screenshot when it next appears; test panel × buttons on a physical phone.
- **Still to do before Play launch**: privacy policy, Data safety form, custom app icon + store graphics (in-app account deletion was added on 2026-10-02).

## Technology and build map (2026-10-01)

The voiceVault website and the NoteVault apps share one frontend (`public/`) and one backend (`api.voicevault.xyz`). Each build wraps the same frontend with a different technology. The app wrappers (Capacitor, Electron) live in the NoteVault project (`D:\Projects\NoteVault`, GitHub `1218Anubhavmishra/NoteVault`). The backend calls **ElevenLabs Scribe** to turn recorded audio into text (word timestamps, language detection, who spoke each line, and sound tags such as laughter or music; `server/elevenlabs-stt-vv.js`, key `ELEVENLABS_API_KEY`). A local faster-whisper model is an optional alternative (`VOICEVAULT_STT_PROVIDER=whisper`). OpenAI generates note titles and quick answers when `OPENAI_API_KEY` is set, SMTP email sends password-reset codes, and ffmpeg prepares audio before transcription. Search embeddings run locally on the server (transformers.js), so search needs no external API.

```mermaid
flowchart LR
  subgraph Shared["Shared code"]
    FE["Frontend: public/<br/>HTML + CSS + JavaScript"]
    BE["Backend: server/<br/>Node.js + Express<br/>PostgreSQL, search embeddings<br/>(transformers.js)"]
  end

  subgraph External["External services used by the backend"]
    EL["ElevenLabs Scribe<br/>speech-to-text, speaker labels,<br/>sound tags (laughter, music)"]
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
