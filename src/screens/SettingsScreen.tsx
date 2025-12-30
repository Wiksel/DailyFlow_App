import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { getAuth } from '../utils/authCompat'; // ZMIANA
import { db } from '../utils/firestoreCompat';
import { doc, onSnapshot, updateDoc } from '../utils/firestoreCompat';
import Slider from '@react-native-community/slider';
import { useToast } from '../contexts/ToastContext';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import { useTheme } from '../contexts/ThemeContext';
import AppHeader from '../components/AppHeader';

export interface PrioritySettings {
    criticalThreshold: number;
    urgentThreshold: number;
    soonThreshold: number;
    distantThreshold: number;
    criticalBoost: number;
    urgentBoost: number;
    soonBoost: number;
    distantBoost: number;
    agingBoostDays: number;
    agingBoostAmount: number;
}

const SettingsScreen = () => {
    const [settings, setSettings] = useState<PrioritySettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { showToast } = useToast();
    const theme = useTheme();

    const currentUser = getAuth().currentUser;

    useEffect(() => {
        if (!currentUser) return;
        const userRef = doc(db, 'users', currentUser.uid);
        const unsubscribe = onSnapshot(userRef, (doc) => {
            const data = doc.data();
            setSettings({
                criticalThreshold: data?.prioritySettings?.criticalThreshold ?? 1,
                urgentThreshold: data?.prioritySettings?.urgentThreshold ?? 3,
                soonThreshold: data?.prioritySettings?.soonThreshold ?? 7,
                distantThreshold: data?.prioritySettings?.distantThreshold ?? 14,
                criticalBoost: data?.prioritySettings?.criticalBoost ?? 4,
                urgentBoost: data?.prioritySettings?.urgentBoost ?? 3,
                soonBoost: data?.prioritySettings?.soonBoost ?? 2,
                distantBoost: data?.prioritySettings?.distantBoost ?? 1,
                agingBoostDays: data?.prioritySettings?.agingBoostDays ?? 5,
                agingBoostAmount: data?.prioritySettings?.agingBoostAmount ?? 1,
            });
            setLoading(false);
        });
        return unsubscribe;
    }, [currentUser]);

    const handleSave = async () => {
        if (!currentUser || !settings || saving) return;
        setSaving(true);
        try {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, { prioritySettings: settings });
            showToast('Ustawienia zostały zapisane.', 'success');
        } catch (e) {
            showToast('Nie udało się zapisać ustawień.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleThresholdChange = (key: keyof PrioritySettings, value: number) => {
        if (!settings) return;

        const roundedValue = Math.round(value);
        const newSettings = { ...settings, [key]: roundedValue };

        switch (key) {
            case 'criticalThreshold':
                if (roundedValue >= newSettings.urgentThreshold) {
                    newSettings.urgentThreshold = roundedValue + 1;
                }
                if (newSettings.urgentThreshold >= newSettings.soonThreshold) {
                    newSettings.soonThreshold = newSettings.urgentThreshold + 1;
                }
                if (newSettings.soonThreshold >= newSettings.distantThreshold) {
                    newSettings.distantThreshold = newSettings.soonThreshold + 1;
                }
                break;
            case 'urgentThreshold':
                if (roundedValue <= newSettings.criticalThreshold) {
                    newSettings.criticalThreshold = roundedValue - 1;
                }
                if (roundedValue >= newSettings.soonThreshold) {
                    newSettings.soonThreshold = roundedValue + 1;
                }
                if (newSettings.soonThreshold >= newSettings.distantThreshold) {
                    newSettings.distantThreshold = newSettings.soonThreshold + 1;
                }
                break;
            case 'soonThreshold':
                if (roundedValue <= newSettings.urgentThreshold) {
                    newSettings.urgentThreshold = roundedValue - 1;
                }
                if (roundedValue >= newSettings.distantThreshold) {
                    newSettings.distantThreshold = roundedValue + 1;
                }
                if (newSettings.urgentThreshold <= newSettings.criticalThreshold) {
                    newSettings.criticalThreshold = newSettings.urgentThreshold - 1;
                }
                break;
            case 'distantThreshold':
                if (roundedValue <= newSettings.soonThreshold) {
                    newSettings.soonThreshold = roundedValue - 1;
                }
                if (newSettings.soonThreshold <= newSettings.urgentThreshold) {
                    newSettings.urgentThreshold = newSettings.soonThreshold - 1;
                }
                if (newSettings.urgentThreshold <= newSettings.criticalThreshold) {
                    newSettings.criticalThreshold = newSettings.urgentThreshold - 1;
                }
                break;
            default:
                break;
        }

        if (newSettings.criticalThreshold < 1) newSettings.criticalThreshold = 1;
        if (newSettings.urgentThreshold < 2) newSettings.urgentThreshold = 2;
        if (newSettings.soonThreshold < 3) newSettings.soonThreshold = 3;
        if (newSettings.distantThreshold < 4) newSettings.distantThreshold = 4;

        setSettings(newSettings);
    };

    if (loading || !settings) {
        return (
            <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <AppHeader title="Ustawienia priorytetów" />
            <Animated.View layout={Layout.springify()} style={[GlobalStyles.card, { backgroundColor: theme.colors.card }]}>
                <Text style={styles.sectionTitle}>Priorytety - Deadline</Text>
                <Text style={styles.description}>
                    Dostosuj, jak bardzo priorytet zadania wzrośnie, gdy zbliża się jego termin wykonania. Przesuwanie jednego suwaka dostosuje pozostałe.
                </Text>

                <Text style={styles.label}>Wzrost o +{settings.criticalBoost} (krytyczny)</Text>
                <Text>Gdy do terminu zostało mniej niż: {settings.criticalThreshold} dni</Text>
                {/* ZMIANA: Ujednolicono maximumValue */}
                <Slider
                    value={settings.criticalThreshold}
                    onValueChange={(v) => handleThresholdChange('criticalThreshold', v)}
                    minimumValue={1}
                    maximumValue={90}
                    step={1}
                />

                <View style={styles.separator} />

                <Text style={styles.label}>Wzrost o +{settings.urgentBoost} (pilny)</Text>
                <Text>Gdy do terminu zostało mniej niż: {settings.urgentThreshold} dni</Text>
                {/* ZMIANA: Ujednolicono maximumValue */}
                <Slider
                    value={settings.urgentThreshold}
                    onValueChange={(v) => handleThresholdChange('urgentThreshold', v)}
                    minimumValue={2}
                    maximumValue={90}
                    step={1}
                />

                <View style={styles.separator} />

                <Text style={styles.label}>Wzrost o +{settings.soonBoost} (bliski)</Text>
                <Text>Gdy do terminu zostało mniej niż: {settings.soonThreshold} dni</Text>
                {/* ZMIANA: Ujednolicono maximumValue */}
                <Slider
                    value={settings.soonThreshold}
                    onValueChange={(v) => handleThresholdChange('soonThreshold', v)}
                    minimumValue={3}
                    maximumValue={90}
                    step={1}
                />

                <View style={styles.separator} />

                <Text style={styles.label}>Wzrost o +{settings.distantBoost} (wkrótce)</Text>
                <Text>Gdy do terminu zostało mniej niż: {settings.distantThreshold} dni</Text>
                {/* ZMIANA: Ujednolicono maximumValue */}
                <Slider
                    value={settings.distantThreshold}
                    onValueChange={(v) => handleThresholdChange('distantThreshold', v)}
                    minimumValue={4}
                    maximumValue={90}
                    step={1}
                />
            </Animated.View>
            <Animated.View layout={Layout.springify()} style={[GlobalStyles.card, { backgroundColor: theme.colors.card }]}>
                <Text style={styles.sectionTitle}>Priorytety - Zadania bez terminu</Text>
                <Text style={styles.label}>Zwiększaj o +1 co {settings.agingBoostDays} dni</Text>
                <Slider value={settings.agingBoostDays} onValueChange={(v) => handleThresholdChange('agingBoostDays', v)} minimumValue={1} maximumValue={30} step={1} />
            </Animated.View>
            <Animated.View layout={Layout.springify()}>
                <TouchableOpacity style={[styles.saveButton, saving && GlobalStyles.disabledButton]} onPress={handleSave} disabled={saving}>
                    <Text style={styles.saveButtonText}>{saving ? 'Zapisywanie…' : 'Zapisz ustawienia'}</Text>
                </TouchableOpacity>
            </Animated.View>

            {/* Usunięto ustawienia wyświetlania z ekranu priorytetów */}
        </ScrollView>
    );
};


const styles = StyleSheet.create({
    container: {
        ...GlobalStyles.container,
    },
    centered: {
        ...GlobalStyles.centered,
    },
    section: {
        ...GlobalStyles.section,
    },
    sectionTitle: {
        ...Typography.h3,
        marginBottom: Spacing.small,
    },
    description: {
        ...Typography.body,
        color: Colors.textSecondary,
        marginBottom: Spacing.large,
    },
    label: {
        ...Typography.body,
        fontWeight: Typography.semiBold.fontWeight,
        marginTop: Spacing.medium,
    },
    separator: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: Spacing.large,
    },
    saveButton: {
        ...GlobalStyles.button,
        backgroundColor: Colors.success,
        marginHorizontal: Spacing.medium,
        marginTop: Spacing.large,
        marginBottom: Spacing.xLarge,
    },
    saveButtonText: {
        ...GlobalStyles.buttonText,
    },
    themeChip: {
        paddingHorizontal: Spacing.medium,
        paddingVertical: Spacing.small,
        borderRadius: 20,
        backgroundColor: Colors.inputBackground,
        marginRight: Spacing.small,
    },
    themeChipText: {
        ...Typography.body,
    },
});

export default SettingsScreen;
