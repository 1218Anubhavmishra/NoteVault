# Start the Android emulator without Android Studio.
# Default AVD is flutter_emulator (more reliable than Pixel_8_Pro_API_36 on this machine).
# Leaves the emulator running in its own window (safe to use Cursor while it boots).

$ErrorActionPreference = 'Stop'
$SDK = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }
$Emulator = Join-Path $SDK 'emulator\emulator.exe'
$Adb = Join-Path $SDK 'platform-tools\adb.exe'

if (-not (Test-Path $Emulator)) {
  throw "Emulator not found. Install Android SDK / emulator via sdkmanager or Android Studio once."
}

$Avd = if ($args.Count -gt 0) { $args[0] } else { 'flutter_emulator' }

$ErrorActionPreference = 'Continue'
& $Adb start-server 2>&1 | Out-Null
$running = & $Adb devices 2>$null | Select-String 'emulator-\d+\s+device'
$ErrorActionPreference = 'Stop'
if ($running) {
  Write-Host 'An emulator is already running:'
  & $Adb devices -l
  exit 0
}

Write-Host "Starting AVD: $Avd"
Start-Process -FilePath $Emulator -ArgumentList @(
  '-avd', $Avd,
  '-gpu', 'swiftshader_indirect',
  '-no-snapshot-load',
  '-no-boot-anim'
)

Write-Host 'Emulator window opening. When the home screen appears, run:'
Write-Host '  .\install-sideload.ps1'
Write-Host '(install-sideload waits until Android package services are ready — do not rush.)'
