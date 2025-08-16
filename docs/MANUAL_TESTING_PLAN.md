# 📱 Plan Testowania Manualnego DailyFlow

## 🎯 Cel Testowania
Przetestowanie wszystkich funkcjonalności aplikacji DailyFlow w celu wykrycia i naprawienia błędów przed wdrożeniem produkcyjnym.

## 🧪 Środowisko Testowe
- **Platforma**: Android (emulator/urządzenie fizyczne) + iOS (symulator/urządzenie fizyczne)
- **Wersja**: Najnowsza wersja deweloperska
- **Konfiguracja**: Firebase (test environment), mock data

---

## 🔐 1. TESTY UWIERZYTELNIANIA

### 1.1 Logowanie przez Email/Hasło
- [ ] **Pusty formularz**
  - Kliknij "Zaloguj się" bez wypełniania pól
  - **Oczekiwany rezultat**: Błędy walidacji "Email jest wymagany" i "Hasło jest wymagane"
  
- [ ] **Nieprawidłowy email**
  - Wpisz "invalid-email" w pole email
  - **Oczekiwany rezultat**: Błąd "Nieprawidłowy format email"
  
- [ ] **Słabe hasło**
  - Wpisz "weak" w pole hasła
  - **Oczekiwany rezultat**: Błąd "Hasło musi mieć co najmniej 8 znaków"
  
- [ ] **Poprawne dane**
  - Wpisz prawidłowy email i hasło
  - **Oczekiwany rezultat**: Przekierowanie do głównego ekranu aplikacji

### 1.2 Logowanie przez Google
- [ ] **Konfiguracja Google Sign-In**
  - Kliknij "Zaloguj się przez Google"
  - **Oczekiwany rezultat**: Otwarcie okna wyboru konta Google
  
- [ ] **Proces logowania**
  - Wybierz konto Google
  - **Oczekiwany rezultat**: Pomyślne logowanie i przekierowanie

### 1.3 Logowanie przez Telefon
- [ ] **Otwarcie modalu**
  - Kliknij "Zaloguj się przez telefon"
  - **Oczekiwany rezultat**: Modal z polem numeru telefonu
  
- [ ] **Walidacja numeru**
  - Wpisz nieprawidłowy numer (np. "123")
  - **Oczekiwany rezultat**: Błąd walidacji
  
- [ ] **Wysłanie kodu SMS**
  - Wpisz prawidłowy numer i kliknij "Wyślij kod"
  - **Oczekiwany rezultat**: Kod SMS zostaje wysłany

### 1.4 Resetowanie Hasła
- [ ] **Otwarcie modalu**
  - Kliknij "Zapomniałeś hasła?"
  - **Oczekiwany rezultat**: Modal resetowania hasła
  
- [ ] **Wysłanie emaila resetującego**
  - Wpisz email i kliknij "Wyślij"
  - **Oczekiwany rezultat**: Email zostaje wysłany

---

## 📝 2. TESTY ZARZĄDZANIA ZADANIAMI

### 2.1 Tworzenie Zadań
- [ ] **Dodawanie nowego zadania**
  - Kliknij przycisk "+" lub "Dodaj zadanie"
  - **Oczekiwany rezultat**: Otwarcie formularza dodawania zadania
  
- [ ] **Walidacja formularza**
  - Spróbuj zapisać puste zadanie
  - **Oczekiwany rezultat**: Błąd "Treść zadania jest wymagana"
  
- [ ] **Ustawianie priorytetu**
  - Wybierz różne poziomy priorytetu (1-5)
  - **Oczekiwany rezultat**: Priorytet zostaje ustawiony
  
- [ ] **Wybór kategorii**
  - Wybierz kategorię z listy
  - **Oczekiwany rezultat**: Kategoria zostaje przypisana
  
- [ ] **Ustawianie deadline'u**
  - Wybierz datę i czas
  - **Oczekiwany rezultat**: Deadline zostaje ustawiony

### 2.2 Edycja Zadań
- [ ] **Otwarcie zadania**
  - Kliknij na istniejące zadanie
  - **Oczekiwany rezultat**: Otwarcie szczegółów zadania
  
- [ ] **Modyfikacja treści**
  - Zmień treść zadania
  - **Oczekiwany rezultat**: Zmiany zostają zapisane
  
