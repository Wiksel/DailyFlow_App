import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ActivityIndicator, Switch, Platform, Pressable } from 'react-native';
import Animated, { FadeInUp, Layout, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useUI } from '../contexts/UIContext';
import { densityScale } from '../styles/AppStyles';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import auth, { getAuth } from '@react-native-firebase/auth';
import { db } from '../../firebaseConfig';
import { collection, query, where, onSnapshot, addDoc, doc, getDoc } from 'firebase/firestore';
import { Feather } from '@expo/vector-icons';
import { BudgetStackParamList } from '../types/navigation';
import { useToast } from '../contexts/ToastContext';
import EmptyState from '../components/EmptyState';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import { useTheme } from '../contexts/ThemeContext';
import AppHeader from '../components/AppHeader';

interface Budget {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    isShared: boolean;
    ownerId: string;
    pairId: string | null;
    members: string[];
}

const BudgetsScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<BudgetStackParamList>>();
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [newBudgetName, setNewBudgetName] = useState('');
    const [newBudgetAmount, setNewBudgetAmount] = useState('');
    const [isShared, setIsShared] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSubmittingBudget, setIsSubmittingBudget] = useState(false);
    const [pairId, setPairId] = useState<string | null>(null);
    const { density } = useUI();
    const theme = useTheme();
    const isCompact = density === 'compact';

    const currentUser = getAuth().currentUser;
    const { showToast } = useToast();

    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }

        const userDocRef = doc(db, 'users', currentUser.uid);
        const userUnsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
            setPairId(docSnapshot.data()?.pairId || null);
        }, (error) => {
            console.error("Błąd pobierania danych użytkownika dla budżetów:", error);
            showToast("Błąd pobierania danych użytkownika.", 'error');
        });

        const budgetsRef = collection(db, 'budgets');
        const q = query(budgetsRef, where('members', 'array-contains', currentUser.uid));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const budgetsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget));
            setBudgets(budgetsData);
            setLoading(false);
        }, (error) => {
            console.error("Błąd pobierania budżetów: ", error);
            showToast("Błąd pobierania budżetów.", 'error');
            setLoading(false);
        });

        return () => {
            unsubscribe();
            userUnsubscribe();
        };
    }, [currentUser]);

    const handleAddBudget = async () => {
        if (!newBudgetName.trim() || !newBudgetAmount.trim() || !currentUser) {
            showToast("Proszę wypełnić wszystkie pola.", 'error');
            return;
        }
        if (isShared && !pairId) {
            showToast("Musisz być w parze, aby stworzyć wspólny budżet.", 'error');
            return;
        }

        const targetAmount = parseFloat(newBudgetAmount);
        if (isNaN(targetAmount) || targetAmount <= 0) {
            showToast("Proszę podać poprawną kwotę docelową.", 'error');
            return;
        }

        setIsSubmittingBudget(true);
        try {
            let actualMembers = [currentUser.uid];
            if (isShared && pairId) {
                const pairDoc = await getDoc(doc(db, 'pairs', pairId));
                if (pairDoc.exists()) {
                    const partnerId = pairDoc.data()?.members.find((id: string) => id !== currentUser.uid);
                    if (partnerId) {
                        actualMembers.push(partnerId);
                    }
                }
            }

            await addDoc(collection(db, 'budgets'), {
                name: newBudgetName.trim(),
                targetAmount: targetAmount,
                currentAmount: 0,
                isShared: isShared,
                ownerId: currentUser.uid,
                pairId: isShared ? pairId : null,
                members: actualMembers
            });

            showToast("Budżet dodany pomyślnie!", 'success');
            setModalVisible(false);
            setNewBudgetName('');
            setNewBudgetAmount('');
            setIsShared(false);
        } catch (error: any) {
            console.error("Błąd dodawania budżetu");
            showToast('Błąd dodawania budżetu.', 'error');
        } finally {
            setIsSubmittingBudget(false);
        }
    };

    const getProgressBarColor = (progress: number) => {
        if (progress >= 100) return theme.colors.danger;
        if (progress >= 75) return theme.colors.warning;
        return theme.colors.success;
    };

    const renderBudget = ({ item }: { item: Budget }) => {
        const progress = item.targetAmount > 0 ? (item.currentAmount / item.targetAmount) * 100 : 0;
        const progressBarColor = getProgressBarColor(progress);
        const scale = useSharedValue(1);
        const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

        return (
             <Pressable
              onPressIn={() => { scale.value = withSpring(0.98, { damping: 15 }); }}
              onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
              onPress={() => navigation.navigate('BudgetDetail', { budgetId: item.id })}
              android_ripple={{ color: '#0000001a' }}
            >
                <Animated.View entering={FadeInUp} layout={Layout.springify()} style={[
                    styles.budgetItem,
                    { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderWidth: 1 },
                    isCompact && { paddingVertical: Spacing.medium, paddingHorizontal: Spacing.medium },
                    animatedStyle
                ]}>
                    <View style={styles.budgetInfo}>
                        <Text style={[styles.budgetName, { color: theme.colors.textPrimary }, isCompact && { fontSize: densityScale(Typography.h3.fontSize, true) }]} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
                        <Text style={[styles.budgetAmount, { color: theme.colors.textSecondary }, isCompact && { fontSize: densityScale(Typography.small.fontSize + 2, true) }]}>
                            {item.currentAmount.toFixed(2)} zł / {item.targetAmount.toFixed(2)} zł
                        </Text>
                    </View>
                    {item.isShared && <Feather name="users" size={24} color={theme.colors.textSecondary} />}
                    <View style={[styles.progressBarContainer, { backgroundColor: theme.colors.border }]}>
                        <View style={[styles.progressBar, { width: `${Math.min(progress, 100)}%`, backgroundColor: progressBarColor }]} />
                    </View>
                </Animated.View>
            </Pressable>
        );
    };

    if (loading) {
        return (
            <View style={[GlobalStyles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={[GlobalStyles.container, { backgroundColor: theme.colors.background }]}>
            <AppHeader
              title="Twoje budżety"
              rightActions={[{ icon: 'plus-circle', onPress: async () => { try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}; setModalVisible(true); }, accessibilityLabel: 'Dodaj budżet' }]}
            />

            <Animated.FlatList
                data={budgets}
                renderItem={(args) => (
                  <Animated.View entering={FadeInUp.duration(250)} layout={Layout.springify()}>
                    {renderBudget(args)}
                  </Animated.View>
                )}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingBottom: Spacing.xLarge * 2 }}
                ListEmptyComponent={
                    <EmptyState
                        icon="dollar-sign"
                        title="Brak budżetów"
                        subtitle="Dodaj swój pierwszy budżet, aby zacząć śledzić wydatki!"
                        actionTitle="Dodaj budżet"
                        onActionPress={() => setModalVisible(true)}
                    />
                }
            />

            <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalContainer}>
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
                        <Text style={styles.modalTitle}>Nowy Budżet</Text>
                        <TextInput
                            style={[GlobalStyles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
                            placeholder="Nazwa (np. Wydatki miesięczne)"
                            value={newBudgetName}
                            onChangeText={setNewBudgetName}
                            placeholderTextColor={theme.colors.placeholder}
                            editable={!isSubmittingBudget}
                        />
                        <TextInput
                            style={[GlobalStyles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
                            placeholder="Kwota docelowa (np. 2000)"
                            value={newBudgetAmount}
                            onChangeText={setNewBudgetAmount}
                            keyboardType="numeric"
                            placeholderTextColor={theme.colors.placeholder}
                            editable={!isSubmittingBudget}
                        />
                        <View style={styles.switchContainer}>
                            <View>
                                <Text style={styles.switchLabel}>Wspólny budżet?</Text>
                                {/* ZMIANA: Dodano tekst informacyjny, gdy użytkownik nie jest w parze */}
                                {!pairId && (
                                    <Text style={styles.noPairInfo}>Musisz być w parze, aby włączyć.</Text>
                                )}
                            </View>
                            <Switch
                                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                                thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
                                ios_backgroundColor={theme.colors.border}
                                onValueChange={setIsShared}
                                value={isShared}
                                disabled={isSubmittingBudget || !pairId}
                            />
                        </View>
                        {!pairId && isShared && (
                            <Text style={styles.noPairWarning}>Aby utworzyć wspólny budżet, musisz być w parze. Przejdź do Profilu, aby zaprosić partnera.</Text>
                        )}
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[GlobalStyles.button, styles.buttonClose]}
                                onPress={() => { setModalVisible(false); setIsShared(false); setNewBudgetName(''); setNewBudgetAmount(''); }}
                                disabled={isSubmittingBudget}
                            >
                                <Text style={GlobalStyles.buttonText}>Anuluj</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[GlobalStyles.button, { backgroundColor: theme.colors.primary }]}
                                onPress={handleAddBudget}
                                disabled={isSubmittingBudget}
                            >
                                {isSubmittingBudget ? <ActivityIndicator color="white" /> : <Text style={GlobalStyles.buttonText}>Dodaj</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    headerContainer: {
        paddingTop: Spacing.xxLarge,
        paddingBottom: Spacing.large,
        paddingHorizontal: Spacing.large,
        backgroundColor: 'white',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderColor: Colors.border,
    },
    headerTitle: {
        fontSize: Typography.h1.fontSize,
        fontWeight: Typography.bold.fontWeight,
    },
    budgetItem: {
        backgroundColor: 'white',
        padding: Spacing.large,
        marginVertical: Spacing.small,
        marginHorizontal: Spacing.medium,
        borderRadius: 10,
        elevation: 2,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
    },
    budgetInfo: { marginBottom: Spacing.small },
    budgetName: { fontSize: Typography.h3.fontSize, fontWeight: Typography.semiBold.fontWeight },
    budgetAmount: { fontSize: Typography.small.fontSize + 2, color: Colors.textSecondary, marginTop: Spacing.xSmall },
    progressBarContainer: {
        height: Spacing.xSmall + 4,
        backgroundColor: Colors.border,
        borderRadius: Spacing.xSmall + 2,
        overflow: 'hidden',
        marginTop: Spacing.xSmall
    },
    progressBar: { height: '100%', borderRadius: Spacing.xSmall + 2 },
    expenseItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.large,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderColor: Colors.border,
    },
    expenseName: { fontSize: Typography.body.fontSize, color: Colors.textPrimary },
    expenseMeta: { fontSize: Typography.small.fontSize, color: Colors.textSecondary, marginTop: Spacing.xSmall },
    expenseAmount: { fontSize: Typography.body.fontSize, fontWeight: Typography.semiBold.fontWeight, color: Colors.textPrimary },
    fab: {
        position: 'absolute',
        right: Spacing.xLarge,
        bottom: Spacing.xLarge,
        width: Spacing.xxLarge,
        height: Spacing.xxLarge,
        borderRadius: Spacing.xLarge,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
    },
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: {
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: Spacing.large,
        alignItems: 'center',
        elevation: 5,
    },
    modalTitle: { fontSize: Typography.h2.fontSize, fontWeight: Typography.bold.fontWeight, marginBottom: Spacing.large },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: Spacing.large,
    },
    switchLabel: {
        fontSize: Typography.body.fontSize,
        color: Colors.textPrimary,
    },
    noPairInfo: {
        fontSize: Typography.small.fontSize,
        color: Colors.textSecondary,
        marginTop: Spacing.xSmall,
    },
    noPairWarning: {
        fontSize: Typography.small.fontSize + 2,
        color: Colors.danger,
        textAlign: 'center',
        marginBottom: Spacing.medium,
    },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: Spacing.small },
    buttonClose: { backgroundColor: Colors.textSecondary },
});

export default BudgetsScreen;