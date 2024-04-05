@echo off

echo Installing Required Fonts to Windows
set "destDir=C:\Windows\Fonts"
echo Destiny Dir: %destDir%
set "fontDir=%~dp0..\RequiredFonts"
echo Fonts Dir:  %fontDir%


REM Copy TTF files to system font directory
for %%f in ("%fontDir%\*.ttf") do (
    copy "%%f" "%destDir%" /Y
)

echo Installation Completed: Required Fonts 

pause