- [ ] **Zmiana priorytetu**
  - Zmień priorytet zadania
  - **Oczekiwany rezultat**: Nowy priorytet zostaje zastosowany

### 2.3 Ukończenie Zadań
- [ ] **Oznaczenie jako ukończone**
  - Kliknij checkbox przy zadaniu
  - **Oczekiwany rezultat**: Zadanie zostaje oznaczone jako ukończone
  
- [ ] **Weryfikacja punktów**
  - Sprawdź czy punkty zostały przyznane
  - **Oczekiwany rezultat**: Punkty zostają dodane do profilu użytkownika

### 2.4 Filtrowanie i Wyszukiwanie
- [ ] **Filtrowanie po kategorii**
  - Wybierz kategorię z filtra
  - **Oczekiwany rezultat**: Lista zostaje przefiltrowana
  
- [ ] **Filtrowanie po priorytecie**
  - Wybierz poziom priorytetu
  - **Oczekiwany rezultat**: Lista zostaje przefiltrowana
  
- [ ] **Wyszukiwanie tekstowe**
  - Wpisz tekst w wyszukiwarce
  - **Oczekiwany rezultat**: Wyniki wyszukiwania zostają wyświetlone

---

## 💰 3. TESTY ZARZĄDZANIA BUDŻETEM

### 3.1 Tworzenie Budżetów
- [ ] **Dodawanie nowego budżetu**
  - Przejdź do zakładki "Budżet"
  - Kliknij "Dodaj budżet"
  - **Oczekiwany rezultat**: Otwarcie formularza
  
- [ ] **Walidacja formularza**
  - Spróbuj zapisać budżet bez nazwy
  - **Oczekiwany rezultat**: Błąd walidacji
  
- [ ] **Ustawianie kwoty docelowej**
  - Wpisz kwotę (np. 1000 zł)
  - **Oczekiwany rezultat**: Kwota zostaje ustawiona

### 3.2 Dodawanie Wydatków
- [ ] **Dodawanie wydatku**
  - Kliknij "Dodaj wydatek" w budżecie
  - **Oczekiwany rezultat**: Otwarcie formularza wydatku
  
- [ ] **Walidacja wydatku**
  - Spróbuj dodać wydatek bez nazwy
  - **Oczekiwany rezultat**: Błąd walidacji
  
- [ ] **Ustawianie kwoty**
  - Wpisz kwotę wydatku
  - **Oczekiwany rezultat**: Kwota zostaje zapisana

### 3.3 Śledzenie Budżetu
- [ ] **Wyświetlanie postępu**
  - Sprawdź pasek postępu budżetu
  - **Oczekiwany rezultat**: Pasek pokazuje aktualny stan
  
- [ ] **Historia wydatków**
  - Sprawdź listę wydatków
  - **Oczekiwany rezultat**: Wszystkie wydatki są widoczne

---

## 🔄 4. TESTY ZADAŃ CYKLICZNYCH

### 4.1 Tworzenie Serii
- [ ] **Dodawanie nowej serii**
  - Przejdź do "Zadania cykliczne"
  - Kliknij "Dodaj serię"
  - **Oczekiwany rezultat**: Otwarcie formularza
  
- [ ] **Ustawianie częstotliwości**
  - Wybierz "Codziennie", "Co tydzień", "Co miesiąc"
  - **Oczekiwany rezultat**: Częstotliwość zostaje ustawiona
  
- [ ] **Ustawianie interwału**
  - Ustaw "co 2 dni" lub "co 3 tygodnie"
  - **Oczekiwany rezultat**: Interwał zostaje zastosowany

### 4.2 Generowanie Zadań
- [ ] **Automatyczne generowanie**
  - Sprawdź czy zadania są generowane zgodnie z harmonogramem
  - **Oczekiwany rezultat**: Zadania pojawiają się w odpowiednich terminach
  
- [ ] **Pomijanie instancji**
  - Oznacz instancję jako pominiętą
  - **Oczekiwany rezultat**: Zadanie nie pojawia się ponownie

---

## 👥 5. TESTY FUNKCJONALNOŚCI PAR

### 5.1 Łączenie Kont
- [ ] **Wysyłanie zaproszenia**
  - Przejdź do profilu
  - Kliknij "Połącz z partnerem"
  - **Oczekiwany rezultat**: Formularz zaproszenia
  
