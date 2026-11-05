# Modern Ministry – Build pentru macOS

## Cerințe

- macOS
- Node.js 22 LTS instalat
- Java JDK 21+
- Maven
- acces la registry-ul npm pentru instalarea dependențelor

## Generarea installerului

Din rădăcina proiectului, rulează:

```bash
cd /Users/daniel_cerna/soft-ministry/app/modern-ministry
./packaging/build-macos-installer.sh
```

Scriptul selectează automat Node.js compatibil, instalează dependențele frontend, compilează frontendul și backendul și generează pachetul macOS.

Rezultatul este disponibil în:

```text
packaging/dist/ModernControl-1.0.0.dmg
```

Dacă macOS nu permite crearea imaginilor DMG, scriptul generează automat:

```text
packaging/dist/ModernControl-1.0.0-macOS.zip
```

## Instalarea aplicației

Pentru DMG:

1. Deschide fișierul `ModernControl-1.0.0.dmg`.
2. Trage `ModernControl.app` în folderul `Applications`.

Pentru ZIP:

1. Dezarhivează `ModernControl-1.0.0-macOS.zip`.
2. Trage `ModernControl.app` în folderul `Applications`.

Pornește aplicația din `Applications` sau din Launchpad.

Datele locale ale aplicației sunt păstrate în:

```text
~/ModernMinistry/data
```

## Build rapid

Dacă dependențele frontend sunt deja instalate și nu vrei să rulezi din nou `npm ci`:

```bash
./packaging/build-macos-dmg.sh
```
