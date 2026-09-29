# Sideload NoteVault debug APK onto a connected emulator/device.
# Waits until Android is fully booted (boot_completed + package manager),
# not merely until adb lists the device as "device" (that can be mid-boot).

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$SDK = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }
$Adb = Join-Path $SDK 'platform-tools\adb.exe'
$Apk = Join-Path $Root 'NoteVault-debug.apk'

if (-not (Test-Path $Adb)) { throw "adb not found at $Adb" }
if (-not (Test-Path $Apk)) { throw "APK not found at $Apk. Run: .\build-android.ps1" }

$ErrorActionPreference = 'Continue'
& $Adb start-server 2>&1 | Out-Null

Write-Host 'Waiting for device/emulator...'
& $Adb wait-for-device

Write-Host 'Waiting until Android finishes booting (package manager ready)...'
$ready = $false
for ($i = 0; $i -lt 120; $i++) {
  $boot = (& $Adb shell getprop sys.boot_completed 2>$null | Out-String).Trim()
  $svc = (& $Adb shell service check package 2>$null | Out-String).Trim()
  if ($boot -eq '1' -and $svc -eq 'Service package: found') {
    $ready = $true
    Write-Host "Ready after ~$($i * 3)s"
    break
  }
  if ($i -gt 0 -and ($i % 10) -eq 0) {
    Write-Host "  still waiting... boot=$boot svc=$svc"
  }
  Start-Sleep -Seconds 3
}

if (-not $ready) {
  throw @"
Emulator never finished booting (package service not ready).
Try:
  1) Close the emulator window
  2) .\start-emulator.ps1 flutter_emulator
  3) Wait for the home screen, then run this script again
If Pixel_8_Pro_API_36 hangs mid-boot, prefer flutter_emulator.
"@
}

# Brief settle after services report ready
Start-Sleep -Seconds 3

Write-Host "Installing $Apk ..."
& $Adb install -r $Apk
if ($LASTEXITCODE -ne 0) { throw "adb install failed (exit $LASTEXITCODE)" }

Write-Host 'Launching NoteVault...'
& $Adb shell am start -n xyz.voicevault.app/.MainActivity
Write-Host 'Done.'
