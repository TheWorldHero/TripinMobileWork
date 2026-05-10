@echo off
setlocal

set "ROOT_DIR=%~dp0..\..\"
pushd "%ROOT_DIR%"

if defined API_JAVA_HOME (
  if exist "%API_JAVA_HOME%\bin\java.exe" (
    set "JAVA_HOME=%API_JAVA_HOME%"
    set "PATH=%JAVA_HOME%\bin;%PATH%"
  )
)

if not defined JAVA_HOME (
  echo JAVA_HOME is not set. Install JDK 21 and set JAVA_HOME, or set API_JAVA_HOME to override for this project.
  exit /b 1
)
if not exist "%JAVA_HOME%\bin\java.exe" (
  echo JAVA_HOME points to %JAVA_HOME% but no java.exe found there.
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
