import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Colors, Spacing, Typography } from '../styles/AppStyles';
import DateRangeFilter from './DateRangeFilter';
import CategoryFilter from './CategoryFilter';
import { Feather } from '@expo/vector-icons';
import DualRangeSlider from './DualRangeSlider';

interface InlineFiltersProps {
  showCreatorFilter: boolean;
  categories: Array<{ id: string; name: string; color?: string }>;
  activeCategory: string | 'all'; // backward compat (unused)
  onChangeCategory: (id: string | 'all') => void; // backward compat (unused)
  activeCategories?: string[];
  onChangeCategories?: (ids: string[]) => void;

  difficultyFilter: number[];
  onChangeDifficulty: (next: number[]) => void;

  createdFrom: Date | null;
  createdTo: Date | null;
  onChangeCreatedFrom: (d: Date | null) => void;
  onChangeCreatedTo: (d: Date | null) => void;

  deadlineFrom: Date | null;
  deadlineTo: Date | null;
  onChangeDeadlineFrom: (d: Date | null) => void;
  onChangeDeadlineTo: (d: Date | null) => void;

  completedFrom: Date | null;
  completedTo: Date | null;
  onChangeCompletedFrom: (d: Date | null) => void;
  onChangeCompletedTo: (d: Date | null) => void;

  creators: string[];
  creatorFilter: string | 'all';
  onChangeCreator: (c: string | 'all') => void;
  onOpenCalendar?: (forKey: 'created' | 'deadline' | 'completed') => void;
}

type FilterKey = 'category' | 'difficulty' | 'created' | 'deadline' | 'completed' | 'creator' | null;

