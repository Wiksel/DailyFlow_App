import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView, PanResponder, GestureResponderEvent, PanResponderGestureState } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, Typography } from '../styles/AppStyles';
import { Feather } from '@expo/vector-icons';
import ActionModal from './ActionModal';

interface CalendarRangeModalProps {
  visible: boolean;
  title?: string;
  initialFrom: Date | null;
  initialTo: Date | null;
  onApply: (from: Date | null, to: Date | null) => void;
  onRequestClose: () => void;
}

const CalendarRangeModal: React.FC<CalendarRangeModalProps> = ({ visible, title = 'Wybierz zakres dat', initialFrom, initialTo, onApply, onRequestClose }) => {
  const theme = useTheme();
  const [from, setFrom] = useState<Date | null>(initialFrom ? startOfDay(initialFrom) : null);
  const [to, setTo] = useState<Date | null>(initialTo ? endOfDay(initialTo) : (initialFrom ? endOfDay(initialFrom) : null));
  const base = initialFrom || initialTo || new Date();
  const [displayYear, setDisplayYear] = useState(base.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(base.getMonth()); // 0-11

  const effectiveTitle = useMemo(() => title, [title]);

  const swipePan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_evt, gesture) => Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: () => {},
    onPanResponderRelease: (_evt: GestureResponderEvent, gesture: PanResponderGestureState) => {
      if (Math.abs(gesture.dx) > 24) {
        if (gesture.dx < 0) changeMonth(1); else changeMonth(-1);
      }
    },
  }), [displayMonth, displayYear]);

  function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
  function endOfDay(d: Date) { const x = new Date(d); x.setHours(23,59,59,999); return x; }
  function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function isWithin(day: Date, a: Date, b: Date) {
    const s = startOfDay(a).getTime();
    const e = endOfDay(b).getTime();
    const t = startOfDay(day).getTime();
    return t >= s && t <= e;
  }

  const monthLabel = useMemo(() => new Date(displayYear, displayMonth, 1).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' }), [displayYear, displayMonth]);

  const daysMatrix = useMemo(() => {
    // Poniedziałek jako pierwszy dzień tygodnia
    const first = new Date(displayYear, displayMonth, 1);
    const startWeekday = (first.getDay() + 6) % 7; // 0..6, 0=Mon
    const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
    const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
    const cells: Array<{ date: Date | null; inMonth: boolean }> = [];
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startWeekday + 1;
      if (dayNum >= 1 && dayNum <= daysInMonth) {
        cells.push({ date: new Date(displayYear, displayMonth, dayNum), inMonth: true });
      } else {
        cells.push({ date: null, inMonth: false });
      }
    }
    return cells;
  }, [displayYear, displayMonth]);

  const years = useMemo(() => {
    const nowY = new Date().getFullYear();
    const res: number[] = [];
    for (let y = nowY - 10; y <= nowY + 10; y++) res.push(y);
    return res;
  }, []);

  const months = useMemo(() => Array.from({ length: 12 }, (_, m) => ({ value: m, label: new Date(2000, m, 1).toLocaleDateString('pl-PL', { month: 'long' }) })), []);

  const changeMonth = (delta: number) => {
    let y = displayYear, m = displayMonth + delta;
    if (m < 0) { y -= 1; m = 11; }
    if (m > 11) { y += 1; m = 0; }
    setDisplayYear(y); setDisplayMonth(m);
  };

  const onDayPress = (d: Date) => {
    const dayStart = startOfDay(d);
    const dayEnd = endOfDay(d);
    if (!from && !to) { setFrom(dayStart); setTo(dayEnd); return; }
    if (from && to && !sameDay(from, to)) {
      // istnieje zakres -> zacznij od nowa od pojedynczego dnia
      setFrom(dayStart); setTo(dayEnd); return;
    }
    // pojedynczy wybór -> ustaw drugi koniec
    if (from) {
      if (dayStart.getTime() < from.getTime()) { setTo(endOfDay(from)); setFrom(dayStart); }
      else { setTo(dayEnd); }
    } else if (to) {
      if (dayStart.getTime() > to.getTime()) { setFrom(startOfDay(to)); setTo(dayEnd); }
      else { setFrom(dayStart); }
    }
  };

  const apply = () => {
    onApply(from ? startOfDay(from) : null, to ? endOfDay(to) : null);
    onRequestClose();
  };

  return (
    <ActionModal
      visible={visible}
      title={effectiveTitle}
      onRequestClose={onRequestClose}
      actions={[
        { text: 'Anuluj', onPress: onRequestClose, variant: 'secondary' },
        { text: 'Zastosuj', onPress: apply, variant: 'primary' },
      ]}
    >
      {/* Sterowanie miesiącem/rokiem */}
      <View style={[styles.headerRow]}>
        <TouchableOpacity onPress={() => changeMonth(-1)} accessibilityLabel="Poprzedni miesiąc" style={[styles.navBtn, { backgroundColor: theme.colors.inputBackground, zIndex: 0 }]}>
          <Feather name="chevron-left" size={18} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={[styles.pickersRow, { zIndex: 2 }]}> 
          <Picker
            selectedValue={displayMonth}
            onValueChange={(v) => setDisplayMonth(v)}
            style={styles.picker}
            dropdownIconColor={theme.colors.textPrimary}
            mode={Platform.OS === 'android' ? 'dropdown' : undefined}
          >
            {months.map(m => (
              <Picker.Item key={m.value} label={m.label} value={m.value} color={theme.colors.textPrimary} />
            ))}
          </Picker>
          <Picker
            selectedValue={displayYear}
            onValueChange={(v) => setDisplayYear(v)}
            style={styles.picker}
            dropdownIconColor={theme.colors.textPrimary}
            mode={Platform.OS === 'android' ? 'dropdown' : undefined}
          >
            {years.map(y => (
              <Picker.Item key={y} label={String(y)} value={y} color={theme.colors.textPrimary} />
            ))}
          </Picker>
        </View>
        <TouchableOpacity onPress={() => changeMonth(1)} accessibilityLabel="Następny miesiąc" style={[styles.navBtn, { backgroundColor: theme.colors.inputBackground, zIndex: 0 }]}>
          <Feather name="chevron-right" size={18} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Dni tygodnia */}
      <View style={styles.weekHeaderRow}>
        {['Pn','Wt','Śr','Cz','Pt','So','Nd'].map(l => (
          <Text key={l} style={[styles.weekHeader, { color: theme.colors.textSecondary }]}>{l}</Text>
        ))}
      </View>

      {/* Siatka dni miesiąca */}
      <View style={styles.grid} {...swipePan.panHandlers}>
        {daysMatrix.map((cell, idx) => {
          if (!cell.inMonth || !cell.date) {
            return <View key={idx} style={styles.cell} />;
          }
          const d = cell.date;
          const isStart = from ? sameDay(d, from) : false;
          const isEnd = to ? sameDay(d, to) : false;
          const inRange = from && to ? isWithin(d, from, to) : false;
          const isSelected = isStart || isEnd;
          const bg = isSelected ? theme.colors.primary : inRange ? theme.colors.inputBackground : 'transparent';
          const txt = isSelected ? 'white' : theme.colors.textPrimary;
          return (
            <TouchableOpacity key={idx} onPress={() => onDayPress(d)} style={[styles.cell, { backgroundColor: bg, borderRadius: 8 }]} activeOpacity={0.8}>
              <Text style={[styles.dayText, { color: txt }]}>{d.getDate()}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ActionModal>
  );
};

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.small, paddingHorizontal: Spacing.small },
  pickersRow: { position: 'absolute', left: 48, right: 48, height: 52, top: 0, bottom: 0, margin: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  picker: { flexBasis: '48%', height: 52 },
  navBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  weekHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  weekHeader: { width: `${100/7}%`, textAlign: 'center', ...Typography.small },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  cell: { width: `${100/7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginVertical: 2 },
  dayText: { ...Typography.body },
});

export default CalendarRangeModal;


