# Historia Zmian - That Open Editor

## [2024-11-20] - Środa, 20 listopada 2024

### 🎯 Główne Funkcjonalności

#### 📏 Narzędzie Wymiarowania (Dimension Tool)
- **Dodano kompletne narzędzie wymiarowania 3D**
  - Tworzenie wymiarów poprzez Shift + klik na dwóch punktach
  - Profesjonalny wygląd wymiarów (linie, etykiety z tłem, znaki architektoniczne)
  - Adaptacyjne skalowanie etykiet względem odległości kamery
  - Wymiary zawsze zwrócone frontem do kamery (billboard effect)

#### 🎨 Wizualizacja Wymiarów
- **Profesjonalne znaki architektoniczne**
  - Ukośne kreski 45° na końcach wymiarów (zamiast strzałek)
  - Zgodne ze standardami architektonicznymi (AutoCAD, Revit)
  
- **Etykiety wymiarów**
  - Białe tło z gradientem i zaokrąglonymi rogami
  - Niebieskie obramowanie
  - Cień na tekście dla lepszej czytelności
  - Precyzja do 2 miejsc po przecinku (XX.XXm)

- **Kolory**
  - 🔴 Czerwone punkty (markery miejsc pomiaru)
  - 🟢 Zielona linia (podgląd wymiaru podczas rysowania)
  - 🔵 Niebieska linia (finalny wymiar)

#### 🧲 Przyciąganie do Punktów (Snap)
- **Inteligentne wykrywanie punktów charakterystycznych**
  - Wierzchołki elementów
  - Środki elementów (centrum bounding box)
  - Rogi bounding box (początek/koniec elementu)
  - Środki krawędzi bounding box

- **Wizualizacja punktów snap**
  - 🟩 Małe zielone kwadraty pokazujące wszystkie dostępne punkty
  - Animowane obracanie i pulsacja kwadratów
  - 🟢 Duży zielony marker na najbliższym punkcie przyciągania
  - Próg przyciągania: 0.5m

#### 📐 Opcje Wymiarowania

##### 1. Wymiary Ortogonalne
- Wymiary wyrównane do osi X, Y, Z
- Automatyczne wybieranie dominującej osi

##### 2. Wyrównanie do Krawędzi Elementu
- **Równolegle** (∥) - wymiar równoległy do wybranej powierzchni
- **Prostopadle** (⊥) - wymiar prostopadły do wybranej powierzchni
- Wizualizacja wybranej krawędzi (zielona/fioletowa linia)

#### 🎮 Sterowanie

##### Dodawanie Wymiarów
- `Shift` + klik = dodaj pierwszy punkt
- `Shift` + klik = dodaj drugi punkt (wymiar gotowy)
- `ESC` = anuluj bieżący wymiar

##### Usuwanie Wymiarów
- `Shift` + podwójne kliknięcie na wymiarze = zaznacz (zmieni kolor na czerwony)
- `Delete` = usuń zaznaczony wymiar
- `ESC` = anuluj zaznaczenie

##### Nawigacja
- **Bez Shift** = pełna kontrola kamery (obracanie, przesuwanie, zoom)
- **Z Shift** = tryb wymiarowania (kamera zablokowana)

#### ⏪ System Undo/Redo
- **Uniwersalny system historii akcji**
  - Cofanie/przywracanie dodawania wymiarów
  - Cofanie/przywracanie usuwania wymiarów
  - Cofanie/przywracanie ruchów kamery
  - Inteligentna historia (kasowanie "przyszłości" po nowej akcji)

- **Przyciski**
  - ⏪ Undo = cofnij ostatnią akcję
  - ⏩ Redo = przywróć cofniętą akcję

#### 🎛️ Panel Opcji Wymiarowania
- **Kompaktowy, przesuwany panel**
  - Przeciąganie za niebieski nagłówek
  - Dwa tryby: zwinięty (tylko ikony) i rozwinięty (pełne opisy)
  - Minimalna przestrzeń (~40px w wersji zwiniętej)

- **Tryb zwinięty (domyślny)**
  - 🔵 Ikona siatki = wymiary ortogonalne
  - 🟢 Ikona okręgu = przyciąganie do punktów
  - 🟣 Ikona ruchu = wyrównanie do krawędzi
  - Tooltips po najechaniu myszką

- **Tryb rozwinięty**
  - Pełne nazwy opcji
  - Opisy funkcjonalności
  - Instrukcje sterowania

### 🔧 Poprawki i Ulepszenia

#### Ikony Narzędzi
- ✨ **Nowa ikona wymiarowania ze strzałkami**
  - Symbol ze strzałkami w lewo i prawo
  - Litera "X" nad symbolem
  - Zwiększona grubość linii (strokeWidth: 2.5)
  - Większe wymiary dla lepszej widoczności
  - Profesjonalny wygląd symbolu wymiarowania
  - Zgodny z międzynarodowymi standardami CAD

