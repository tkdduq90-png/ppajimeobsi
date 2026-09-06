@echo off
chcp 65001 >nul
cd /d "%~dp0"
git add -A
git commit -m "update"
git push
echo.
echo 완료. 1~2분 뒤 반영됩니다.
echo https://tkdduq90-png.github.io/ppajimeobsi/
pause