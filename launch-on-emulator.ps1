$ErrorActionPreference = 'Stop'
$SDK = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }
$Adb = Join-Path $SDK 'platform-tools\adb.exe'
$Apk = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'NoteVault-debug.apk'

Write-Host 'Waiting for emulator...'
& $Adb wait-for-device
for ($i = 0; $i -lt 60; $i++) {
  $boot = (& $Adb shell getprop sys.boot_completed 2>$null).Trim()
  if ($boot -eq '1') { break }
  Start-Sleep -Seconds 2
}

$installed = (& $Adb shell pm path xyz.voicevault.app 2>$null)
if (-not $installed) {
  Write-Host 'Installing APK...'
  & $Adb install -r $Apk
}

Write-Host 'Launching NoteVault...'
& $Adb shell am start -n xyz.voicevault.app/.MainActivity
& $Adb devices -l
