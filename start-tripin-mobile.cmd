@echo off
setlocal

set "ANDROID_HOME=D:\DevTools\Android\Sdk"
set "ANDROID_SDK_ROOT=D:\DevTools\Android\Sdk"
set "ANDROID_AVD_HOME=D:\DevTools\Android\Avd"
set "PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\emulator;%ANDROID_HOME%\cmdline-tools\latest\bin;%PATH%"

cd /d "%~dp0"

echo Starting TripIn API and web upload server...
start "TripIn API + Web" cmd /k call "%~dp0start-tripin.cmd"

echo Starting Android emulator...
start "TripIn Android Emulator" cmd /k call "%~dp0start-android-emulator.cmd"

echo Waiting for emulator...
adb.exe wait-for-device

set "APK=%~dp0apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk"
if exist "%APK%" (
  echo Installing latest debug APK...
  adb.exe install -r "%APK%"
) else (
  echo APK not found. Run build-mobile-apk.cmd once, then run this script again.
  pause
  exit /b 1
)

echo Starting Metro mobile dev server...
start "TripIn Mobile Metro" cmd /k "cd /d ""%~dp0apps\mobile"" && npm.cmd exec -- expo start --localhost"

echo Launching TripIn on emulator...
timeout /t 8 /nobreak >nul
adb.exe shell monkey -p com.tripin.mobile 1

echo.
echo TripIn mobile is starting.
echo Keep the three opened windows running: API/Web, Emulator, Metro.
pause
