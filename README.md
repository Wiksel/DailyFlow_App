# DailyFlow

Aplikacja mobilna do zarządzania zadaniami i budżetem, napisana w React Native z TypeScript.

## 🚀 Funkcje

- **Zarządzanie zadaniami** - dodawanie, edycja, archiwizacja zadań
- **System kategorii** - organizacja zadań według kategorii
- **Budżet** - śledzenie wydatków i oszczędności
- **Autoryzacja** - logowanie przez email, Google, SMS
- **Pary** - współdzielenie zadań i budżetu z partnerem
- **Priorytety** - system priorytetów z automatycznym przeliczaniem
- **Szablony zadań** - szybkie dodawanie powtarzających się zadań

## 🛠 Technologie

- **React Native** - framework mobilny
- **TypeScript** - typowanie statyczne
- **Firebase** - backend i autoryzacja
- **React Navigation** - nawigacja
- **React Native Reanimated** - animacje
- **Expo** - narzędzia deweloperskie

## 📱 Wymagania systemowe

- Node.js 18+
- npm lub yarn
- Expo CLI
- Android Studio / Xcode (dla buildów natywnych)

## 🚀 Instalacja

1. **Sklonuj repozytorium**
   ```bash
   git clone <repository-url>
   cd DailyFlow
   ```

2. **Zainstaluj zależności**
   ```bash
   npm install
   ```

3. **Skonfiguruj Firebase**
   - Utwórz projekt w Firebase Console
   - Pobierz plik `google-services.json` (Android)
   - Skonfiguruj `firebaseConfig.ts` z własnymi danymi

4. **Uruchom aplikację**
   ```bash
   npm start
   ```

## 📁 Struktura projektu

```
src/
├── components/          # Komponenty reużywalne
├── contexts/           # Konteksty React
├── hooks/              # Hooki niestandardowe
├── navigation/          # Konfiguracja nawigacji
├── screens/            # Ekrany aplikacji
├── styles/             # Style globalne
├── types/              # Definicje typów TypeScript
└── utils/              # Funkcje pomocnicze
```

## 🧪 Testy

```bash
# Sprawdź typy TypeScript
npm run type-check

# Uruchom ESLint
npm run lint

# Napraw błędy ESLint
npm run lint:fix

# Sformatuj kod
npm run format
```

## 📦 Build

```bash
# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

## 🔧 Konfiguracja

### Zmienne środowiskowe

Utwórz plik `.env` w głównym katalogu:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### ESLint i Prettier

Projekt używa ESLint i Prettier do formatowania kodu. Konfiguracja znajduje się w:
- `.eslintrc.js` - reguły ESLint
- `.prettierrc` - konfiguracja Prettier

## 🤝 Współpraca

1. Fork projektu
2. Utwórz branch (`git checkout -b feature/amazing-feature`)
3. Commit zmiany (`git commit -m 'Add amazing feature'`)
4. Push do branch (`git push origin feature/amazing-feature`)
5. Otwórz Pull Request

## 📄 Licencja

Ten projekt jest licencjonowany na licencji 0BSD - zobacz plik [LICENSE](LICENSE) dla szczegółów.

## 🆘 Wsparcie

Jeśli napotkasz problemy:

1. Sprawdź [Issues](../../issues)
2. Utwórz nowy issue z opisem problemu
3. Dołącz logi błędów i kroki reprodukcji

## 🔄 Changelog

### v1.0.0
- Pierwsza wersja aplikacji
- Podstawowe funkcje zarządzania zadaniami
- System autoryzacji
- Zarządzanie budżetem