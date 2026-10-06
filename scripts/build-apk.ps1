# NEXUS Android Pure Native APK Automated Build Script
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   NEXUS Pure Android Build Pipeline     " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"
$rootDir = "d:\NEXUS1"
$mobileDir = "$rootDir\apps\mobile"
$androidDir = "$mobileDir\android"

# Step 1: Build the mobile frontend
Write-Host "`n[1/4] Compiling mobile web assets..." -ForegroundColor Yellow
Set-Location $mobileDir
npm run build

# Step 2: Sync Capacitor assets with the native Android project
Write-Host "`n[2/4] Syncing Capacitor assets to Android project..." -ForegroundColor Yellow
npx cap sync android

# Step 3: Run Gradle Assemble Debug
Write-Host "`n[3/4] Compiling Android APK with Gradle..." -ForegroundColor Yellow
if (Test-Path "C:\Program Files\Android\Android Studio\jbr") {
    $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
}
Set-Location $androidDir
.\gradlew.bat :app:assembleDebug

# Step 4: Verify and copy output APK
Write-Host "`n[4/4] Verifying and copying generated APK..." -ForegroundColor Yellow
$outputApk = "$androidDir\app\build\outputs\apk\debug\app-debug.apk"

if (Test-Path $outputApk) {
    Copy-Item $outputApk -Destination "$rootDir\nexus-app.apk" -Force
    Copy-Item $outputApk -Destination "$mobileDir\nexus-app.apk" -Force
    
    $fileInfo = Get-Item "$rootDir\nexus-app.apk"
    $sizeMb = [math]::Round($fileInfo.Length / 1MB, 2)
    
    Write-Host "`n==========================================" -ForegroundColor Green
    Write-Host "   BUILD SUCCEEDED!                      " -ForegroundColor Green
    Write-Host "   APK Output: $rootDir\nexus-app.apk   " -ForegroundColor Green
    Write-Host "   APK Size: $sizeMb MB                 " -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "`nTo install on connected device: adb install -r $rootDir\nexus-app.apk" -ForegroundColor White
} else {
    Write-Host "Error: APK file not found at $outputApk" -ForegroundColor Red
    exit 1
}
