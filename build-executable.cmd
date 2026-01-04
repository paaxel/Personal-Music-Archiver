@echo off
echo ====================================
echo Music Auto Archiver - Build Script
echo ====================================
echo.

echo Building Windows executable...
echo This may take several minutes...
echo.
call npm run dist:win

echo.
echo ====================================
echo Build completed!
echo ====================================
echo.
echo The executable can be found in:
echo %CD%\release\
echo.
pause
