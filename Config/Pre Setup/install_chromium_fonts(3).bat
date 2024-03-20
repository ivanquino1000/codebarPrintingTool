@echo off

set "first_directory=%CD%"

REM Step 3: Execute 'npx playwright install chromium' in src/node_modules/electron
echo Installing Chromium with Playwright...
cd "..\..\WebUploader\node_modules\electron"
powershell -Command "npx playwright install chromium"

pause

REM Iterate through each TTF file in the directory
for %%f in ("%first_directory%\..\RequiredFonts\*.ttf") do (
    start "" "%%f"
    pause
)
pause

echo Task completed.

REM Step 4: Open JSON files in the default text editor
echo Opening JSON files...
start notepad "%first_directory%\..\..\WebUploader\WebExportUrls.json"
start notepad "%first_directory%\..\..\WebUploader\WebUploadUrls.json"
start notepad "%first_directory%\..\..\Src\LabelBussinessInfo.json"
REM Add more JSON files as needed

echo Task completed.
pause