import { StyleSheet } from 'react-native';

export const Colors = {
    primary: '#0782F9',      // Główny niebieski
    secondary: '#5bc0de',    // Info / Cyjan
    success: '#28a745',      // Zielony
    danger: '#e74c3c',       // Czerwony
    warning: '#f1c40f',      // Żółty
    info: '#17a2b8',         // Niebiesko-zielony
    light: '#f8f9fa',        // Bardzo jasny szary
    dark: '#343a40',         // Ciemny szary
    textPrimary: '#333',     // Ciemny tekst
    textSecondary: '#6c757d', // Szary tekst
    backgroundLight: '#f5f5f5', // Jasne tło aplikacji
    border: '#eee',          // Kolor obramowań
    inputBackground: '#f1f3f5', // Tło pól input
    activeTab: '#0782F9',    // Kolor aktywnej zakładki
    inactiveTab: 'gray',     // Kolor nieaktywnej zakładki
    shadow: '#000',          // Kolor cienia
    placeholder: '#adb5bd',  // Kolor placeholderów
    disabled: '#a9d4ff',     // Kolor dla wyłączonych elementów (jasny niebieski)
    error: '#dc3545',        // Czerwony dla błędów (toast, itp.)
};

export const Typography = {
    h1: { fontSize: 28, fontWeight: '700' as '700', color: Colors.textPrimary },
    h2: { fontSize: 22, fontWeight: '700' as '700', color: Colors.textPrimary },
    h3: { fontSize: 18, fontWeight: '700' as '700', color: Colors.textPrimary },
    body: { fontSize: 16, color: Colors.textPrimary },
    small: { fontSize: 12, color: Colors.textSecondary },
    bold: { fontWeight: '700' as '700' },
    semiBold: { fontWeight: '600' as '600' },
};

export const Spacing = {
    xSmall: 4,
    small: 8,
    medium: 15,
    large: 20,
    xLarge: 40,
    xxLarge: 60, // Dla paddingTop w headerach
};

export const GlobalStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundLight,
    },
    centered: { // <--- DODAJ TEN NOWY STYL
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    section: {
        backgroundColor: 'white',
        padding: Spacing.large,
        marginTop: Spacing.medium,
        borderRadius: 10,
        marginHorizontal: Spacing.medium,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
        elevation: 3,
    },
    input: {
        width: '100%',
        backgroundColor: Colors.inputBackground,
        paddingHorizontal: Spacing.medium,
        paddingVertical: Spacing.small + 2, // 10px
        borderRadius: 8,
        fontSize: Typography.body.fontSize,
        color: Colors.textPrimary,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    button: { // Podstawowy styl dla ActionButton
        backgroundColor: Colors.primary,
        padding: Spacing.medium,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
    },
    buttonText: {
        color: 'white',
        fontWeight: Typography.bold.fontWeight,
        fontSize: Typography.body.fontSize,
    },
    disabledButton: { // Styl dla wyłączonego przycisku
        backgroundColor: Colors.disabled,
    },
    slider: { // Ten styl jest teraz częścią GlobalStyles
        width: '100%',
        height: 40,
    },
});

// Funkcja pomocnicza do sprawdzania jasności koloru HEX
export const isColorLight = (hexColor: string) => {
    // Usuń # jeśli jest
    const cleanHex = hexColor.startsWith('#') ? hexColor.substring(1) : hexColor;
    if (cleanHex.length !== 6) return false; // Upewnij się, że to poprawny hex

    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);

    // Obliczenie luminancji (ITU-R BT.709)
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.5; // Próg 0.5 jest często używany jako punkt odcięcia
};