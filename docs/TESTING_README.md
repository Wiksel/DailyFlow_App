# 🧪 Testowanie DailyFlow

Ten dokument zawiera instrukcje uruchamiania i zarządzania testami dla aplikacji DailyFlow.

## 📋 Rodzaje Testów

### 1. **Testy Jednostkowe (Unit Tests)**
- **Cel**: Testowanie pojedynczych komponentów, funkcji i hooków
- **Framework**: Jest + React Native Testing Library
- **Pokrycie**: Celujemy w 70%+ pokrycia kodu
- **Lokalizacja**: `src/**/__tests__/`

### 2. **Testy Integracyjne (Integration Tests)**
- **Cel**: Testowanie interakcji między komponentami
- **Framework**: Jest + React Native Testing Library
- **Lokalizacja**: `src/integration-tests/`

### 3. **Testy E2E (End-to-End)**
- **Cel**: Testowanie pełnego przepływu aplikacji
- **Framework**: Detox
- **Platformy**: Android (emulator), iOS (symulator)
- **Lokalizacja**: `e2e/tests/`

### 4. **Testy Manualne**
- **Cel**: Testowanie UX, UI i przypadków krańcowych
- **Dokumentacja**: `docs/MANUAL_TESTING_PLAN.md`

## 🚀 Szybki Start

### Instalacja zależności
```bash
npm install
```

### Uruchomienie wszystkich testów
```bash
# Użyj skryptu (Linux/Mac)
./scripts/run-tests.sh

# Lub ręcznie (Windows)
npm run test:coverage
npm run test:e2e:build
npm run test:e2e
```

## 📱 Konfiguracja Środowiska

### Wymagania
- Node.js 18+
- npm 9+
- Android Studio (dla testów E2E)
- Xcode (dla testów iOS E2E)

### Zmienne środowiskowe
```bash
# Firebase test environment
FIREBASE_PROJECT_ID=dailyflow-test
FIREBASE_API_KEY=your-test-api-key

# Google Sign-In test
GOOGLE_WEB_CLIENT_ID=your-test-client-id
```

## 🧪 Uruchamianie Testów

### Testy Jednostkowe
```bash
# Wszystkie testy
npm run test

# Testy w trybie watch
npm run test:watch

# Testy z pokryciem
npm run test:coverage

# Testy konkretnego pliku
npm test -- --testPathPattern=ActionButton
```

### Testy E2E
```bash
# Budowanie aplikacji
npm run test:e2e:build

# Uruchomienie testów
npm run test:e2E

# Konkretna konfiguracja
npm run test:e2e -- --configuration android.emu.debug
```

## 📊 Raporty i Pokrycie

### Pokrycie kodu
Po uruchomieniu `npm run test:coverage`:
- HTML raport: `coverage/lcov-report/index.html`
- JSON raport: `coverage/coverage-summary.json`
- Terminal output z procentami

### Testy E2E
Po uruchomieniu testów E2E:
- Artefakty: `e2e/artifacts/`
- Screenshots: `e2e/artifacts/screenshots/`
- Logi: `e2e/artifacts/logs/`

## 🔧 Konfiguracja

### Jest (`jest.config.js`)
```javascript
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**/*',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

### Detox (`.detoxrc.js`)
```javascript
module.exports = {
  testRunner: 'jest',
  runnerConfig: 'e2e/config.json',
  configurations: {
    'android.emu.debug': {
      type: 'android.emulator',
      device: { avdName: 'Pixel_4_API_30' },
    },
  },
};
```

## 📝 Pisanie Testów

### Struktura testu jednostkowego
```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Component from '../Component';

describe('Component', () => {
  it('renders correctly', () => {
    const { getByText } = render(<Component />);
    expect(getByText('Hello')).toBeTruthy();
  });

  it('handles user interaction', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(<Component onPress={mockOnPress} />);
    
    fireEvent.press(getByText('Button'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});
```

### Struktura testu E2E
```javascript
const { device, element, by, expect } = require('detox');

describe('Feature', () => {
  it('should work correctly', async () => {
    await expect(element(by.text('Button'))).toBeVisible();
    await element(by.text('Button')).tap();
    await expect(element(by.text('Result'))).toBeVisible();
  });
});
```

## 🐛 Debugowanie Testów

### Testy jednostkowe
```bash
# Debug z Node.js debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Verbose output
npm test -- --verbose

# Test specific file with debug
npm test -- --testPathPattern=Component --verbose
```

### Testy E2E
```bash
# Debug mode
detox test --configuration android.emu.debug --loglevel trace

# Single test
detox test --configuration android.emu.debug --grep "test name"
```

## 📱 Emulatory i Urządzenia

### Android
```bash
# Lista dostępnych emulatorów
emulator -list-avds

# Uruchomienie emulatora
emulator -avd Pixel_4_API_30

# Sprawdzenie urządzeń
adb devices
```

### iOS
```bash
# Lista dostępnych symulatorów
xcrun simctl list devices

# Uruchomienie symulatora
xcrun simctl boot "iPhone 12"
```

## 🔄 CI/CD Integration

### GitHub Actions
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:e2e:build
      - run: npm run test:e2e
```

### Local CI
```bash
# Uruchomienie wszystkich testów lokalnie
./scripts/run-tests.sh

# Sprawdzenie jakości kodu
npm run lint
npm run type-check
```

## 📚 Przydatne Zasoby

### Dokumentacja
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Detox Documentation](https://wix.github.io/Detox/)

### Narzędzia
- [React DevTools](https://github.com/facebook/react-devtools)
- [Flipper](https://fbflipper.com/) - Debugowanie React Native
- [Android Studio](https://developer.android.com/studio) - Emulator Android

## 🚨 Rozwiązywanie Problemów

### Częste problemy

#### Testy nie uruchamiają się
```bash
# Wyczyść cache
npm run test -- --clearCache

# Usuń node_modules i zainstaluj ponownie
rm -rf node_modules package-lock.json
npm install
```

#### Testy E2E nie działają
```bash
# Sprawdź emulator
adb devices

# Wyczyść cache Detox
detox clean-framework-cache

# Uruchom ponownie emulator
emulator -avd Pixel_4_API_30
```

#### Błędy TypeScript
```bash
# Sprawdź typy
npm run type-check

# Wyczyść cache TypeScript
rm -rf node_modules/.cache
```

## 📈 Metryki i Monitoring

### Pokrycie kodu
- Cel: 70%+ dla wszystkich metryk
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

### Czas wykonania testów
- Testy jednostkowe: < 30 sekund
- Testy E2E: < 5 minut
- Całkowity czas: < 10 minut

## 🤝 Współpraca

### Pull Request Checklist
- [ ] Wszystkie testy przechodzą
- [ ] Pokrycie kodu nie spadło
- [ ] Nowe funkcje mają testy
- [ ] Testy E2E przechodzą na emulatorze

### Code Review
- Sprawdź pokrycie testów
- Zweryfikuj jakość testów
- Upewnij się, że testy są deterministyczne

---

## 📞 Wsparcie

W przypadku problemów z testami:
1. Sprawdź logi błędów
2. Upewnij się, że środowisko jest poprawnie skonfigurowane
3. Sprawdź dokumentację frameworków
4. Otwórz issue w repozytorium projektu

**Happy Testing! 🎉**
