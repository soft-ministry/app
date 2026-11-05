Param(
  [string]$AppName = "ModernMinistry",
  [string]$AppVersion = "1.0.0",
  [string]$AppVendor = "Modern Ministry",
  [string]$AppDescription = "Modern Ministry desktop app"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ExeScript = Join-Path $ScriptDir "build-windows-exe.ps1"
& powershell -ExecutionPolicy Bypass -File $ExeScript `
  -AppName $AppName `
  -AppVersion $AppVersion `
  -AppVendor $AppVendor `
  -AppDescription $AppDescription `
  -PackageType msi
