@echo off
cd /d "%~dp0"
set FW=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319
set ICON_OPT=
if exist icon.png (
    powershell -NoProfile -ExecutionPolicy Bypass -File png2ico.ps1 icon.png icon.ico
    if errorlevel 1 (echo Icon conversion failed & pause & exit /b 1)
    set ICON_OPT=/win32icon:icon.ico
)
"%FW%\csc.exe" /nologo /codepage:65001 /target:winexe /optimize+ %ICON_OPT% /r:"%FW%\WPF\PresentationCore.dll" /r:"%FW%\WPF\WindowsBase.dll" /out:Knocker.exe Knocker.cs
if errorlevel 1 (echo Build failed & pause & exit /b 1)
echo Build OK: Knocker.exe
