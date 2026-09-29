# Build signed NoteVault release: AAB (upload to Google Play) + APK (direct install).
# Requires android-signing\keystore.properties + notevault-upload.jks (keep both backed up; never commit).
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-22'
$env:ANDROID_HOME = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME

if (-not (Test-Path (Join-Path $Root 'android-signing\keystore.properties'))) {
  throw 'Missing android-signing\keystore.properties - release builds must be signed with the upload key.'
}

Push-Location $Root
try {
  npm run cap:sync
  Push-Location android
  .\gradlew.bat bundleRelease assembleRelease --no-daemon --console=plain
  if ($LASTEXITCODE -ne 0) { throw "Gradle failed ($LASTEXITCODE)" }
  Pop-Location
  $out = Join-Path $Root 'release'
  New-Item -ItemType Directory -Force $out | Out-Null
  Copy-Item (Join-Path $Root 'android\app\build\outputs\bundle\release\app-release.aab') (Join-Path $out 'NoteVault-release.aab') -Force
  Copy-Item (Join-Path $Root 'android\app\build\outputs\apk\release\app-release.apk') (Join-Path $out 'NoteVault-release.apk') -Force
  Write-Host "Built: $out\NoteVault-release.aab (upload this to Play Console)"
  Write-Host "Built: $out\NoteVault-release.apk (direct install)"
} finally {
  Pop-Location
}
