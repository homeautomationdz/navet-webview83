# Tablet bridge (optional)

A small Windows helper for remote testing of a tablet connected over USB/ADB.
It runs only the fixed actions listed in `actions.ps1` (status, screen, home, reboot,
webviewversion, seq). Nothing else can be executed through it.

1. Install Android platform-tools, or set `NAVET_ADB` to the full path of `adb.exe`.
2. Enable ADB debugging on the tablet and accept the PC's key.
3. Run `install.ps1` once in an elevated PowerShell.
4. Create `queue\screen.request` → `queue\screen.png` and `queue\screen.result.txt` appear.

`seq` reads `queue\seq.txt`, one command per line:
`tap X Y`, `swipe X1 Y1 X2 Y2 MS`, `down/move/up X Y` (press-hold-drag), `text abc`,
`key CODE`, `sleep SECONDS`, `shot NAME`.

Uninstall: `Unregister-ScheduledTask NavetTabletBridge`.
