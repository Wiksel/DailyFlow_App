import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { doc, onSnapshot, collection, addDoc, query, orderBy, getDoc, writeBatch, increment, where } from 'firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { db } from '../../firebaseConfig'; // <--- TEN IMPORT ZOSTAJE
import { Feather } from '@expo/vector-icons';
import { useToast } from '../contexts/ToastContext';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';

interface Budget {
    name: string;
    targetAmount: number;
    currentAmount: number;
}

interface Expense {
    id: string;
    name: string;
    amount: number;
    budgetId: string;
    addedBy: string;
    addedByName: string;
    date: { toDate: () => Date }; // Changed to match Firestore Timestamp
}

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

    const auth = getAuth();
    const currentUser = auth.currentUser;
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

            const batch = writeBatch(db);

            const newExpenseRef = doc(collection(db, 'expenses'));
            batch.set(newExpenseRef, {
                name: newExpenseName.trim(),
                amount: amount,
                budgetId: budgetId,
                addedBy: currentUser.uid,
                addedByName: userNickname,
                date: new Date(),
            });

            const budgetRef = doc(db, 'budgets', budgetId);
            batch.update(budgetRef, { currentAmount: increment(amount) });

            await batch.commit();

            showToast("Wydatek dodany pomyślnie!", 'success');
            setModalVisible(false);
            setNewExpenseName('');
            setNewExpenseAmount('');
        } catch (error: any) {
            console.error("Błąd dodawania wydatku:", error);
            showToast(`Błąd dodawania wydatku: ${error.message}`, 'error');
        } finally {
            setIsSubmittingExpense(false);
        }
    };

    const getProgressBarColor = (progress: number) => {
        if (progress >= 100) return Colors.danger;
        if (progress >= 75) return Colors.warning;
        return Colors.success;
    };

    const renderExpense = ({ item }: { item: Expense }) => (
        <View style={styles.expenseItem}>
            <View>
                <Text style={styles.expenseName}>{item.name}</Text>
                <Text style={styles.expenseMeta}>Dodane przez: {item.addedByName} - {item.date.toDate().toLocaleDateString('pl-PL')}</Text>
            </View>
            <Text style={styles.expenseAmount}>{item.amount.toFixed(2)} zł</Text>
        </View>
    );

    if (loading || !budget) {
        return <View style={GlobalStyles.container}><ActivityIndicator size="large" color={Colors.primary} /></View>;
    }

    const progress = budget.targetAmount > 0 ? (budget.currentAmount / budget.targetAmount) * 100 : 0;
    const progressBarColor = getProgressBarColor(progress);

    return (
        <View style={GlobalStyles.container}>
            <View style={styles.summaryContainer}>
                <Text style={styles.budgetName}>{budget.name}</Text>
                <Text style={styles.budgetAmount}>{budget.currentAmount.toFixed(2)} zł / {budget.targetAmount.toFixed(2)} zł</Text>
                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${Math.min(progress, 100)}%`, backgroundColor: progressBarColor }]} />
                </View>
            </View>

            <FlatList
                data={expenses}
                renderItem={renderExpense}
                keyExtractor={item => item.id}
                ListHeaderComponent={<Text style={styles.listHeader}>Historia wydatków</Text>}
                ListEmptyComponent={<Text style={styles.emptyText}>Brak wydatków w tym budżecie.</Text>}
            />

            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                <Feather name="plus" size={30} color="white" />
            </TouchableOpacity>

            <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Nowy Wydatek</Text>
                        <TextInput
                            style={GlobalStyles.input}
                            placeholder="Nazwa (np. Zakupy spożywcze)"
                            value={newExpenseName}
                            onChangeText={setNewExpenseName}
                            placeholderTextColor={Colors.placeholder}
                            editable={!isSubmittingExpense}
                        />
                        <TextInput
                            style={GlobalStyles.input}
                            placeholder="Kwota"
                            value={newExpenseAmount}
                            onChangeText={setNewExpenseAmount}
                            keyboardType="numeric"
                            placeholderTextColor={Colors.placeholder}
                            editable={!isSubmittingExpense}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[GlobalStyles.button, styles.buttonClose]}
                                onPress={() => { setModalVisible(false); setNewExpenseName(''); setNewExpenseAmount(''); }}
                                disabled={isSubmittingExpense}
                            >
                                <Text style={GlobalStyles.buttonText}>Anuluj</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[GlobalStyles.button, { backgroundColor: Colors.primary }]}
                                onPress={handleAddExpense}
                                disabled={isSubmittingExpense}
                            >
                                {isSubmittingExpense ? <ActivityIndicator color="white" /> : <Text style={GlobalStyles.buttonText}>Dodaj</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    summaryContainer: {
        backgroundColor: 'white',
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
        backgroundColor: 'white',
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
        backgroundColor: 'white',
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