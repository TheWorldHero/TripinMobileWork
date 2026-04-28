@echo off
setlocal

set "ANDROID_HOME=D:\DevTools\Android\Sdk"
set "ANDROID_SDK_ROOT=D:\DevTools\Android\Sdk"
set "ANDROID_AVD_HOME=D:\DevTools\Android\Avd"
set "PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\emulator;%ANDROID_HOME%\cmdline-tools\latest\bin;%PATH%"

emulator.exe -avd TripIn_Pixel_API_36
