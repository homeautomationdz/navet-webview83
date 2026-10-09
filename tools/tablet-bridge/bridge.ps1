# Tablet bridge: drop "<action>.request" into the queue folder; the result is written to "<action>.result.txt".
# Only the fixed actions in actions.ps1 can run.
param([string]$Queue = (Join-Path $PSScriptRoot 'queue'))
New-Item -ItemType Directory -Force $Queue | Out-Null
$dir = $Queue
while ($true) {
  foreach ($f in Get-ChildItem $dir -Filter '*.request' -ErrorAction SilentlyContinue) {
    $name = $f.BaseName; Remove-Item $f.FullName -Force; $log = "$dir\$name.result.txt"
    try {
      . (Join-Path $PSScriptRoot 'actions.ps1')
      if ($actions.ContainsKey($name)) { & $actions[$name] *>&1 | Out-String | Set-Content -Encoding utf8 $log; "`nOK $(Get-Date -f s)" | Add-Content $log }
      else { "Unknown action $name" | Set-Content $log }
    } catch { "ERROR: $_" | Set-Content -Encoding utf8 $log }
  }
  Start-Sleep 2
}
