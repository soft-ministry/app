# Modern Ministry Desktop Packaging

Acest folder genereaza installers pentru aplicatia noua Angular + Spring Boot.

Runtime instalat:

- frontend Angular servit din jar-ul Spring Boot
- API pe acelasi host, prin `/api`
- port dedicat pentru aplicatia instalata: `80`
- date locale separate de development: `~/ModernMinistry/data`

## macOS

Din `modern-ministry`:

```bash
./packaging/build-macos-installer.sh
```

Scriptul selecteaza automat Node.js 22 LTS cand este disponibil, instaleaza dependentele frontend si genereaza installerul.

Rezultatul este `packaging/dist/ModernControl-1.0.0.dmg`. Dacă macOS nu permite crearea imaginilor DMG, scriptul generează automat `packaging/dist/ModernControl-1.0.0-macOS.zip`.

Pentru instalarea variantei ZIP, dezarhivează arhiva și trage `ModernControl.app` în `Applications`.

Pentru un build fără reinstalarea dependențelor:

```bash
./packaging/build-macos-dmg.sh
```

Rezultatul:

```text
packaging/dist/ModernControl-1.0.0.dmg
```

## Windows

Pe Windows, din `modern-ministry`:

```powershell
powershell -ExecutionPolicy Bypass -File .\packaging\build-windows-exe.ps1
powershell -ExecutionPolicy Bypass -File .\packaging\build-windows-portable.ps1
```

Pentru installer Windows sunt necesare JDK 21+, Maven, Node.js/npm si WiX Toolset 3.x.

## Development

Development ramane separat:

- Angular dev server: `http://localhost:4200`
- backend dev: `http://localhost:8081`
- installer desktop: `http://localhost`

Aplicatia macOS instalata se numeste `ModernControl.app`, ca sa fie clara diferenta fata de builds mai vechi sau fata de aplicatia veche `MinistryAdmin.app`.