- [ ] **Akceptacja zaproszenia**
  - Zaloguj się na drugim koncie
  - Sprawdź zaproszenie
  - **Oczekiwany rezultat**: Możliwość zaakceptowania

### 5.2 Współdzielenie Zadań
- [ ] **Oznaczenie zadania jako współdzielone**
  - Edytuj zadanie
  - Włącz "Współdziel z partnerem"
  - **Oczekiwany rezultat**: Zadanie staje się widoczne dla partnera
  
- [ ] **Widoczność u partnera**
  - Sprawdź na koncie partnera
  - **Oczekiwany rezultat**: Zadanie jest widoczne

### 5.3 Współdzielenie Budżetów
- [ ] **Dodanie partnera do budżetu**
  - Edytuj budżet
  - Dodaj partnera
  - **Oczekiwany rezultat**: Partner może widzieć i edytować budżet

---

## ⚙️ 6. TESTY USTAWIENIA

### 6.1 Motyw i Wyświetlanie
- [ ] **Zmiana motywu**
  - Przejdź do "Wyświetlanie"
  - Przełącz między jasnym a ciemnym motywem
  - **Oczekiwany rezultat**: Aplikacja zmienia wygląd
  
- [ ] **Zmiana koloru akcentu**
  - Wybierz inny kolor akcentu
  - **Oczekiwany rezultat**: Kolor zostaje zastosowany

### 6.2 Ustawienia Konta
- [ ] **Zmiana nicknamu**
  - Edytuj profil
  - Zmień nickname
  - **Oczekiwany rezultat**: Nowy nickname zostaje zapisany
  
- [ ] **Zmiana zdjęcia profilowego**
  - Dodaj nowe zdjęcie
  - **Oczekiwany rezultat**: Zdjęcie zostaje zaktualizowane

### 6.3 Powiadomienia
- [ ] **Włączanie/wyłączanie powiadomień**
  - Przejdź do ustawień powiadomień
  - Zmień ustawienia
  - **Oczekiwany rezultat**: Ustawienia zostają zapisane
  
- [ ] **Test powiadomienia**
  - Ustaw przypomnienie
  - **Oczekiwany rezultat**: Powiadomienie pojawia się w odpowiednim czasie

---

## 📱 7. TESTY INTERFEJSU UŻYTKOWNIKA

### 7.1 Nawigacja
- [ ] **Przechodzenie między zakładkami**
  - Kliknij "Zadania" i "Budżet"
  - **Oczekiwany rezultat**: Płynne przejścia
  
- [ ] **Nawigacja wstecz**
  - Użyj przycisku wstecz
  - **Oczekiwany rezultat**: Powrót do poprzedniego ekranu

### 7.2 Responsywność
- [ ] **Obrót ekranu**
  - Obróć urządzenie
  - **Oczekiwany rezultat**: Interfejs dostosowuje się
  
- [ ] **Różne rozmiary ekranów**
  - Testuj na różnych urządzeniach
  - **Oczekiwany rezultat**: Poprawne wyświetlanie

### 7.3 Animacje
- [ ] **Płynność animacji**
  - Sprawdź przejścia między ekranami
  - **Oczekiwany rezultat**: Płynne animacje bez zacinania

---

## 🌐 8. TESTY OFFLINE

### 8.1 Działanie bez Internetu
- [ ] **Wyłącz WiFi/komórkowe**
  - Sprawdź czy aplikacja działa
  - **Oczekiwany rezultat**: Aplikacja działa w trybie offline
  
- [ ] **Synchronizacja po powrocie online**
  - Włącz ponownie internet
  - **Oczekiwany rezultat**: Dane synchronizują się

### 8.2 Kolejka offline
- [ ] **Dodawanie zadań offline**
  - Dodaj zadanie bez internetu
  - **Oczekiwany rezultat**: Zadanie zostaje dodane do kolejki
  
- [ ] **Wysyłanie po powrocie online**
  - Sprawdź czy zadania zostają wysłane
  - **Oczekiwany rezultat**: Wszystkie zadania zostają zsynchronizowane

---

## 🔍 9. TESTY WYDAJNOŚCI

### 9.1 Czas ładowania
- [ ] **Start aplikacji**
  - Zmierz czas od kliknięcia ikony do gotowości
  - **Oczekiwany rezultat**: < 3 sekundy
  
- [ ] **Przełączanie ekranów**
  - Zmierz czas przejścia między ekranami
  - **Oczekiwany rezultat**: < 1 sekunda

