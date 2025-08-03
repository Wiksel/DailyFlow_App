1. Przegląd i Wizja Projektu
DailyFlow to kompleksowa aplikacja mobilna cross-platformowa (działająca na iOS i Android) zaprojektowana jako zintegrowane centrum organizacji codziennego życia dla pojedynczych użytkowników oraz par. Celem projektu jest zastąpienie potrzeby korzystania z wielu oddzielnych aplikacji poprzez połączenie zaawansowanego menedżera zadań, systemu zarządzania budżetem oraz narzędzi do współpracy w jednym, spójnym ekosystemie.

Kluczowe Filary Wizji:
    - Zintegrowane Zarządzanie: Aplikacja ma być jednym miejscem do planowania obowiązków, śledzenia celów finansowych i komunikacji w ramach wspólnego gospodarstwa domowego.

    - Inteligentna Priorytetyzacja: DailyFlow nie jest pasywnym magazynem danych. Aktywnie pomaga użytkownikom skupić się na tym, co najważniejsze, poprzez w pełni konfigurowalny, dynamiczny system priorytetów, który reaguje na upływ czasu i zbliżające się terminy.

    - Współpraca i Komunikacja: Rdzeniem aplikacji jest możliwość współdzielenia zadań i budżetów w parze, co promuje transparentność i ułatwia podział obowiązków. Informacje o tym, kto stworzył i wykonał dane zadanie, są kluczowym elementem tej filozofii.

    - Motywacja i Personalizacja: Elementy grywalizacji (punkty za wykonane zadania) oraz głęboka personalizacja (własne szablony zadań, konfigurowalne priorytety) mają na celu budowanie pozytywnych nawyków i sprawienie, że organizacja staje się satysfakcjonującym procesem.

2. Stos Technologiczny
Do budowy aplikacji wykorzystujemy nowoczesny i wydajny stos technologiczny, zapewniający szybki rozwój, bezpieczeństwo danych i doskonałe doświadczenie użytkownika na obu platformach mobilnych.

    - Framework: React Native z Expo – pozwala na pisanie aplikacji w jednym języku i kompilowanie jej na iOS i Androida.

    - Język: TypeScript – gwarantuje bezpieczeństwo typów, co jest kluczowe w tak rozbudowanym projekcie, minimalizując liczbę błędów i ułatwiając utrzymanie kodu.

    - Backend i Baza Danych: Firebase (Google Cloud Platform):

        - Firestore: Elastyczna, działająca w czasie rzeczywistym baza danych NoSQL, w której przechowujemy wszystkie kolekcje: users, tasks, budgets, expenses, pairs oraz choreTemplates.

        - Firebase Authentication: Bezpieczny system do zarządzania tożsamością użytkowników (rejestracja, logowanie przez e-mail i hasło).

    - Nawigacja: React Navigation – wykorzystujemy zarówno nawigację stosową (createNativeStackNavigator) do przechodzenia w głąb poszczególnych modułów, jak i nawigację tablicową (createBottomTabNavigator) do przełączania się między głównymi sekcjami aplikacji (Zadania i Budżet).

    - Biblioteki UI: @expo/vector-icons (ikony), @react-native-community/slider (suwaki), @react-native-community/datetimepicker (selektor daty).