# Run once in an elevated PowerShell. Starts the bridge now and at every logon (hidden window).
$script = Join-Path $PSScriptRoot 'bridge.ps1'
$a = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`""
$t = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
Register-ScheduledTask -TaskName 'NavetTabletBridge' -Action $a -Trigger $t -RunLevel Highest -Force | Out-Null
Start-ScheduledTask -TaskName 'NavetTabletBridge'; Write-Host 'NavetTabletBridge running'
