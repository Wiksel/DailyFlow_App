import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import LabeledInput from '../components/LabeledInput';
import { useRoute } from '@react-navigation/native';
import { doc, onSnapshot, collection, addDoc, query, orderBy, getDoc, writeBatch, increment, where, Timestamp, updateDoc } from '../utils/firestoreCompat';
import { enqueueAdd, enqueueUpdate } from '../utils/offlineQueue';
import { getAuth } from '@react-native-firebase/auth';
import { db } from '../../firebaseConfig';
import { Feather } from '@expo/vector-icons';
import { useToast } from '../contexts/ToastContext';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import { useTheme } from '../contexts/ThemeContext';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import AppHeader from '../components/AppHeader';
import ActionModal from '../components/ActionModal';
import type { Budget, Expense } from '../types';

const BudgetDetailScreen = () => {
    const route = useRoute();
    const { budgetId } = route.params as { budgetId: string };

    const [budget, setBudget] = useState<Budget | null>(null);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [newExpenseName, setNewExpenseName] = useState('');
    const [newExpenseAmount, setNewExpenseAmount] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

    const currentUser = getAuth().currentUser;
    const theme = useTheme();
    const { showToast } = useToast();

    useEffect(() => {
        const budgetUnsubscribe = onSnapshot(doc(db, 'budgets', budgetId), (docSnapshot) => {
            if (docSnapshot.exists()) {
                setBudget(docSnapshot.data() as Budget);
            } else {
                showToast("Budżet został usunięty lub nie istnieje.", 'error');
                // Możesz nawigować wstecz, jeśli budżet zniknął
                // navigation.goBack(); // Dodaj ten wiersz, jeśli chcesz automatycznie wrócić
            }
        }, (error) => {
            console.error("Błąd pobierania budżetu:", error);
            showToast("Błąd pobierania danych budżetu.", 'error');
        });

        const expensesRef = collection(db, 'expenses');
        const q = query(expensesRef, where('budgetId', '==', budgetId), orderBy('date', 'desc'));

        const expensesUnsubscribe = onSnapshot(q, (snapshot) => {
            const expensesData = snapshot.docs.map(docSnapshot => {
                return { id: docSnapshot.id, ...docSnapshot.data() } as Expense;
            });
            setExpenses(expensesData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching expenses (może brakować indeksu w Firestore?):", error);
            showToast("Błąd pobierania wydatków. Sprawdź konsolę Firestore.", 'error');
            setLoading(false);
        });

        return () => {
            budgetUnsubscribe();
            expensesUnsubscribe();
        };
    }, [budgetId]);

    const handleAddExpense = async () => {
        if (!newExpenseName.trim() || !newExpenseAmount.trim() || !currentUser) {
            showToast("Proszę wypełnić wszystkie pola.", 'error');
            return;
        }
        const amount = parseFloat(newExpenseAmount);
        if (isNaN(amount) || amount <= 0) {
            showToast("Proszę podać poprawną kwotę.", 'error');
            return;
        }

        setIsSubmittingExpense(true);
        try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            const userNickname = userDoc.data()?.nickname || currentUser.email!.split('@')[0];

            // Spróbuj zapisać bezpośrednio, a w razie braku sieci — kolejka
            const expensePayload = {
                name: newExpenseName.trim(),
                amount: amount,
                budgetId: budgetId,
                addedBy: currentUser.uid,
                addedByName: userNickname,
                date: Timestamp.now(),
            };
            try {
                await addDoc(collection(db, 'expenses'), expensePayload);
                const budgetRef = doc(db, 'budgets', budgetId);
                await updateDoc(budgetRef, { currentAmount: increment(amount) });
            } catch {
                await enqueueAdd('expenses', expensePayload);
                await enqueueUpdate(`budgets/${budgetId}`, { __inc: { currentAmount: amount } } as any);
            }

            showToast("Wydatek dodany pomyślnie!", 'success');
            setModalVisible(false);
            setNewExpenseName('');
            setNewExpenseAmount('');
        } catch (error: any) {
            console.error("Błąd dodawania wydatku");
            showToast('Błąd dodawania wydatku.', 'error');
        } finally {
            setIsSubmittingExpense(false);
        }
    };

    const getProgressBarColor = (progress: number) => {
        if (progress >= 100) return theme.colors.danger;
        if (progress >= 75) return theme.colors.warning;
        return theme.colors.success;
    };

    const renderExpense = ({ item, index }: { item: Expense, index: number }) => (
        <Animated.View entering={FadeInUp.delay(index * 40)} layout={Layout.springify()} style={[styles.expenseItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View>
                <Text style={[styles.expenseName, { color: theme.colors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.expenseMeta, { color: theme.colors.textSecondary }]}>Dodane przez: {item.addedByName} - {item.date.toDate().toLocaleDateString('pl-PL')}</Text>
            </View>
            <Text style={[styles.expenseAmount, { color: theme.colors.textPrimary }]}>{item.amount.toFixed(2)} zł</Text>
        </Animated.View>
    );

    if (loading || !budget) {
        return (
            <View style={[GlobalStyles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    const progress = budget.targetAmount > 0 ? (budget.currentAmount / budget.targetAmount) * 100 : 0;
    const progressBarColor = getProgressBarColor(progress);

    return (
        <View style={[GlobalStyles.container, { backgroundColor: theme.colors.background }]}>
            <AppHeader title="Szczegóły budżetu" />
            <Animated.View entering={FadeInUp} layout={Layout.springify()} style={[GlobalStyles.card, styles.summaryContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}> 
                <Text style={[styles.budgetName, { color: theme.colors.textPrimary }]}>{budget.name}</Text>
                <Text style={[styles.budgetAmount, { color: theme.colors.textSecondary }]}>{budget.currentAmount.toFixed(2)} zł / {budget.targetAmount.toFixed(2)} zł</Text>
                <View style={[styles.progressBarContainer, { backgroundColor: theme.colors.border }]}>
                    <View style={[styles.progressBar, { width: `${Math.min(progress, 100)}%`, backgroundColor: progressBarColor }]} />
                </View>
            </Animated.View>

            <FlatList
                data={expenses}
                renderItem={renderExpense}
                keyExtractor={item => item.id}
                ListHeaderComponent={<Text style={[styles.listHeader, { color: theme.colors.textPrimary }]}>Historia wydatków</Text>}
                ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Brak wydatków w tym budżecie.</Text>}
                contentContainerStyle={{ paddingBottom: Spacing.xLarge * 2 }}
            />

            <TouchableOpacity style={[styles.fab, { backgroundColor: theme.colors.primary }]} onPress={() => setModalVisible(true)}>
                <Feather name="plus" size={30} color="white" />
            </TouchableOpacity>

            <ActionModal
              visible={modalVisible}
              title="Nowy Wydatek"
              onRequestClose={() => setModalVisible(false)}
              actions={[
                { text: 'Anuluj', variant: 'secondary', onPress: () => { setModalVisible(false); setNewExpenseName(''); setNewExpenseAmount(''); } },
                { text: isSubmittingExpense ? 'Dodawanie…' : 'Dodaj', onPress: handleAddExpense, variant: 'primary' },
              ]}
            >
              <LabeledInput label="Nazwa" placeholder="Nazwa (np. Zakupy spożywcze)" value={newExpenseName} onChangeText={setNewExpenseName} editable={!isSubmittingExpense} />
              <LabeledInput label="Kwota" placeholder="Kwota" value={newExpenseAmount} onChangeText={setNewExpenseAmount} keyboardType="numeric" editable={!isSubmittingExpense} />
              {isSubmittingExpense && <ActivityIndicator color="white" style={{ marginTop: Spacing.small }} />}
            </ActionModal>
        </View>
    );
};

const styles = StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    summaryContainer: {
        backgroundColor: 'transparent',
        padding: Spacing.large,
        borderBottomWidth: 1,
        borderColor: Colors.border,
    },
    budgetName: { fontSize: Typography.h2.fontSize, fontWeight: Typography.bold.fontWeight, textAlign: 'center' },
    budgetAmount: { fontSize: Typography.h3.fontSize, color: Colors.textPrimary, textAlign: 'center', marginVertical: Spacing.small },
    progressBarContainer: {
        height: Spacing.xSmall + 4,
        backgroundColor: Colors.border,
        borderRadius: Spacing.xSmall + 2,
        overflow: 'hidden',
    },
    progressBar: { height: '100%', borderRadius: Spacing.xSmall + 2 },
    listHeader: {
        fontSize: Typography.h3.fontSize,
        fontWeight: Typography.bold.fontWeight,
        padding: Spacing.large,
        paddingBottom: Spacing.small,
        color: Colors.textPrimary,
    },
    expenseItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.large,
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderColor: Colors.border,
    },
    expenseName: { fontSize: Typography.body.fontSize, color: Colors.textPrimary },
    expenseMeta: { fontSize: Typography.small.fontSize, color: Colors.textSecondary, marginTop: Spacing.xSmall },
    expenseAmount: { fontSize: Typography.body.fontSize, fontWeight: Typography.semiBold.fontWeight, color: Colors.textPrimary },
    emptyText: { textAlign: 'center', marginTop: Spacing.xLarge, fontSize: Typography.body.fontSize, color: Colors.textSecondary },
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
        backgroundColor: 'transparent',
        borderRadius: 20,
        padding: Spacing.large,
        alignItems: 'center',
        elevation: 5,
    },
    modalTitle: { fontSize: Typography.h2.fontSize, fontWeight: Typography.bold.fontWeight, marginBottom: Spacing.large },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: Spacing.small },
    buttonClose: { backgroundColor: Colors.textSecondary },
});

export default BudgetDetailScreen;