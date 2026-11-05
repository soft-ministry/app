#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NVM_DIR="${NVM_DIR:-${HOME}/.nvm}"

if [[ -s "${NVM_DIR}/nvm.sh" ]]; then
  . "${NVM_DIR}/nvm.sh"
  nvm use 22 >/dev/null 2>&1 || true
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Eroare: Node.js nu este disponibil. Instaleaza Node.js 22 LTS."
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
case "${NODE_MAJOR}" in
  20|22|24)
    ;;
  *)
    echo "Eroare: Angular 21 necesita Node.js 20, 22 sau 24; versiunea curenta este $(node --version)."
    echo "Instaleaza Node.js 22 LTS sau configureaza NVM_DIR catre o instalare compatibila."
    exit 1
    ;;
esac

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Eroare: acest script este doar pentru macOS."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Eroare: npm nu este disponibil."
  exit 1
fi

echo "Node.js selectat: $(node --version)"
echo "Instalez dependentele frontend..."
(cd "${ROOT_DIR}/frontend" && npm ci)

exec "${ROOT_DIR}/packaging/build-macos-dmg.sh" "$@"
