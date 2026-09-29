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
