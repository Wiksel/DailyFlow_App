import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, Typography } from '../styles/AppStyles';

interface FilterPreset<T = any> {
  id: string;
  name: string;
  data: T;
}

interface FilterPresetsProps<T = any> {
  storageKey: string;
  userId: string | undefined | null;
  title?: string;
  getCurrentFilters: () => T;
  applyFilters: (data: T) => void;
}

function generateId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const FilterPresets = <T extends Record<string, unknown>>({
  storageKey,
  userId,
  title = 'Presety filtrów',
  getCurrentFilters,
  applyFilters,
}: FilterPresetsProps<T>) => {
  const theme = useTheme();
  const [presets, setPresets] = useState<Array<FilterPreset<T>>>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [presetName, setPresetName] = useState('');

  const key = useMemo(() => (userId ? `${storageKey}_${userId}` : null), [storageKey, userId]);

  useEffect(() => {
    if (!key) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw) setPresets(JSON.parse(raw));
      } catch {}
    })();
  }, [key]);

  const persist = async (next: Array<FilterPreset<T>>) => {
    setPresets(next);
    if (!key) return;
    try { await AsyncStorage.setItem(key, JSON.stringify(next)); } catch {}
  };

  const handleSavePreset = async () => {
    const name = presetName.trim();
    if (!name) { setIsModalVisible(false); return; }
    const data = getCurrentFilters();
    const next: Array<FilterPreset<T>> = [{ id: generateId(), name, data }, ...presets].slice(0, 20);
    await persist(next);
    setPresetName('');
    setIsModalVisible(false);
  };

  const handleApply = (p: FilterPreset<T>) => {
    applyFilters(p.data);
  };

  const handleDelete = async (id: string) => {
    const next = presets.filter(p => p.id !== id);
    await persist(next);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.colors.textSecondary }]}>{title}</Text>
        <TouchableOpacity onPress={() => setIsModalVisible(true)} style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}>
          <Feather name="save" size={16} color="white" />
          <Text style={styles.saveButtonText}>Zapisz preset</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {presets.map((p) => (
          <View key={p.id} style={[styles.presetChip, { backgroundColor: theme.colors.inputBackground }]}>
            <TouchableOpacity onPress={() => handleApply(p)}>
              <Text style={[styles.presetText, { color: theme.colors.textPrimary }]} numberOfLines={1}>{p.name}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(p.id)} style={styles.deleteIcon}>
              <Feather name="x" size={14} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Modal visible={isModalVisible} transparent onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card }]}> 
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Nazwa presetu</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.inputBackground, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
              placeholder="np. 'Pilne w pracy'"
              placeholderTextColor={theme.colors.placeholder}
              value={presetName}
              onChangeText={setPresetName}
            />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={[styles.modalBtn, { backgroundColor: theme.colors.inputBackground }]}>
                <Text style={{ color: theme.colors.textPrimary }}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSavePreset} style={[styles.modalBtn, { backgroundColor: theme.colors.primary }]}>
                <Text style={{ color: 'white' }}>Zapisz</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.medium,
    paddingTop: Spacing.small,
    paddingBottom: Spacing.small,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: Typography.small.fontSize + 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.xSmall,
    borderRadius: 16,
  },
  saveButtonText: {
    marginLeft: 6,
    color: 'white',
    fontWeight: '700',
  },
  chipsRow: {
    paddingTop: Spacing.small,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.xSmall,
    borderRadius: 16,
    marginRight: Spacing.small,
    maxWidth: 200,
  },
  presetText: {
    fontSize: Typography.small.fontSize + 1,
    fontWeight: '600',
    maxWidth: 170,
  },
  deleteIcon: {
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.large,
  },
  modalCard: {
    width: '100%',
    borderRadius: 12,
    padding: Spacing.large,
  },
  modalTitle: {
    ...Typography.h3,
    textAlign: 'center',
    marginBottom: Spacing.small,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
    marginTop: Spacing.small,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.medium,
  },
  modalBtn: {
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
    borderRadius: 8,
    marginLeft: Spacing.small,
  },
});

export default FilterPresets;


