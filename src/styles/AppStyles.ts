import { StyleSheet } from 'react-native';

export const Colors = {
    primary: '#0782F9',      // Główny niebieski
    purple: '#7e57c2',       // Przyjemny fiolet
    secondary: '#5bc0de',    // Info / Cyjan
    success: '#28a745',      // Zielony
    danger: '#e74c3c',       // Czerwony
    warning: '#f1c40f',      // Żółty
    info: '#17a2b8',         // Niebiesko-zielony
    light: '#f8f9fa',        // Bardzo jasny szary
    dark: '#343a40',         // Ciemny szary
    // Colors update for better dark mode support
    textPrimary: '#333',     // Ciemny tekst (will be inverted in ThemeContext usually, but here is base)
    textSecondary: '#6c757d', // Szary tekst
    backgroundLight: '#f5f5f5',
    border: '#2b2b2b33',      // Increased contrast for border
    inputBackground: '#e9ecef', // Slightly darker for better visibility in light, valid in dark if handled
    activeTab: '#0782F9',
    inactiveTab: 'gray',
    shadow: '#000',
    placeholder: '#adb5bd',
    disabled: '#a9d4ff',
    error: '#dc3545',

    // Explicit Dark Mode Palette (used via ThemeContext usually, but defining standards here)
    darkBackground: '#121212',
    darkCard: '#1e1e1e',
    darkText: '#f8f9fa',
    darkBorder: '#404040',
};

export const Typography = {
    h1: { fontSize: 28, fontWeight: '700' as '700' }, // Removed rigid color
    h2: { fontSize: 22, fontWeight: '700' as '700' },
    h3: { fontSize: 18, fontWeight: '700' as '700' },
    body: { fontSize: 16 },
    small: { fontSize: 12 },
    bold: { fontWeight: '700' as '700' },
    semiBold: { fontWeight: '600' as '600' },
};

export const densityScale = (base: number, isCompact: boolean) => Math.round(base * (isCompact ? 0.9 : 1));

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
        backgroundColor: 'transparent',
    },
    screenPadding: {
        paddingHorizontal: 16,
    },
    card: {
        backgroundColor: 'white',
        padding: Spacing.large,
        borderRadius: 12,
        marginHorizontal: Spacing.medium,
        marginTop: Spacing.medium,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    rowPress: {
        borderRadius: 12,
        overflow: 'hidden',
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
        flexDirection: 'row',
    },
    buttonText: {
        color: 'white',
        fontWeight: Typography.bold.fontWeight,
        fontSize: Typography.body.fontSize,
    },
    disabledButton: { // Styl dla wyłączonego przycisku
        backgroundColor: '#1a2a3a', // Ciemniejsza mieszanka niebieskiego i czarnego
    },
    disabledButtonText: { // Styl dla tekstu wyłączonego przycisku
        color: '#6c757d', // Szary kolor tekstu
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