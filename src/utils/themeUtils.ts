import { Accent, ThemeColors, lightColors, darkColors } from '../contexts/ThemeContext';

export const getAccentColors = (accent: Accent): { light: string; dark: string } => {
    // Logic mirrored from ThemeContext to ensure consistency
    // Rose: Pastel Rose (Light) / Blue (Dark)
    // Others: Specific shades

    const lightPrimary = (() => {
        switch (accent) {
            case 'blue': return lightColors.primary;
            case 'purple': return lightColors.purple;
            case 'mint': return '#2ec4b6';
            case 'orange': return '#ff7f11';
            case 'rose': return '#C77D98';
            default: return lightColors.primary;
        }
    })();

    const darkPrimary = (() => {
        switch (accent) {
            case 'blue': return darkColors.primary;
            case 'purple': return darkColors.purple;
            case 'mint': return '#5bd8b2';
            case 'orange': return '#ff9f43';
            case 'rose': return '#4DA3FF'; // Rose maps to Blue in Dark Mode
            default: return darkColors.primary;
        }
    })();

    return { light: lightPrimary, dark: darkPrimary };
};

export const getSpherePalette = (accent: Accent, mode: 'light' | 'dark'): string[] => {
    const isDark = mode === 'dark';

    if (accent === 'rose') {
        if (isDark) {
            // Dark Mode for Rose is Blue aesthetic
            return [
                'rgba(33, 150, 243, 0.3)',   // Blue 500
                'rgba(25, 118, 210, 0.3)',   // Blue 700
                'rgba(66, 165, 245, 0.2)',   // Blue 400
                'rgba(13, 71, 161, 0.3)',    // Blue 900
                'rgba(100, 181, 246, 0.2)',  // Blue 300
            ];
        } else {
            // Light Mode for Rose
            return [
                'rgba(199, 125, 152, 0.75)',  // Accent - Primary
                'rgba(199, 125, 152, 0.65)',  // Pastel Rose 
                'rgba(219, 112, 147, 0.55)',  // Clear PaleVioletRed
                'rgba(255, 182, 193, 0.70)',  // Light Pink
                'rgba(199, 125, 152, 0.60)',  // Accent repeat
            ];
        }
    }

    if (accent === 'blue') {
        if (isDark) {
            return [
                'rgba(33, 150, 243, 0.3)',
                'rgba(25, 118, 210, 0.3)',
                'rgba(66, 165, 245, 0.2)',
                'rgba(13, 71, 161, 0.3)',
                'rgba(100, 181, 246, 0.2)',
            ];
        } else {
            return [
                'rgba(7, 130, 249, 0.75)',
                'rgba(7, 130, 249, 0.65)',
                'rgba(23, 162, 184, 0.55)',
                'rgba(100, 181, 246, 0.70)',
                'rgba(7, 130, 249, 0.60)',
            ];
        }
    }

    if (accent === 'purple') {
        if (isDark) {
            return [
                'rgba(179, 157, 219, 0.3)',
                'rgba(149, 117, 205, 0.3)',
                'rgba(209, 196, 233, 0.2)',
                'rgba(103, 58, 183, 0.3)',
                'rgba(179, 157, 219, 0.2)',
            ];
        } else {
            return [
                'rgba(126, 87, 194, 0.75)',
                'rgba(126, 87, 194, 0.65)',
                'rgba(179, 157, 219, 0.55)',
                'rgba(209, 196, 233, 0.70)',
                'rgba(126, 87, 194, 0.60)',
            ];
        }
    }

    if (accent === 'mint') {
        if (isDark) {
            return [
                'rgba(91, 216, 178, 0.3)',
                'rgba(46, 196, 182, 0.3)',
                'rgba(167, 255, 235, 0.2)',
                'rgba(0, 150, 136, 0.3)',
                'rgba(91, 216, 178, 0.2)',
            ];
        } else {
            return [
                'rgba(46, 196, 182, 0.75)',
                'rgba(46, 196, 182, 0.65)',
                'rgba(128, 203, 196, 0.55)',
                'rgba(178, 223, 219, 0.70)',
                'rgba(46, 196, 182, 0.60)',
            ];
        }
    }

    if (accent === 'orange') {
        if (isDark) {
            return [
                'rgba(255, 159, 67, 0.3)',
                'rgba(255, 127, 17, 0.3)',
                'rgba(255, 204, 128, 0.2)',
                'rgba(230, 81, 0, 0.3)',
                'rgba(255, 159, 67, 0.2)',
            ];
        } else {
            return [
                'rgba(255, 127, 17, 0.75)',
                'rgba(255, 127, 17, 0.65)',
                'rgba(255, 179, 71, 0.55)',
                'rgba(255, 224, 178, 0.70)',
                'rgba(255, 127, 17, 0.60)',
            ];
        }
    }

    // Default to Blue fallback
    return [
        'rgba(7, 130, 249, 0.75)',
        'rgba(7, 130, 249, 0.65)',
        'rgba(23, 162, 184, 0.55)',
        'rgba(100, 181, 246, 0.70)',
        'rgba(7, 130, 249, 0.60)',
    ];
};

export const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
};
