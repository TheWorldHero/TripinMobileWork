@echo off
setlocal

set "JAVA_HOME=D:\DevTools\Java\MicrosoftJDK17"
set "ANDROID_HOME=D:\DevTools\Android\Sdk"
set "ANDROID_SDK_ROOT=D:\DevTools\Android\Sdk"
set "ANDROID_AVD_HOME=D:\DevTools\Android\Avd"
set "GRADLE_USER_HOME=D:\DevTools\Gradle"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\emulator;%ANDROID_HOME%\cmdline-tools\latest\bin;%PATH%"

cd /d "%~dp0"

echo Building TripIn Android debug APK...
call apps\mobile\android\gradlew.bat -p apps\mobile\android app:assembleDebug -x lint -x test --configure-on-demand --build-cache -PreactNativeDevServerPort=8081 -PreactNativeArchitectures=x86_64,arm64-v8a
if errorlevel 1 (
  echo.
  echo Build failed. Keep this window open and send the error screenshot.
  pause
  exit /b 1
)

echo.
echo APK built:
echo %~dp0apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk
pause
