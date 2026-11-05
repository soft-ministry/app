Param(
  [string]$AppName = "ModernMinistry",
  [string]$AppVersion = "1.0.0",
  [string]$AppVendor = "Modern Ministry",
  [string]$AppDescription = "Modern Ministry desktop app"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$FrontendDir = Join-Path $RootDir "frontend"
$BackendDir = Join-Path $RootDir "backend"
$DistDir = Join-Path $RootDir "packaging\dist"
$PackageInputDir = Join-Path $RootDir "packaging\package-input"
$LauncherSrcDir = Join-Path $RootDir "packaging\launcher"
$LauncherBuildDir = Join-Path $RootDir "packaging\launcher-build"
$LauncherJar = Join-Path $RootDir "packaging\modern-ministry-launcher.jar"
$StaticDir = Join-Path $BackendDir "src\main\resources\static"
$MainJar = Join-Path $BackendDir "target\modern-ministry-backend-0.1.0-SNAPSHOT.jar"
$IconPath = Join-Path $RootDir "packaging\icons\modern-ministry.ico"
$AppImageDir = Join-Path $DistDir $AppName

function Require-Command {
  Param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Lipseste comanda '$Name'. Instaleaza Node.js/npm, Maven si JDK 21+."
  }
}

Require-Command "npm"
Require-Command "mvn"
Require-Command "jpackage"
Require-Command "javac"
Require-Command "jar"

Write-Host "1/5 Build Angular..."
Push-Location $FrontendDir
try { & npm run build | Out-Host } finally { Pop-Location }

$AngularBrowserDir = Join-Path $FrontendDir "dist\modern-ministry-frontend\browser"
if (-not (Test-Path (Join-Path $AngularBrowserDir "index.html"))) {
  $AngularBrowserDir = Join-Path $FrontendDir "dist\modern-ministry-frontend"
}
if (-not (Test-Path (Join-Path $AngularBrowserDir "index.html"))) {
  throw "Nu gasesc build-ul Angular: $AngularBrowserDir"
}

Write-Host "2/5 Copiere Angular in Spring static..."
if (Test-Path $StaticDir) { Remove-Item -Recurse -Force $StaticDir }
New-Item -ItemType Directory -Force -Path $StaticDir | Out-Null
Copy-Item (Join-Path $AngularBrowserDir "*") $StaticDir -Recurse -Force

Write-Host "3/5 Build Spring Boot..."
Push-Location $BackendDir
try { & mvn -DskipTests package | Out-Host } finally { Pop-Location }

if (-not (Test-Path $MainJar)) { throw "Jar backend inexistent: $MainJar" }
if (-not (Test-Path $IconPath)) { throw "Icon Windows lipsa: $IconPath" }

Write-Host "4/5 Build launcher..."
if (Test-Path $LauncherBuildDir) { Remove-Item -Recurse -Force $LauncherBuildDir }
New-Item -ItemType Directory -Force -Path $LauncherBuildDir | Out-Null
& javac -d $LauncherBuildDir (Join-Path $LauncherSrcDir "ModernMinistryLauncher.java")
& jar --create --file $LauncherJar --main-class "ro.church_office.modern.launcher.ModernMinistryLauncher" -C $LauncherBuildDir .

if (Test-Path $PackageInputDir) { Remove-Item -Recurse -Force $PackageInputDir }
New-Item -ItemType Directory -Force -Path $PackageInputDir | Out-Null
Copy-Item $MainJar (Join-Path $PackageInputDir ([System.IO.Path]::GetFileName($MainJar)))
Copy-Item $LauncherJar (Join-Path $PackageInputDir ([System.IO.Path]::GetFileName($LauncherJar)))

if (Test-Path $DistDir) { Remove-Item -Recurse -Force $DistDir }
New-Item -ItemType Directory -Force -Path $DistDir | Out-Null

Write-Host "5/5 Build app-image portable..."
& jpackage `
  --name $AppName `
  --type app-image `
  --dest $DistDir `
  --input $PackageInputDir `
  --main-jar ([System.IO.Path]::GetFileName($LauncherJar)) `
  --main-class "ro.church_office.modern.launcher.ModernMinistryLauncher" `
  --icon $IconPath `
  --app-version $AppVersion `
  --vendor $AppVendor `
  --description $AppDescription `
  --java-options "-Dfile.encoding=UTF-8"

if (-not (Test-Path $AppImageDir)) { throw "App-image-ul nu a fost creat: $AppImageDir" }

$ZipPath = Join-Path $DistDir "$AppName-portable.zip"
if (Test-Path $ZipPath) { Remove-Item -Force $ZipPath }
Compress-Archive -Path (Join-Path $AppImageDir "*") -DestinationPath $ZipPath -Force

Write-Host "Portable generat:"
Write-Host $AppImageDir
Write-Host $ZipPath
