import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { GlobalStyles, Spacing, Typography } from '../styles/AppStyles';
import AppHeader from '../components/AppHeader';
import { useTheme } from '../contexts/ThemeContext';
import { listOutbox, processOpNow, removeOpFromOutbox, PendingOp } from '../utils/offlineQueue';
import { Feather } from '@expo/vector-icons';

const OutboxScreen = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [ops, setOps] = useState<PendingOp[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try { const list = await listOutbox(); setOps(list); } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const renderOp = ({ item }: { item: PendingOp }) => {
    const subtitle = (item as any).collectionPath || (item as any).docPath || '';
    const nextIn = item.nextAttemptAt ? Math.max(0, item.nextAttemptAt - Date.now()) : 0;
    const nextSec = Math.ceil(nextIn / 1000);
    return (
      <View style={[styles.row, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]}>{item.action.toUpperCase()}</Text>
          <Text style={[styles.rowSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{subtitle}</Text>
          <Text style={[styles.rowMeta, { color: theme.colors.textSecondary }]}>próba: {item.retryCount || 0}{nextSec>0?` · następna za ~${nextSec}s`:''}</Text>
        </View>
        <TouchableOpacity style={[styles.iconBtn]} onPress={async () => { setBusyId(item.id); try { await processOpNow(item.id); } finally { setBusyId(null); refresh(); } }}>
          {busyId===item.id ? <ActivityIndicator color={theme.colors.primary} /> : <Feather name="play" size={20} color={theme.colors.textPrimary} />}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.iconBtn]} onPress={async () => { setBusyId(item.id+':rm'); try { await removeOpFromOutbox(item.id); } finally { setBusyId(null); refresh(); } }}>
          {busyId===item.id+':rm' ? <ActivityIndicator color={theme.colors.primary} /> : <Feather name="trash-2" size={20} color={theme.colors.danger} />}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[GlobalStyles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Kolejka offline" />
      {loading ? (
        <View style={[GlobalStyles.centered]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={ops}
          keyExtractor={o => o.id}
          renderItem={renderOp}
          contentContainerStyle={{ paddingBottom: Spacing.xLarge * 2 }}
          ListEmptyComponent={<Text style={[styles.empty, { color: theme.colors.textSecondary }]}>Kolejka jest pusta.</Text>}
        />
      )}
      <View style={{ padding: Spacing.medium }}>
        <TouchableOpacity style={[GlobalStyles.button]} onPress={refresh}>
          <Text style={GlobalStyles.buttonText}>Odśwież</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: Spacing.medium, borderBottomWidth: 1 },
  rowTitle: { ...Typography.body, fontWeight: '700' as const },
  rowSubtitle: { ...Typography.small },
  rowMeta: { ...Typography.small },
  empty: { textAlign: 'center', marginTop: Spacing.xLarge },
  iconBtn: { padding: Spacing.small, marginLeft: Spacing.small },
});

export default OutboxScreen;


