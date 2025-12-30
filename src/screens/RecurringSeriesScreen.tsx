import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import LabeledInput from '../components/LabeledInput';
import { getAuth } from '@react-native-firebase/auth';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, Timestamp } from '../utils/firestoreCompat';
import { enqueueAdd, enqueueDelete } from '../utils/offlineQueue';
import { db } from '../utils/firestoreCompat';
import { Colors, GlobalStyles, Spacing, Typography } from '../styles/AppStyles';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import AppHeader from '../components/AppHeader';
import { RecurrenceFrequency, RecurringSeries } from '../types';
import { useCategories } from '../contexts/CategoryContext';
import { useToast } from '../contexts/ToastContext';

const RecurringSeriesScreen = () => {
  const currentUser = getAuth().currentUser;
  const theme = useTheme();
  const { categories } = useCategories();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<RecurringSeries[]>([]);

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState<string>('');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('weekly');
  const [interval, setInterval] = useState('1');
  const [byWeekday, setByWeekday] = useState('1');
  const [byMonthDay, setByMonthDay] = useState('1');

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    const q = query(collection(db, 'recurringSeries'), where('userId', '==', currentUser.uid));
    const unsub = onSnapshot(q, (snap) => {
      setSeries(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as RecurringSeries[]);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [currentUser]);

  useEffect(() => { if (!category && categories.length > 0) setCategory(categories[0].id); }, [categories, category]);

  const handleAdd = async () => {
    if (!currentUser) return;
    const iv = Math.max(1, parseInt(interval || '1', 10) || 1);
    const payload: Omit<RecurringSeries, 'id'> = {
      userId: currentUser.uid,
      pairId: null,
      templateId: undefined,
      name: name.trim() || 'Zadanie cykliczne',
      description: desc.trim() || '',
      category,
      basePriority: 3,
      difficulty: 2,
      frequency,
      interval: iv,
      byWeekday: frequency === 'weekly' ? Math.min(6, Math.max(0, parseInt(byWeekday || '1', 10) || 1)) : undefined,
      byMonthDay: frequency === 'monthly' ? Math.min(28, Math.max(1, parseInt(byMonthDay || '1', 10) || 1)) : undefined,
      startDate: Timestamp.fromDate(new Date()),
      endDate: null,
      isShared: false,
      skips: [],
    } as any;
    try {
      // basic validation
      if (!payload.name.trim()) { showToast('Nazwa jest wymagana.', 'error'); return; }
      if (!category) { showToast('Wybierz kategorię.', 'error'); return; }
      try { await addDoc(collection(db, 'recurringSeries'), payload as any); }
      catch { await enqueueAdd('recurringSeries', payload as any); }
      setName(''); setDesc(''); setInterval('1');
      showToast('Dodano serię cykliczną.', 'success');
    } catch (e: any) { showToast('Nie udało się dodać serii.', 'error'); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteDoc(doc(db, 'recurringSeries', id)); showToast('Usunięto serię.', 'success'); }
    catch { try { await enqueueDelete(`recurringSeries/${id}`); showToast('Seria zostanie usunięta po powrocie online.', 'info'); } catch { showToast('Błąd usuwania.', 'error'); } }
  };

  if (loading) return (
    <View style={[GlobalStyles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );

  return (
    <View style={[GlobalStyles.container, { backgroundColor: theme.colors.background }]}> 
      <AppHeader title="Zadania cykliczne" />
      <Animated.View entering={FadeInUp} layout={Layout.springify()} style={[GlobalStyles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}> 
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Nowa seria</Text>
        <LabeledInput label="Nazwa" placeholder="Nazwa" value={name} onChangeText={setName} />
        <LabeledInput label="Opis (opcjonalnie)" placeholder="Opis (opcjonalnie)" value={desc} onChangeText={setDesc} />
        <Text style={styles.label}>Kategoria</Text>
        <View style={styles.chipsRow}>
          {categories.map(c => (
            <TouchableOpacity key={c.id} onPress={() => setCategory(c.id)} style={[styles.chip, { backgroundColor: category === c.id ? theme.colors.primary : theme.colors.inputBackground }]}>
              <Text style={{ color: category === c.id ? 'white' : theme.colors.textPrimary }}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Częstotliwość</Text>
        <View style={styles.chipsRow}>
          {(['daily','weekly','monthly'] as RecurrenceFrequency[]).map(f => (
            <TouchableOpacity key={f} onPress={() => setFrequency(f)} style={[styles.chip, { backgroundColor: frequency === f ? theme.colors.primary : theme.colors.inputBackground }]}>
              <Text style={{ color: frequency === f ? 'white' : theme.colors.textPrimary }}>{f === 'daily' ? 'Codziennie' : f === 'weekly' ? 'Co tydzień' : 'Co miesiąc'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Co ile (interwał)</Text>
        <LabeledInput keyboardType="number-pad" value={interval} onChangeText={setInterval} />
        {frequency === 'weekly' && (
          <>
            <Text style={styles.label}>Dzień tygodnia (0..6, Nd..Sb)</Text>
            <LabeledInput keyboardType="number-pad" value={byWeekday} onChangeText={setByWeekday} />
          </>
        )}
        {frequency === 'monthly' && (
          <>
            <Text style={styles.label}>Dzień miesiąca (1..28)</Text>
            <LabeledInput keyboardType="number-pad" value={byMonthDay} onChangeText={setByMonthDay} />
          </>
        )}
        <TouchableOpacity style={[GlobalStyles.button, { marginTop: Spacing.medium, backgroundColor: theme.colors.primary }]} onPress={handleAdd}>
          <Text style={GlobalStyles.buttonText}>Dodaj serię</Text>
        </TouchableOpacity>
      </Animated.View>

      <FlatList
        data={series}
        keyExtractor={s => s.id}
        ListHeaderComponent={<Text style={[styles.title, { paddingHorizontal: Spacing.large, marginTop: Spacing.large, color: theme.colors.textPrimary }]}>Twoje serie</Text>}
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]}>{item.name}</Text>
              <Text style={[styles.rowSubtitle, { color: theme.colors.textSecondary }]}>{item.frequency} / co {item.interval} {item.frequency === 'weekly' ? `(D${item.byWeekday})` : item.frequency === 'monthly' ? `(Dzień ${item.byMonthDay})` : ''}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>Usuń</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  title: { ...Typography.h3 },
  label: { ...Typography.body, fontWeight: '600', marginTop: Spacing.small },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.xSmall },
  chip: { paddingHorizontal: Spacing.medium, paddingVertical: Spacing.xSmall, borderRadius: 16, marginRight: Spacing.small, marginTop: Spacing.xSmall },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.large, borderBottomWidth: 1, borderColor: Colors.border, backgroundColor: 'transparent' },
  rowTitle: { ...Typography.body, fontWeight: '700' },
  rowSubtitle: { ...Typography.small },
});

export default RecurringSeriesScreen;



