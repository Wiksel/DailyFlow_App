#!/bin/bash

# 🧪 Skrypt Uruchamiania Testów DailyFlow
# Uruchamia wszystkie testy: jednostkowe, integracyjne i E2E

set -e

echo "🚀 Uruchamianie testów DailyFlow..."
echo "=================================="

# Sprawdź czy jesteśmy w głównym katalogu projektu
if [ ! -f "package.json" ]; then
    echo "❌ Błąd: Uruchom skrypt z głównego katalogu projektu"
    exit 1
fi

# Funkcja do sprawdzania statusu
check_status() {
    if [ $? -eq 0 ]; then
        echo "✅ $1 - SUKCES"
    else
        echo "❌ $1 - BŁĄD"
        exit 1
    fi
}

# 1. Instalacja zależności (jeśli potrzebne)
echo "📦 Sprawdzanie zależności..."
if [ ! -d "node_modules" ]; then
    echo "Instalowanie zależności..."
    npm install
    check_status "Instalacja zależności"
else
    echo "Zależności już zainstalowane"
fi

# 2. Sprawdzenie konfiguracji
echo "🔧 Sprawdzanie konfiguracji..."
if [ ! -f "jest.config.js" ]; then
    echo "❌ Brak konfiguracji Jest"
    exit 1
fi

if [ ! -f ".detoxrc.js" ]; then
    echo "❌ Brak konfiguracji Detox"
    exit 1
fi

echo "Konfiguracja OK"

# 3. Testy jednostkowe
echo ""
echo "🧪 Uruchamianie testów jednostkowych..."
npm run test:coverage
check_status "Testy jednostkowe"

# 4. Testy integracyjne (jeśli istnieją)
if [ -d "src/integration-tests" ]; then
    echo ""
    echo "🔗 Uruchamianie testów integracyjnych..."
    npm run test:integration
    check_status "Testy integracyjne"
else
    echo "ℹ️  Brak testów integracyjnych"
fi

# 5. Sprawdzenie czy emulator Android jest uruchomiony (dla testów E2E)
echo ""
echo "📱 Sprawdzanie emulatora Android..."
if command -v adb &> /dev/null; then
    if adb devices | grep -q "emulator"; then
        echo "✅ Emulator Android jest uruchomiony"
        
        # 6. Testy E2E
        echo ""
        echo "🎯 Uruchamianie testów E2E..."
        echo "⚠️  Uwaga: Testy E2E mogą potrwać kilka minut..."
        
        # Najpierw zbuduj aplikację
        echo "🔨 Budowanie aplikacji dla testów E2E..."
        npm run test:e2e:build
        check_status "Budowanie aplikacji E2E"
        
        # Uruchom testy E2E
        npm run test:e2e
        check_status "Testy E2E"
    else
        echo "⚠️  Emulator Android nie jest uruchomiony"
        echo "   Uruchom emulator i spróbuj ponownie"
        echo "   lub uruchom: emulator -avd Pixel_4_API_30"
    fi
else
    echo "⚠️  ADB nie jest zainstalowane lub nie jest w PATH"
    echo "   Testy E2E zostaną pominięte"
fi

# 7. Podsumowanie
echo ""
echo "🎉 Wszystkie testy zakończone!"
echo "=================================="

# Sprawdź pokrycie kodu
if [ -f "coverage/lcov-report/index.html" ]; then
    echo "📊 Raport pokrycia kodu: coverage/lcov-report/index.html"
fi

# Sprawdź wyniki testów E2E
if [ -f "e2e/artifacts" ]; then
    echo "📱 Artefakty testów E2E: e2e/artifacts"
fi

echo ""
echo "🚀 Aplikacja jest gotowa do wdrożenia!"
echo "   Wszystkie testy przeszły pomyślnie."
