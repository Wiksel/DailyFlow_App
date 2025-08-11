# Plan testów E2E – offline/online (Detox/Maestro)

## 1) Dodawanie zadania offline i synchronizacja
- Wyłącz sieć.
- Home → Quick Add → dodaj.
- Toast „Dodano!”.
- Profil → Kolejka offline: jest „add tasks”.
- Włącz sieć i poczekaj/Play.
- Home: zadanie widoczne, bez duplikatów.

## 2) Ukończenie zadania z offline fallbackiem
- Upewnij się, że jest aktywne zadanie.
- Wyłącz sieć.
- Oznacz ukończone.
- Outbox: „update tasks/{id}” + „update users/{uid}” z __inc.
- Włącz sieć, przetwórz.
- Profil: +10 pkt, +1 ukończone.

## 3) Dodanie wydatku do budżetu offline i synchronizacja
- Budżety → szczegóły.
- Wyłącz sieć.
- Dodaj wydatek X.
- Outbox: „add expenses” + „update budgets/{id}” z __inc.currentAmount: X.
- Włącz sieć, przetwórz.
- currentAmount wzrasta o X.

## 4) Ręczne sterowanie kolejką
- Wyłącz sieć.
- Dodaj dwa zadania.
- Outbox: usuń jedną operację (trash).
- Włącz sieć, Play na pozostałej.
- Lista pusta, zadanie przetworzone.

## 5) Auto-run kolejki przy wznawianiu i powrocie online
- Dodaj offline operację.
- Zminimalizuj, włącz sieć, wróć.
- Kolejka przetworzona automatycznie.
