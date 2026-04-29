@echo off

cd /d "C:\Fullcash-360_node"

echo Executando integracao...
node dist/main.js

set EXIT_CODE=%errorlevel%

pause
exit /b %EXIT_CODE%