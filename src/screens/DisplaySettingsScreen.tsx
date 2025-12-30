import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useUI } from '../contexts/UIContext';
import { Colors, GlobalStyles, Spacing, Typography } from '../styles/AppStyles';
import AppHeader from '../components/AppHeader';

const DisplaySettingsScreen = () => {
  const theme = useTheme();
  const { density, setDensity, focusModeEnabled, setFocusModeEnabled } = useUI();
  const compact = density === 'compact';

  return (
    <View style={[GlobalStyles.container, { backgroundColor: theme.colors.background }]}> 
      <AppHeader title="Wyświetlanie" />
      <View style={[GlobalStyles.section, { backgroundColor: theme.colors.card }]}> 
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Ustawienia wyświetlania</Text>
        <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Motyw</Text>
        <View style={styles.row}>
          {(['system','light','dark'] as const).map(m => (
            <TouchableOpacity key={m} style={[styles.chip, theme.mode === m && { backgroundColor: theme.colors.primary }]} onPress={async () => { try { const h = await import('expo-haptics'); await h.selectionAsync(); } catch {}; theme.setMode(m); }}>
              <Text style={[styles.chipText, theme.mode === m && { color: 'white' }]}>
                {m === 'system' ? 'Systemowy' : m === 'light' ? 'Jasny' : 'Ciemny'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.label, { color: theme.colors.textPrimary, marginTop: Spacing.medium }]}>Motyw akcentu</Text>
        <View style={styles.row}>
          {(['blue','purple','mint','orange'] as const).map(a => (
            <TouchableOpacity key={a} style={[styles.chip, { backgroundColor: theme.accent === a ? theme.colors.primary : theme.colors.inputBackground }]} onPress={async () => { try { const h = await import('expo-haptics'); await h.selectionAsync(); } catch {}; theme.setAccent(a); }}>
              <Text style={[styles.chipText, { color: theme.accent === a ? 'white' : theme.colors.textPrimary }]}>
                {a === 'blue' ? 'Niebieski' : a === 'purple' ? 'Fiolet' : a === 'mint' ? 'Mięta' : 'Pomarańcz'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.colors.textPrimary, marginTop: Spacing.medium }]}>Język</Text>
        <View style={styles.row}>
          {['pl','en'].map(lng => (
            <TouchableOpacity key={lng} style={[styles.chip, { backgroundColor: theme.colors.inputBackground }]} onPress={async () => { try { const h = await import('expo-haptics'); await h.selectionAsync(); } catch {} }}>
              <Text style={[styles.chipText, { color: theme.colors.textPrimary }]}>{lng === 'pl' ? 'Polski' : 'English'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.label, { color: theme.colors.textPrimary, marginTop: Spacing.medium }]}>Gęstość interfejsu</Text>
        <View style={styles.row}>
          {['standard','compact'].map(mode => (
            <TouchableOpacity key={mode} style={[styles.chip, { backgroundColor: (density===mode) ? theme.colors.primary : theme.colors.inputBackground }]} onPress={async () => { try { const h = await import('expo-haptics'); await h.selectionAsync(); } catch {}; setDensity(mode as any); }}>
              <Text style={[styles.chipText, { color: (density===mode) ? 'white' : theme.colors.textPrimary }]}>
                {mode==='compact' ? 'Kompaktowy' : 'Standardowy'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.colors.textPrimary, marginTop: Spacing.medium }]}>Tryb skupienia (Focus Mode)</Text>
        <View style={styles.row}>
          {[true, false].map(v => (
            <TouchableOpacity key={String(v)} style={[styles.chip, { backgroundColor: (focusModeEnabled===v) ? theme.colors.primary : theme.colors.inputBackground }]} onPress={async () => { try { const h = await import('expo-haptics'); await h.selectionAsync(); } catch {}; setFocusModeEnabled(v); }}>
              <Text style={[styles.chipText, { color: (focusModeEnabled===v) ? 'white' : theme.colors.textPrimary }]}>
                {v ? 'Włączony' : 'Wyłączony'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[GlobalStyles.section, { backgroundColor: theme.colors.card, marginTop: Spacing.medium }]}> 
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Podgląd</Text>
        <View style={[styles.previewCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}> 
          <Text style={[styles.previewTitle, { color: theme.colors.textPrimary }]}>Nagłówek</Text>
          <View style={styles.previewRow}>
            <View style={[styles.previewBadge, { backgroundColor: theme.colors.primary }]} />
            <Text style={{ color: theme.colors.textSecondary }}>Element listy (tekst przykładowy)</Text>
          </View>
          <View style={styles.previewRow}>
            <View style={[styles.previewBadge, { backgroundColor: theme.colors.primary }]} />
            <Text style={{ color: theme.colors.textSecondary }}>Element listy (tekst przykładowy)</Text>
          </View>
          <View style={[styles.previewButton, { backgroundColor: theme.colors.primary }]}>
            <Text style={{ color: 'white', fontWeight: '700' }}>Przycisk</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  title: { ...Typography.h3, marginBottom: Spacing.small },
  label: { ...Typography.body, fontWeight: '600' },
  row: { flexDirection: 'row', marginTop: Spacing.small },
  chip: { paddingHorizontal: Spacing.medium, paddingVertical: Spacing.xSmall, borderRadius: 16, marginRight: Spacing.small },
  chipText: { ...Typography.body },
  previewCard: { borderWidth: 1, borderRadius: 12, padding: Spacing.medium },
  previewTitle: { ...Typography.h3, marginBottom: Spacing.small },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.small, marginBottom: Spacing.small },
  previewBadge: { width: 10, height: 10, borderRadius: 5 },
  previewButton: { marginTop: Spacing.medium, alignSelf: 'flex-start', paddingHorizontal: Spacing.medium, paddingVertical: Spacing.xSmall, borderRadius: 8 },
});

export default DisplaySettingsScreen;


