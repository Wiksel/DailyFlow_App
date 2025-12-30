import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, Typography } from '../styles/AppStyles';

interface Props {
  categories: Array<{ id: string; name: string; color?: string }>
  activeCategory?: string | 'all' // backward compat
  activeCategories?: string[]
  onClearCategory: () => void
  onRemoveCategory?: (id: string) => void

  difficultyFilter: number[]
  onClearDifficulty: () => void

  createdFrom: Date | null
  createdTo: Date | null
  onClearCreated: () => void

  deadlineFrom: Date | null
  deadlineTo: Date | null
  onClearDeadline: () => void

  completedFrom: Date | null
  completedTo: Date | null
  onClearCompleted: () => void

  taskType: 'personal' | 'shared'
  creatorFilter: string | 'all'
  onClearCreator: () => void

  searchQuery?: string
  onClearSearch?: () => void

  onClearAll: () => void
}

const ActiveFiltersSummary: React.FC<Props> = (props) => {
  const theme = useTheme();
  const {
    categories, activeCategory, activeCategories = [], onClearCategory, onRemoveCategory,
    difficultyFilter, onClearDifficulty,
    createdFrom, createdTo, onClearCreated,
    deadlineFrom, deadlineTo, onClearDeadline,
    completedFrom, completedTo, onClearCompleted,
    taskType, creatorFilter, onClearCreator,
    searchQuery, onClearSearch,
    onClearAll,
  } = props;

  const formatRange = (from: Date | null, to: Date | null) => {
    if (!from && !to) return '';
    const f = from ? from.toLocaleDateString('pl-PL') : '';
    const t = to ? to.toLocaleDateString('pl-PL') : '';
    if (f && t) return `${f} – ${t}`;
    return f || t;
  };

  const isDifficultyDefault = difficultyFilter.length === 0 || difficultyFilter.length === 10;
  const categoryChip = (activeCategory && activeCategory !== 'all') || activeCategories.length > 0;
  const difficultyChip = !isDifficultyDefault;
  const createdChip = !!(createdFrom || createdTo);
  const deadlineChip = !!(deadlineFrom || deadlineTo);
  const completedChip = !!(completedFrom || completedTo);
  const creatorChip = taskType === 'shared' && creatorFilter !== 'all';
  const searchChip = !!(searchQuery && searchQuery.trim());

  const hasAny = categoryChip || difficultyChip || createdChip || deadlineChip || completedChip || creatorChip || searchChip;
  if (!hasAny) return null;

  const categoryName = activeCategory && activeCategory !== 'all' ? (categories.find(c => c.id === activeCategory)?.name || 'Kategoria') : '';
  const min = difficultyFilter.length ? Math.min(...difficultyFilter) : 1;
  const max = difficultyFilter.length ? Math.max(...difficultyFilter) : 10;

  return (
    <View style={[styles.container]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <TouchableOpacity onPress={onClearAll} style={[styles.clearAll, { backgroundColor: theme.colors.inputBackground }]}>
          <Feather name="x" size={14} color={theme.colors.textSecondary} />
          <Text style={[styles.clearText, { color: theme.colors.textSecondary }]}>Wyczyść</Text>
        </TouchableOpacity>
        {searchChip && (
          <Chip label={`Szukaj: ${searchQuery!.trim()}`} onClear={onClearSearch!} />
        )}
        {activeCategories.length > 0 ? (
          <>
            {activeCategories.map(id => {
              const nm = categories.find(c => c.id === id)?.name || 'Kategoria';
              return (
                <Chip key={id} label={`Kategoria: ${nm}`} onClear={() => onRemoveCategory ? onRemoveCategory(id) : onClearCategory()} />
              );
            })}
          </>
        ) : (
          (activeCategory && activeCategory !== 'all') ? (
            <Chip label={`Kategoria: ${categoryName}`} onClear={onClearCategory} />
          ) : null
        )}
        {difficultyChip && (
          <Chip label={`Trudność: ${min === max ? min : `${min}–${max}`}`} onClear={onClearDifficulty} />
        )}
        {createdChip && (
          <Chip label={`Dodano: ${formatRange(createdFrom, createdTo)}`} onClear={onClearCreated} />
        )}
        {deadlineChip && (
          <Chip label={`Deadline: ${formatRange(deadlineFrom, deadlineTo)}`} onClear={onClearDeadline} />
        )}
        {completedChip && (
          <Chip label={`Wykonanie: ${formatRange(completedFrom, completedTo)}`} onClear={onClearCompleted} />
        )}
        {creatorChip && (
          <Chip label={`Osoba: ${creatorFilter}`} onClear={onClearCreator} />
        )}
      </ScrollView>
    </View>
  );
};

const Chip = ({ label, onClear }: { label: string; onClear: () => void }) => {
  const theme = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: theme.colors.inputBackground }]}> 
      <Text style={[styles.chipText, { color: theme.colors.textPrimary }]} numberOfLines={1}>{label}</Text>
      <TouchableOpacity onPress={onClear} style={styles.chipClearBtn}>
        <Feather name="x" size={14} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: Spacing.medium, paddingTop: 4 },
  row: { alignItems: 'center', paddingVertical: 2 },
  clearAll: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.small, paddingVertical: 6, borderRadius: 16, marginRight: Spacing.small },
  clearText: { ...Typography.small, marginLeft: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.small, paddingVertical: 6, borderRadius: 16, marginRight: Spacing.small, maxWidth: 260 },
  chipText: { ...Typography.small, maxWidth: 220 },
  chipClearBtn: { marginLeft: 6 },
});

export default ActiveFiltersSummary;


