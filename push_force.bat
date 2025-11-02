@echo off
REM Tek tıkla zorla push yapan script

cd /d "C:\Users\Ismail\Desktop\therapist-finder"

git add -A
git commit -m "Yerel değişiklikler — tüm remote'u overwrite"
git push --force origin main

echo Bitti! GitHub main branch yerel ile tamamen ayni durumda.
pause
