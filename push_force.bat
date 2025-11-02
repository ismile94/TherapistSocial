@echo off
REM Tek tıkla zorla push yapan script
REM Masaüstündeki projenin yolunu kendi sistemine göre değiştir

cd /d "C:\Users\Ismail\Desktop\therapist-finder"

echo Tüm değişiklikler sahneleniyor...
git add -A

echo Commit yapiliyor...
git commit -m "Yerel değişiklikler — tüm remote'u overwrite"

echo Remote ile zorla push yapiliyor...
git push --force origin main

echo Bitti! GitHub main branch yerel ile tamamen ayni durumda.
pause