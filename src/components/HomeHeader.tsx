import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, BackHandler } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, Typography, Glass, Effects, Colors } from '../styles/AppStyles';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    interpolate,
    FadeIn,
    FadeOut
} from 'react-native-reanimated';

interface Props {
    title?: string;
    subtitle?: string;
    avatarUrl?: string | null;
    onAvatarPress?: () => void;
    // Search Props
    isSearchActive: boolean;
    onToggleSearch: () => void;
    searchQuery: string;
    onSearchChange: (text: string) => void;
    onArchivePress?: () => void;
}

const HomeHeader: React.FC<Props> = ({
    title = 'Twoje Zadania',
    subtitle,
    avatarUrl,
    onAvatarPress,
    isSearchActive,
    onToggleSearch,
    searchQuery,
    onSearchChange,
    onArchivePress
}) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const isDark = theme.colorScheme === 'dark';
    const glassStyle = isDark ? Glass.dark : Glass.light;

    const dateStr = subtitle || format(new Date(), 'EEEE, d MMMM', { locale: pl });

    // Animations
    const searchWidth = useSharedValue(isSearchActive ? 1 : 0);

    useEffect(() => {
        searchWidth.value = withSpring(isSearchActive ? 1 : 0, { damping: 15 });
    }, [isSearchActive]);

    const titleStyle = useAnimatedStyle(() => ({
        opacity: interpolate(searchWidth.value, [0, 0.8, 1], [1, 0, 0]),
        transform: [{ translateX: interpolate(searchWidth.value, [0, 1], [0, -20]) }]
    }));

    const searchContainerStyle = useAnimatedStyle(() => ({
        flex: interpolate(searchWidth.value, [0, 1], [0, 1]),
        opacity: interpolate(searchWidth.value, [0, 0.5, 1], [0, 0, 1]),
        transform: [{ scaleX: searchWidth.value }]
    }));

    const toggleTheme = () => {
        theme.setMode(isDark ? 'light' : 'dark');
    };

    return (
        <View style={[styles.container, {
            paddingTop: insets.top + Spacing.small,
        }]}>
            {/* Standard Title / Date */}
            <View style={[styles.textContainer, isSearchActive && styles.hidden]}>
                <Animated.View style={titleStyle}>
                    <Text style={[styles.dateText, { color: glassStyle.textSecondary }]}>
                        {dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}
                    </Text>
                    <Text style={[styles.titleText, { color: glassStyle.textPrimary }]}>
                        {title}
                    </Text>
                </Animated.View>
            </View>

            {/* Expandable Search Input */}
            {isSearchActive && (
                <Animated.View style={[styles.searchContainer, searchContainerStyle]}>
                    <TextInput
                        autoFocus
                        placeholder="Szukaj zadań..."
                        placeholderTextColor={theme.colors.placeholder}
                        value={searchQuery}
                        onChangeText={onSearchChange}
                        style={[styles.searchInput, { color: theme.colors.textPrimary }]}
                    />
                </Animated.View>
            )}

            {/* Actions Section */}
            <View style={styles.actionsContainer}>
                {!isSearchActive && (
                    <Animated.View entering={FadeIn} exiting={FadeOut} style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity
                            style={[styles.iconButton, { backgroundColor: glassStyle.inputBackground, marginRight: 0 }]}
                            onPress={toggleTheme}
                        >
                            <Feather name={isDark ? "sun" : "moon"} size={20} color={glassStyle.textPrimary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.iconButton, { backgroundColor: glassStyle.inputBackground }]}
                            onPress={onArchivePress}
                        >
                            <Feather name="archive" size={20} color={glassStyle.textPrimary} />
                        </TouchableOpacity>
                    </Animated.View>
                )}

                <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: isSearchActive ? theme.colors.primary : glassStyle.inputBackground }]}
                    onPress={onToggleSearch}
                >
                    <Feather name={isSearchActive ? "x" : "search"} size={20} color={isSearchActive ? 'white' : glassStyle.textPrimary} />
                </TouchableOpacity>

                <TouchableOpacity onPress={onAvatarPress} style={styles.avatarContainer}>
                    {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={[styles.avatar, { borderColor: theme.colors.primary }]} />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}>
                            <Feather name="user" size={18} color="white" />
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.medium,
        paddingBottom: Spacing.medium,
        zIndex: 10,
        height: 80, // Enforce min height to prevent jumps
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    hidden: {
        display: 'none' // Or opacity 0 absolute
    },
    searchContainer: {
        flex: 1,
        marginRight: 10,
        height: 40,
        justifyContent: 'center',
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        paddingHorizontal: 0,
    },
    dateText: {
        ...Typography.small,
        fontWeight: '600',
        marginBottom: 2,
        opacity: 0.8,
    },
    titleText: {
        ...Typography.h2,
        letterSpacing: 0.3,
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        ...Effects.shadow,
        shadowOpacity: 0.05,
        elevation: 2,
    },
    avatarContainer: {
        marginLeft: 4,
        ...Effects.shadow,
        shadowOpacity: 0.1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    }
});

export default HomeHeader;