- 🔍 **Zmiana ikony "Oświetlenie" na "Wyszukiwarkę"**
  - Żarówka (Lightbulb) → Lupa (Search)
  - Przygotowanie pod przyszłą funkcję wyszukiwania elementów w modelu
  - Tooltip: "Search elements in the model"

#### Interakcja z Przyciskami
- ✨ **Inteligentne przełączanie przycisków**
  - Przyciski trybów (dimension, pin, search, comment, move) są teraz togglable
  - Ponowne kliknięcie wyłącza narzędzie i wraca do trybu "move"
  - Przyciski akcji jednorazowych (undo, redo, camera, share) nie zmieniają aktywnego trybu
  - Koniec problemu z podświetlonymi przyciskami po wyłączeniu narzędzia

- 📌 **Naprawa panelu wyboru koloru pinezki**
  - Panel wyboru koloru pinezki teraz poprawnie znika po wyłączeniu przycisku pinezki
  - Panel zamyka się również przy wyborze innego narzędzia
  - Synchronizacja stanu przycisku z widocznością panelu

#### Usunięte Elementy
- ❌ Usunięto wskaźnik osi (X/Y/Z badge) z wymiarów ortogonalnych
- ❌ Usunięto dużą niebieską podpowiedź na dole ekranu
- ❌ Automatyczne usuwanie czerwonych markerów po utworzeniu wymiaru

#### Optymalizacje
- Debounce dla zapisywania stanu kamery (300ms)
- Ograniczona liczba wierzchołków do analizy snap (co 50-ty)
- Tylko punkty snap w promieniu 1.5m od kursora
- Animacje w requestAnimationFrame dla płynności

### 📁 Nowe Pliki

#### Komponenty
- `src/utils/SimpleDimensionTool.ts` - Główna implementacja narzędzia wymiarowania
- `src/components/DimensionOptionsPanel.tsx` - Panel opcji wymiarowania
- `src/components/icons/DimensionIcon.tsx` - Własna ikona wymiarowania ze strzałkami

#### Funkcje SimpleDimensionTool
- `handleClick()` - obsługa kliknięć (dodawanie punktów)
- `handleMouseMove()` - podgląd wymiaru i punktów snap
- `handleRightClick()` - zaznaczanie wymiaru do usunięcia
- `cancelCurrentMeasurement()` - anulowanie bieżącego wymiaru
- `deleteMeasurement()` - usuwanie wymiaru
- `highlightMeasurement()` - podświetlanie wymiaru (czerwony)
- `onMeasurementCreated` - callback dla undo/redo
- `getMeasurementData()` - pobieranie danych wymiaru
- `restoreMeasurement()` - przywracanie usuniętego wymiaru
- `update()` - animacje i skalowanie (wywoływane co klatkę)

### 🎨 Szczegóły Techniczne

#### Three.js Elementy
- `THREE.Group` - kontener dla każdego wymiaru
- `THREE.Line` - linie wymiarowe
- `THREE.Sprite` - etykiety tekstowe (billboard)
- `THREE.Mesh` - markery punktów, kwadraty snap
- `THREE.BoxGeometry` - zielone kwadraty snap (0.05m)
- `THREE.SphereGeometry` - okrągłe markery (0.02m)

#### Kolory (Hex)
- `0xFF4444` - czerwone markery punktów
- `0x4CAF50` - zielony podgląd/snap aktywny
- `0x2196F3` - niebieski finalny wymiar
- `0x00FF00` - jasnozielone kwadraty snap
- `0x9C27B0` - fioletowy (wyrównanie prostopadłe)

#### Renderowanie
- `renderOrder` dla kontroli kolejności renderowania:
  - 997: krawędź odniesienia
  - 998: linie wymiarów, kreski
  - 999: markery punktów
  - 1000: etykiety tekstowe
  - 1001: snap marker (duży)
  - 1002: snap point markers (małe kwadraty)
- `depthTest: false` - wymiary zawsze widoczne (nie zasłaniane przez model)

### 📊 Statystyki
- **Commitów dzisiaj:** 15+
- **Zmienionych plików:** 3 główne (`SimpleDimensionTool.ts`, `DimensionOptionsPanel.tsx`, `Viewer.tsx`)
- **Dodanych linii kodu:** ~1500+
- **Repository:** `frontend_beginning_20_11`

---

## Legenda

- ✨ Nowa funkcjonalność
- 🔧 Poprawka
- 🎨 Zmiany wizualne
- 📝 Dokumentacja
- 🗑️ Usunięcie
- ⚡ Optymalizacja
- 🐛 Naprawa błędu

---

**Ostatnia aktualizacja:** 2024-11-20 (ongoing)

