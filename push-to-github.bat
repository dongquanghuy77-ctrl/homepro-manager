@echo off
echo ====================================
echo  HomePro Manager - Push len GitHub
echo ====================================

set GIT="C:\Program Files\Git\cmd\git.exe"

cd /d "D:\homepro"

echo [1/5] Khoi tao Git repo...
%GIT% init

echo [2/5] Cau hinh...
%GIT% config user.email "homepro@manager.com"
%GIT% config user.name "HomePro Manager"

echo [3/5] Add tat ca files...
%GIT% add .

echo [4/5] Commit...
%GIT% commit -m "Initial commit - HomePro Manager v2.0 (Sprint 1-4)"

echo [5/5] Push len GitHub...
%GIT% branch -M main
%GIT% remote add origin https://github.com/dongquanghuy77-ctrl/homepro-manager.git
%GIT% push -u origin main

echo.
echo ✅ Xong! Code da len GitHub.
pause
