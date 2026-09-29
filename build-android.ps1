# Build NoteVault debug APK (sets JAVA_HOME / ANDROID_SDK_ROOT for this machine).
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-22'
$env:ANDROID_HOME = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME

Push-Location $Root
try {
  npm run cap:sync
  Push-Location android
  .\gradlew.bat assembleDebug --no-daemon --console=plain
  if ($LASTEXITCODE -ne 0) { throw "Gradle failed ($LASTEXITCODE)" }
  Pop-Location
  Copy-Item (Join-Path $Root 'android\app\build\outputs\apk\debug\app-debug.apk') (Join-Path $Root 'NoteVault-debug.apk') -Force
  Write-Host "Built: $Root\NoteVault-debug.apk"
} finally {
  Pop-Location
}
