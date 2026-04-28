@echo off
setlocal

set "ROOT_DIR=%~dp0..\..\"
pushd "%ROOT_DIR%"

set "API_JAVA_HOME=D:\DevTools\Java\MicrosoftJDK21"
if exist "%API_JAVA_HOME%\bin\java.exe" (
  set "JAVA_HOME=%API_JAVA_HOME%"
  set "PATH=%JAVA_HOME%\bin;%PATH%"
)

if not exist "%JAVA_HOME%\bin\java.exe" (
  echo JDK 21 was not found. Expected: %API_JAVA_HOME%
  exit /b 1
)

if not defined PORT (
  set "PORT=3001"
)

call mvn -f services/api-java/pom.xml "-Dmaven.repo.local=.m2repo" package -DskipTests
if errorlevel 1 (
  exit /b %errorlevel%
)

call java -jar services/api-java/target/tripin-api-java-0.1.0.jar
set "EXIT_CODE=%errorlevel%"
popd
exit /b %EXIT_CODE%
