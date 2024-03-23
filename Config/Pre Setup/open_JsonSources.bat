
set "first_directory=%CD%"

REM Step 4: Open JSON files in the default text editor
echo Opening JSON files...
start notepad "%first_directory%\..\..\WebUploader\WebExportUrls.json"
start notepad "%first_directory%\..\..\WebUploader\WebUploadUrls.json"
start notepad "%first_directory%\..\..\Src\LabelBussinessInfo.json"
REM Add more JSON files as needed

echo Task completed.
pause