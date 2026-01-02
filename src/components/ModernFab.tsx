import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import Animated, { useAnimatedStyle, withSpring, withTiming, withDelay, useSharedValue, interpolate } from 'react-native-reanimated';
import { Colors, Spacing, Effects } from '../styles/AppStyles';

interface Props {
    onAddPress: () => void;
    onTemplatePress: () => void;
    showSharedWarning?: boolean;
}

const FabGroup: React.FC<Props> = ({ onAddPress, onTemplatePress, showSharedWarning }) => {
    const theme = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const animation = useSharedValue(0);

    const toggleMenu = () => {
        const toValue = isOpen ? 0 : 1;
        animation.value = withSpring(toValue, { damping: 15, stiffness: 120 });
        setIsOpen(!isOpen);
    };

    const mainButtonStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${interpolate(animation.value, [0, 1], [0, 45])}deg` }],
    }));

    const templateStyle = useAnimatedStyle(() => ({
        opacity: animation.value,
        transform: [
            { scale: animation.value },
            { translateY: interpolate(animation.value, [0, 1], [0, -70]) }
        ],
    }));

    const labelStyle = useAnimatedStyle(() => ({
        opacity: animation.value,
        transform: [{ translateX: interpolate(animation.value, [0, 1], [20, 0]) }]
    }));

    return (
        <View style={styles.container}>
            {/* Template Action */}
            <View style={styles.actionItemContainer}>
                <Animated.View style={[styles.labelContainer, labelStyle]}>
                    <Text style={styles.labelText}>Szablon</Text>
                </Animated.View>
                <Animated.View style={[styles.actionButtonContainer, templateStyle]}>
                    <TouchableOpacity
                        style={[styles.smallFab, { backgroundColor: theme.colors.info }]}
                        onPress={() => { toggleMenu(); onTemplatePress(); }}
                    >
                        <Feather name="copy" size={20} color="white" />
                    </TouchableOpacity>
                </Animated.View>
            </View>

            {/* Quick Add Action (Primary) - We can keep this separate or grouped. 
                User disliked standard icons. Let's make the main FAB a "Menu" or "Add" that expands. 
                If they just want "Add Task" to be instant, we can keep it as the main action, 
                and long press or separate button for others. 
                For now, let's try the expanding menu approach.
            */}

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                    if (isOpen) toggleMenu();
                    else onAddPress(); // Default to Add Task on tap? Or toggle?
                    // User wants "better icons". Let's stick to toggle for "More" or just a better Plus.
                    // If we want instant add, we shouldn't hide it behind a menu.
                    // Let's make main button = Add Task. Small button next to it = Templates.
                }}
                onLongPress={toggleMenu} // Long press to open extended menu
                activeOpacity={0.8}
            >
                <Animated.View style={mainButtonStyle}>
                    <Feather name="plus" size={28} color="white" />
                </Animated.View>
            </TouchableOpacity>

            {/* Alternative Main FAB approach: The main FAB adds task. A secondary small FAB sits above/side for Templates. */}
        </View>
    );
};

// Let's try a different Approach: "Action Bar" floating or just refined separate buttons.
// User said "icons... do something appropriate".
// Let's create a "ModernFab" that is just the button but cleaner.

const ModernFab: React.FC<Props> = ({ onAddPress, onTemplatePress }) => {
    const theme = useTheme();

    return (
        <View style={styles.rowContainer}>
            <TouchableOpacity
                style={[styles.secondaryFab, { backgroundColor: theme.colors.card }]}
                onPress={onTemplatePress}
            >
                <Feather name="layers" size={22} color={theme.colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.primaryFab, { backgroundColor: theme.colors.primary }]}
                onPress={onAddPress}
            >
                <Feather name="plus" size={32} color="white" />
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        position: 'absolute',
        bottom: 0,
        right: 0,
    },
    rowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingRight: Spacing.medium,
        paddingBottom: Spacing.medium,
    },
    primaryFab: {
        width: 64,
        height: 64,
        borderRadius: 24, // Squircle
        justifyContent: 'center',
        alignItems: 'center',
        ...Effects.shadow,
        shadowColor: Colors.primary,
        shadowOpacity: 0.4,
        elevation: 8,
    },
    secondaryFab: {
        width: 48,
        height: 48,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        ...Effects.shadow,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)'
    },
    actionItemContainer: {
        alignItems: 'center',
        marginBottom: 16,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        width: 200,
        paddingRight: 8,
    },
    labelContainer: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginRight: 12,
    },
    labelText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    actionButtonContainer: {},
    smallFab: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
    },
    fab: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
    },
});

export default ModernFab;
