# Fixed maintenance actions for the tablet (reloaded on every request). Edit $adb if adb.exe is not on PATH.
$adb   = if ($env:NAVET_ADB) { $env:NAVET_ADB } else { 'adb' }
$kiosk = 'me.jxl.kiosk_satellite'
$actions = @{
  'status' = { & $adb devices -l; & $adb shell dumpsys power | Select-String 'mWakefulness'; & $adb shell dumpsys activity activities | Select-String 'mResumedActivity' }
  'screen' = { & $adb shell input keyevent KEYCODE_WAKEUP; Start-Sleep 2; & $adb shell screencap -p /sdcard/navet.png; & $adb pull /sdcard/navet.png "$dir\screen.png" }
  'home'   = { & $adb shell input keyevent KEYCODE_HOME }
  'reboot' = { & $adb reboot; Start-Sleep 5; & $adb wait-for-device; for ($i = 0; $i -lt 40; $i++) { if ((& $adb shell getprop sys.boot_completed).Trim() -eq '1') { break }; Start-Sleep 3 }; Start-Sleep 25; & $adb shell input keyevent KEYCODE_HOME; 'boot completed' }
  'webviewversion' = { & $adb shell dumpsys webviewupdate | Select-String 'Current WebView package' }
  'seq' = {
    & $adb shell input keyevent KEYCODE_WAKEUP
    foreach ($line in Get-Content "$dir\seq.txt") {
      $p = $line.Trim() -split '\s+', 2; if (-not $p[0]) { continue }
      switch ($p[0]) {
        'tap'   { $a = $p[1] -split '\s+'; & $adb shell input tap $a[0] $a[1] }
        'swipe' { $a = $p[1] -split '\s+'; & $adb shell input swipe $a[0] $a[1] $a[2] $a[3] $a[4] }
        'down'  { $a = $p[1] -split '\s+'; & $adb shell input motionevent DOWN $a[0] $a[1] }
        'move'  { $a = $p[1] -split '\s+'; & $adb shell input motionevent MOVE $a[0] $a[1] }
        'up'    { $a = $p[1] -split '\s+'; & $adb shell input motionevent UP $a[0] $a[1] }
        'text'  { if ($p[1] -match '^[A-Za-z0-9]+$') { & $adb shell input text $p[1] } }
        'key'   { & $adb shell input keyevent $p[1] }
        'sleep' { Start-Sleep -Milliseconds ([int]([double]$p[1] * 1000)) }
        'shot'  { if ($p[1] -match '^[\w-]+$') { New-Item -ItemType Directory -Force "$dir\shots" | Out-Null; & $adb shell screencap -p /sdcard/s.png; & $adb pull /sdcard/s.png "$dir\shots\$($p[1]).png" | Out-Null } }
      }
      "done: $line"
    }
  }
}