const InlineFilters: React.FC<InlineFiltersProps> = ({
  showCreatorFilter,
  categories,
  activeCategory,
  onChangeCategory,
  activeCategories = [],
  onChangeCategories,
  difficultyFilter,
  onChangeDifficulty,
  createdFrom,
  createdTo,
  onChangeCreatedFrom,
  onChangeCreatedTo,
  deadlineFrom,
  deadlineTo,
  onChangeDeadlineFrom,
  onChangeDeadlineTo,
  completedFrom,
  completedTo,
  onChangeCompletedFrom,
  onChangeCompletedTo,
  creators,
  creatorFilter,
  onChangeCreator,
  onOpenCalendar,
}) => {
  const theme = useTheme();
  const [open, setOpen] = useState<FilterKey>(null);

  const toggle = (key: FilterKey) => setOpen(prev => (prev === key ? null : key));

  const difficultyChips = [1, 2, 3, 4, 5];

  const labelFor = (key: string) => (
    key === 'all' ? 'Wszystkie' :
    key === 'today' ? 'Dziś' :
    key === 'last7days' ? 'Ostatnie 7 dni' :
    key === 'last14days' ? 'Ostatnie 14 dni' :
    key === 'last30days' ? 'Ostatnie 30 dni' :
    key === 'last3months' ? 'Ostatnie 3 mies.' :
    key === 'last6months' ? 'Ostatnie 6 mies.' :
    key === 'lastYear' ? 'Ostatni rok' : key
  );

  const handleQuickRange = (type: 'created' | 'deadline' | 'completed', key: string) => {
    const now = new Date();
    let from: Date | null = null;
    let to: Date | null = new Date(now);
    if (to) to.setHours(23,59,59,999);
    switch (key) {
      case 'today': from = new Date(now.getFullYear(), now.getMonth(), now.getDate()); from.setHours(0,0,0,0); break;
      case 'last7days': from = new Date(now); from.setDate(now.getDate()-7); from.setHours(0,0,0,0); break;
      case 'last14days': from = new Date(now); from.setDate(now.getDate()-14); from.setHours(0,0,0,0); break;
      case 'last30days': from = new Date(now); from.setMonth(now.getMonth()-1); from.setHours(0,0,0,0); break;
      case 'last3months': from = new Date(now); from.setMonth(now.getMonth()-3); from.setHours(0,0,0,0); break;
      case 'last6months': from = new Date(now); from.setMonth(now.getMonth()-6); from.setHours(0,0,0,0); break;
      case 'lastYear': from = new Date(now); from.setFullYear(now.getFullYear()-1); from.setHours(0,0,0,0); break;
    }
    // toggle off if clicking the same active option
    if (quickActive(type, key)) { from = null; to = null; }
    if (type === 'created') { onChangeCreatedFrom(from); onChangeCreatedTo(to); }
    if (type === 'deadline') { onChangeDeadlineFrom(from); onChangeDeadlineTo(to); }
    if (type === 'completed') { onChangeCompletedFrom(from); onChangeCompletedTo(to); }
  };

  const quickActive = (type: 'created' | 'deadline' | 'completed', key: string) => {
    const now = new Date();
    const normalizeFrom = (d: Date | null) => (d ? (new Date(d.getFullYear(), d.getMonth(), d.getDate())) : null);
    const normalizeTo = (d: Date | null) => (d ? (new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23,59,59,999)) : null);
    const [from, to] = type === 'created' ? [normalizeFrom(createdFrom), normalizeTo(createdTo)]
      : type === 'deadline' ? [normalizeFrom(deadlineFrom), normalizeTo(deadlineTo)]
      : [normalizeFrom(completedFrom), normalizeTo(completedTo)];
    const compute = (k: string): [Date | null, Date | null] => {
      let f: Date | null = null; let t: Date | null = new Date(now); if (t) t.setHours(23,59,59,999);
      switch (k) {
        case 'today': f = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
        case 'last7days': f = new Date(now); f.setDate(now.getDate()-7); f.setHours(0,0,0,0); break;
        case 'last14days': f = new Date(now); f.setDate(now.getDate()-14); f.setHours(0,0,0,0); break;
        case 'last30days': f = new Date(now); f.setMonth(now.getMonth()-1); f.setHours(0,0,0,0); break;
        case 'last3months': f = new Date(now); f.setMonth(now.getMonth()-3); f.setHours(0,0,0,0); break;
        case 'last6months': f = new Date(now); f.setMonth(now.getMonth()-6); f.setHours(0,0,0,0); break;
        case 'lastYear': f = new Date(now); f.setFullYear(now.getFullYear()-1); f.setHours(0,0,0,0); break;
      }
      return [normalizeFrom(f), normalizeTo(t)];
    };
    const [ef, et] = compute(key);
    const eq = (a: Date | null, b: Date | null) => (!a && !b) || (!!a && !!b && a.getTime() === b.getTime());
    return eq(from, ef) && eq(to, et);
  };

  const minDiffVal = difficultyFilter.length ? Math.min(...difficultyFilter) : 1;
  const maxDiffVal = difficultyFilter.length ? Math.max(...difficultyFilter) : 10;

  return (
    <View style={[styles.container, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}> 
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <TouchableOpacity onPress={() => {
          // reset wszystkich filtrów
          onChangeCategories ? onChangeCategories([]) : onChangeCategory('all');
          onChangeDifficulty([]);
          onChangeCreatedFrom(null); onChangeCreatedTo(null);
          onChangeDeadlineFrom(null); onChangeDeadlineTo(null);
          onChangeCompletedFrom(null); onChangeCompletedTo(null);
          onChangeCreator('all');
        }} style={[styles.iconWrap, { backgroundColor: theme.colors.inputBackground, marginRight: Spacing.small }]}> 
          <Feather name="x" size={14} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => toggle('category')} style={[styles.chip, { backgroundColor: open==='category' ? theme.colors.primary : theme.colors.inputBackground }]}>
          <Text style={[styles.chipText, { color: open==='category' ? 'white' : theme.colors.textPrimary }]}>Kategoria</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => toggle('difficulty')} style={[styles.chip, { backgroundColor: open==='difficulty' ? theme.colors.primary : theme.colors.inputBackground }]}>
          <Text style={[styles.chipText, { color: open==='difficulty' ? 'white' : theme.colors.textPrimary }]}>Trudność</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => toggle('created')} style={[styles.chip, { backgroundColor: open==='created' ? theme.colors.primary : theme.colors.inputBackground }]}>
          <Text style={[styles.chipText, { color: open==='created' ? 'white' : theme.colors.textPrimary }]}>Data dodania</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => toggle('deadline')} style={[styles.chip, { backgroundColor: open==='deadline' ? theme.colors.primary : theme.colors.inputBackground }]}>
          <Text style={[styles.chipText, { color: open==='deadline' ? 'white' : theme.colors.textPrimary }]}>Deadline</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => toggle('completed')} style={[styles.chip, { backgroundColor: open==='completed' ? theme.colors.primary : theme.colors.inputBackground }]}>
          <Text style={[styles.chipText, { color: open==='completed' ? 'white' : theme.colors.textPrimary }]}>Wykonanie</Text>
        </TouchableOpacity>
        {showCreatorFilter && (
          <TouchableOpacity onPress={() => toggle('creator')} style={[styles.chip, { backgroundColor: open==='creator' ? theme.colors.primary : theme.colors.inputBackground }]}>
            <Text style={[styles.chipText, { color: open==='creator' ? 'white' : theme.colors.textPrimary }]}>Osoba</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {open === 'category' && (
        <View style={styles.panel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}> 
            <TouchableOpacity onPress={() => onChangeCategories ? onChangeCategories([]) : onChangeCategory('all')} style={[styles.iconWrap, { backgroundColor: theme.colors.inputBackground, marginRight: Spacing.small }]}>
              <Feather name="x" size={14} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            {categories.map(cat => {
              const actives = activeCategories.includes(cat.id);
              const bg = actives ? (cat.color || theme.colors.primary) : theme.colors.inputBackground;
              const textColor = actives ? 'white' : theme.colors.textPrimary;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => {
                    const current = activeCategories;
                    const next = actives ? current.filter(id => id !== cat.id) : [...current, cat.id];
                    if (onChangeCategories) onChangeCategories(next);
                  }}
                  style={[styles.quickBtn, { backgroundColor: bg }]}
                >
                  <Text style={[styles.quickBtnText, { color: textColor }]}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {open === 'difficulty' && (
        <View style={[styles.panel]}> 
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
            <Text style={[styles.rangeLabel, { color: theme.colors.textSecondary, paddingHorizontal: Spacing.medium }]}>Stopień trudności: {minDiffVal === maxDiffVal ? `${minDiffVal}` : `${minDiffVal} – ${maxDiffVal}`}</Text>
          </ScrollView>
          <View style={{ marginTop: 4, alignItems: 'center', paddingHorizontal: Spacing.medium }}>
            <DualRangeSlider
              min={1}
              max={10}
              step={1}
              values={[minDiffVal, maxDiffVal]}
              onChange={(min, max) => {
                const range = Array.from({ length: (max - min + 1) }, (_, i) => min + i);
                onChangeDifficulty(range);
              }}
              onLiveChange={(min, max) => {
                const range = Array.from({ length: (max - min + 1) }, (_, i) => min + i);
                onChangeDifficulty(range);
              }}
              trackColor={theme.colors.inputBackground}
              fillColor={theme.colors.primary}
              thumbColor={theme.colors.primary}
              width={Dimensions.get('window').width - Spacing.medium * 2 - 8}
            />
          </View>
        </View>
      )}

      {open === 'created' && (
        <View style={styles.panel}> 
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}> 
            <TouchableOpacity onPress={() => { onChangeCreatedFrom(null); onChangeCreatedTo(null); }} style={[styles.iconWrap, { backgroundColor: theme.colors.inputBackground, marginRight: Spacing.small }]}>
              <Feather name="x" size={14} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { if (onOpenCalendar) onOpenCalendar('created'); }} style={[styles.iconWrap, { backgroundColor: theme.colors.inputBackground, marginRight: Spacing.small }]}> 
              <Feather name="calendar" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            {['today','last7days','last14days','last30days','last3months','last6months','lastYear'].map((key) => (
              <TouchableOpacity key={key} onPress={() => handleQuickRange('created', key)} style={[styles.quickBtn, { backgroundColor: theme.colors.inputBackground }, quickActive('created', key) && { backgroundColor: theme.colors.primary }]}> 
                <Text style={[styles.quickBtnText, { color: quickActive('created', key) ? 'white' : theme.colors.textPrimary }]}>{labelFor(key)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {open === 'deadline' && (
        <View style={styles.panel}> 
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}> 
            <TouchableOpacity onPress={() => { onChangeDeadlineFrom(null); onChangeDeadlineTo(null); }} style={[styles.iconWrap, { backgroundColor: theme.colors.inputBackground, marginRight: Spacing.small }]}>
              <Feather name="x" size={14} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { if (onOpenCalendar) onOpenCalendar('deadline'); }} style={[styles.iconWrap, { backgroundColor: theme.colors.inputBackground, marginRight: Spacing.small }]}> 
              <Feather name="calendar" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            {['today','last7days','last14days','last30days','last3months','last6months','lastYear'].map((key) => (
              <TouchableOpacity key={key} onPress={() => handleQuickRange('deadline', key)} style={[styles.quickBtn, { backgroundColor: theme.colors.inputBackground }, quickActive('deadline', key) && { backgroundColor: theme.colors.primary }]}> 
                <Text style={[styles.quickBtnText, { color: quickActive('deadline', key) ? 'white' : theme.colors.textPrimary }]}>{labelFor(key)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {open === 'completed' && (
        <View style={styles.panel}> 
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}> 
            <TouchableOpacity onPress={() => { onChangeCompletedFrom(null); onChangeCompletedTo(null); }} style={[styles.iconWrap, { backgroundColor: theme.colors.inputBackground, marginRight: Spacing.small }]}>
              <Feather name="x" size={14} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { if (onOpenCalendar) onOpenCalendar('completed'); }} style={[styles.iconWrap, { backgroundColor: theme.colors.inputBackground, marginRight: Spacing.small }]}> 
              <Feather name="calendar" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            {['today','last7days','last14days','last30days','last3months','last6months','lastYear'].map((key) => (
              <TouchableOpacity key={key} onPress={() => handleQuickRange('completed', key)} style={[styles.quickBtn, { backgroundColor: theme.colors.inputBackground }, quickActive('completed', key) && { backgroundColor: theme.colors.primary }]}> 
                <Text style={[styles.quickBtnText, { color: quickActive('completed', key) ? 'white' : theme.colors.textPrimary }]}>{labelFor(key)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {open === 'creator' && (
        <View style={[styles.panel, styles.inlineRow]}> 
          <TouchableOpacity onPress={() => onChangeCreator('all')} style={[styles.chip, { backgroundColor: (creatorFilter==='all') ? theme.colors.primary : theme.colors.inputBackground }]}>
            <Text style={[styles.chipText, { color: (creatorFilter==='all') ? 'white' : theme.colors.textPrimary }]}>Wszyscy</Text>
          </TouchableOpacity>
          {creators.map(name => (
            <TouchableOpacity key={name} onPress={() => onChangeCreator(name)} style={[styles.chip, { backgroundColor: (creatorFilter===name) ? theme.colors.primary : theme.colors.inputBackground }]}>
              <Text style={[styles.chipText, { color: (creatorFilter===name) ? 'white' : theme.colors.textPrimary }]}>{name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { borderBottomWidth: 0 },
  row: { paddingHorizontal: Spacing.medium, paddingVertical: 6 },
  chip: { paddingHorizontal: Spacing.medium, paddingVertical: Spacing.xSmall, borderRadius: 16, marginRight: Spacing.small },
  chipText: { ...Typography.body },
  panel: { paddingHorizontal: Spacing.medium, paddingTop: 2, paddingBottom: 6 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  diffChip: { paddingHorizontal: Spacing.medium, paddingVertical: Spacing.xSmall, borderRadius: 16, marginRight: Spacing.small, marginTop: Spacing.xSmall },
  diffChipText: { ...Typography.body, fontWeight: '700' },
  iconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.small },
  quickRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap' },
  quickBtn: { paddingHorizontal: Spacing.small, paddingVertical: 6, borderRadius: 16, marginRight: Spacing.small, marginBottom: 4 },
  quickBtnText: { ...Typography.small },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sliderLabel: { ...Typography.small },
  sliderTrack: { flex: 1, height: 8, borderRadius: 4, position: 'relative' },
  sliderFill: { position: 'absolute', top: 0, bottom: 0, borderRadius: 4 },
});

export default InlineFilters;


