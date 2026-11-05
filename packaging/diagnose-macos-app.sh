#!/usr/bin/env bash
set -euo pipefail

APP_PATH="${APP_PATH:-/Applications/ModernControl.app}"
EXECUTABLE="${APP_PATH}/Contents/MacOS/ModernControl"
LOG_FILE="${HOME}/ModernMinistry/logs/launcher.log"

echo "App path: ${APP_PATH}"
if [[ ! -d "${APP_PATH}" ]]; then
  echo "Aplicatia nu exista la ${APP_PATH}."
  echo "Instaleaza din DMG tragand ModernControl.app in Applications."
  exit 1
fi

echo "Info.plist:"
/usr/bin/plutil -p "${APP_PATH}/Contents/Info.plist" | sed -n '1,80p'

echo ""
echo "Launcher config:"
sed -n '1,120p' "${APP_PATH}/Contents/app/ModernControl.cfg"

echo ""
echo "Rulez executabilul. Inchide fereastra sau apasa Ctrl+C aici cand ai terminat."
"${EXECUTABLE}" &
APP_PID=$!
sleep 5

echo ""
echo "Proces dupa 5 secunde:"
ps -p "${APP_PID}" -o pid,stat,command || true

echo ""
echo "Ultimele linii din launcher log:"
if [[ -f "${LOG_FILE}" ]]; then
  tail -80 "${LOG_FILE}"
else
  echo "Nu exista ${LOG_FILE}."
fi

wait "${APP_PID}"
