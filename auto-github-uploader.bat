@echo off
REM --- Masaüstündeki projenin yolunu gir ---
cd "C:\Users\Ismail\Desktop\therapist-finder"

REM --- Yerel değişiklikleri commit et ---
git add .
git commit -m "Hazırlık commit'i"

REM --- GitHub'daki main branch'ini zorla yerel ile eşitle ---
git push origin main --force

echo.
echo GitHub'a yükleme tamamlandı!
pause
