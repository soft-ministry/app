#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Eroare: acest script este doar pentru macOS."
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="${ROOT_DIR}/frontend"
BACKEND_DIR="${ROOT_DIR}/backend"
DIST_DIR="${ROOT_DIR}/packaging/dist"
PACKAGE_INPUT_DIR="${ROOT_DIR}/packaging/package-input"
LAUNCHER_SRC_DIR="${ROOT_DIR}/packaging/launcher"
LAUNCHER_BUILD_DIR="${ROOT_DIR}/packaging/launcher-build"
LAUNCHER_JAR="${ROOT_DIR}/packaging/modern-ministry-launcher.jar"
STATIC_DIR="${BACKEND_DIR}/src/main/resources/static"
APP_NAME="${APP_NAME:-ModernControl}"
APP_VERSION="${APP_VERSION:-1.0.0}"
APP_VENDOR="${APP_VENDOR:-Modern Ministry}"
APP_IDENTIFIER="${APP_IDENTIFIER:-ro.churchoffice.modernministry.control}"
APP_DESCRIPTION="${APP_DESCRIPTION:-Modern Ministry desktop app}"
MAIN_JAR="${BACKEND_DIR}/target/modern-ministry-backend-0.1.0-SNAPSHOT.jar"
ICON_FILE="${ROOT_DIR}/packaging/icons/ModernMinistry.icns"

if ! command -v npm >/dev/null 2>&1; then
  echo "Eroare: npm nu este disponibil."
  exit 1
fi
if ! command -v mvn >/dev/null 2>&1; then
  echo "Eroare: Maven nu este disponibil."
  exit 1
fi
if ! command -v jpackage >/dev/null 2>&1; then
  echo "Eroare: jpackage nu este disponibil. Instaleaza JDK 21+."
  exit 1
fi

echo "1/5 Build Angular..."
(cd "${FRONTEND_DIR}" && npm run build)

ANGULAR_BROWSER_DIR="${FRONTEND_DIR}/dist/modern-ministry-frontend/browser"
if [[ ! -d "${ANGULAR_BROWSER_DIR}" ]]; then
  ANGULAR_BROWSER_DIR="${FRONTEND_DIR}/dist/modern-ministry-frontend"
fi
if [[ ! -f "${ANGULAR_BROWSER_DIR}/index.html" ]]; then
  echo "Nu gasesc build-ul Angular in ${ANGULAR_BROWSER_DIR}."
  exit 1
fi

echo "2/5 Copiere Angular in Spring static..."
rm -rf "${STATIC_DIR}"
mkdir -p "${STATIC_DIR}"
cp -R "${ANGULAR_BROWSER_DIR}/." "${STATIC_DIR}/"

echo "3/5 Build Spring Boot..."
(cd "${BACKEND_DIR}" && mvn -DskipTests package)

if [[ ! -f "${MAIN_JAR}" ]]; then
  echo "Jar backend inexistent: ${MAIN_JAR}"
  exit 1
fi
if [[ ! -f "${ICON_FILE}" ]]; then
  echo "Icon macOS lipsa: ${ICON_FILE}"
  exit 1
fi

echo "4/5 Build launcher..."
rm -rf "${LAUNCHER_BUILD_DIR}"
mkdir -p "${LAUNCHER_BUILD_DIR}"
javac -d "${LAUNCHER_BUILD_DIR}" "${LAUNCHER_SRC_DIR}/ModernMinistryLauncher.java"
jar --create --file "${LAUNCHER_JAR}" --main-class ro.church_office.modern.launcher.ModernMinistryLauncher -C "${LAUNCHER_BUILD_DIR}" .

rm -rf "${PACKAGE_INPUT_DIR}"
mkdir -p "${PACKAGE_INPUT_DIR}"
cp -f "${MAIN_JAR}" "${PACKAGE_INPUT_DIR}/"
cp -f "${LAUNCHER_JAR}" "${PACKAGE_INPUT_DIR}/"

mkdir -p "${DIST_DIR}"
rm -f "${DIST_DIR}/${APP_NAME}-${APP_VERSION}.dmg"
rm -f "${DIST_DIR}/${APP_NAME}-${APP_VERSION}-macOS.zip"
rm -rf "${DIST_DIR}/${APP_NAME}.app"

echo "5/5 Build macOS package..."
JPACKAGE_ARGS=(
  --name "${APP_NAME}" \
  --dest "${DIST_DIR}" \
  --input "${PACKAGE_INPUT_DIR}" \
  --main-jar "$(basename "${LAUNCHER_JAR}")" \
  --main-class ro.church_office.modern.launcher.ModernMinistryLauncher \
  --app-version "${APP_VERSION}" \
  --vendor "${APP_VENDOR}" \
  --description "${APP_DESCRIPTION}" \
  --mac-package-name "${APP_NAME}" \
  --mac-package-identifier "${APP_IDENTIFIER}" \
  --resource-dir "${ROOT_DIR}/packaging/icons" \
  --icon "${ICON_FILE}" \
  --jlink-options "--strip-debug --no-man-pages --no-header-files" \
  --java-options "-Djava.awt.headless=false" \
  --java-options "-Dapple.awt.UIElement=false" \
  --java-options "-Xdock:name=${APP_NAME}" \
  --java-options "-Dfile.encoding=UTF-8"
)

if jpackage --type dmg "${JPACKAGE_ARGS[@]}"; then
  echo "DMG generat: ${DIST_DIR}/${APP_NAME}-${APP_VERSION}.dmg"
else
  echo "DMG indisponibil in acest mediu; generez un ZIP cu aplicatia macOS..."
  rm -rf "${DIST_DIR}/${APP_NAME}.app"
  jpackage --type app-image "${JPACKAGE_ARGS[@]}"
  ditto -c -k --sequesterRsrc --keepParent \
    "${DIST_DIR}/${APP_NAME}.app" \
    "${DIST_DIR}/${APP_NAME}-${APP_VERSION}-macOS.zip"
  echo "ZIP generat: ${DIST_DIR}/${APP_NAME}-${APP_VERSION}-macOS.zip"
fi
