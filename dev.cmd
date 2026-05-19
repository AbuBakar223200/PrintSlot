@echo off
setlocal

REM PrintSlot Windows dev launcher.
REM Usage:
REM   dev.cmd
REM   dev.cmd -Migrate
REM   dev.cmd -Migrate -Seed
REM   dev.cmd -Fresh -ClearExpo

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1" %*