### 9.2 Użycie pamięci
- [ ] **Monitorowanie pamięci**
  - Sprawdź użycie RAM podczas użytkowania
  - **Oczekiwany rezultat**: Stabilne użycie bez wycieków

---

## 🐛 10. TESTY BŁĘDÓW I KRAJOWYCH PRZYPADKÓW

### 10.1 Obsługa błędów sieciowych
- [ ] **Błąd połączenia**
  - Symuluj błąd sieci
  - **Oczekiwany rezultat**: Komunikat o błędzie i opcja ponowienia
  
- [ ] **Timeout połączenia**
  - Sprawdź obsługę timeoutów
  - **Oczekiwany rezultat**: Odpowiedni komunikat

### 10.2 Nieprawidłowe dane
- [ ] **Korupcja danych**
  - Wprowadź nieprawidłowe dane
  - **Oczekiwany rezultat**: Walidacja i komunikaty o błędach

### 10.3 Przypadki krańcowe
- [ ] **Bardzo długie teksty**
  - Wprowadź bardzo długi tekst
  - **Oczekiwany rezultat**: Walidacja długości
  
- [ ] **Specjalne znaki**
  - Użyj emoji i znaków specjalnych
  - **Oczekiwany rezultat**: Poprawne wyświetlanie

---

## 📋 11. INSTRUKCJE WYKONANIA

### 11.1 Przygotowanie
1. Zainstaluj aplikację na urządzeniu testowym
2. Przygotuj dane testowe (konta, zadania, budżety)
3. Upewnij się, że masz dostęp do Firebase test environment

### 11.2 Wykonanie testów
1. Wykonuj testy sekcja po sekcji
2. Dokumentuj wszystkie błędy z opisem kroków
3. Zapisuj czas wykonania każdego testu
4. Rob zrzuty ekranu błędów

### 11.3 Raportowanie
1. Stwórz listę wszystkich znalezionych błędów
2. Określ priorytet każdego błędu (Krytyczny/Wysoki/Średni/Niski)
3. Opisz kroki do reprodukcji
4. Dodaj informacje o środowisku (urządzenie, wersja OS)

---

## 🎯 12. KRYTERIA AKCEPTACJI

### 12.1 Funkcjonalność
- [ ] Wszystkie główne funkcje działają poprawnie
- [ ] Walidacja działa na wszystkich polach
- [ ] Synchronizacja danych działa poprawnie

### 12.2 Wydajność
- [ ] Czas ładowania < 3 sekundy
- [ ] Płynne animacje bez zacinania
- [ ] Stabilne użycie pamięci

### 12.3 Stabilność
- [ ] Brak crashów podczas normalnego użytkowania
- [ ] Poprawna obsługa błędów
- [ ] Działanie offline

### 12.4 UX/UI
- [ ] Intuicyjna nawigacja
- [ ] Spójny design
- [ ] Dostępność dla różnych rozmiarów ekranów

---

## 📝 13. SZABLON RAPORTU BŁĘDU

```
**Tytuł błędu**: [Krótki opis problemu]

**Priorytet**: [Krytyczny/Wysoki/Średni/Niski]

**Środowisko**:
- Urządzenie: [Model]
- OS: [Wersja]
- Wersja aplikacji: [Wersja]

**Opis błędu**: [Szczegółowy opis problemu]

**Kroki do reprodukcji**:
1. [Krok 1]
2. [Krok 2]
3. [Krok 3]

**Oczekiwany rezultat**: [Co powinno się stać]

**Rzeczywisty rezultat**: [Co się stało]

**Zrzut ekranu**: [Jeśli dotyczy]

**Dodatkowe informacje**: [Inne istotne szczegóły]
```

---

## 🚀 14. NASTĘPNE KROKI

Po zakończeniu testowania:
1. Przeanalizuj wszystkie znalezione błędy
2. Ustal priorytety napraw
3. Stwórz plan napraw
4. Wykonaj naprawy w kolejności priorytetów
5. Wykonaj testy regresyjne
6. Przygotuj aplikację do wdrożenia

---

**Uwaga**: Ten plan testowania powinien być wykonywany systematycznie, sekcja po sekcji. Każdy znaleziony błąd powinien być dokładnie udokumentowany zgodnie z szablonem raportu błędu.
