import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Colors, GlobalStyles, Spacing, Typography } from '../styles/AppStyles';
import AppHeader from '../components/AppHeader';
import { useTheme } from '../contexts/ThemeContext';
import * as Notifications from 'expo-notifications';
import { useToast } from '../contexts/ToastContext';

const NotificationsScreen = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const settings = await Notifications.getPermissionsAsync();
        setEnabled(!!settings.granted);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const request = async () => {
    setLoading(true);
    try {
      const res = await Notifications.requestPermissionsAsync();
      setEnabled(!!res.granted);
      if (!res.granted) {
        showToast('Aby korzystać z powiadomień, \nwłącz uprawnienia w ustawieniach systemowych.', 'info');
      }
    } catch {}
    setLoading(false);
  };

  const openSettings = async () => {
    try {
      // Prefer helper in expo-notifications when available
      if (typeof (Notifications as any).openSettings === 'function') {
        await (Notifications as any).openSettings();
        return;
      }
    } catch {}
    try {
      await Linking.openSettings();
    } catch {}
  };

  return (
    <View style={[GlobalStyles.container, { backgroundColor: theme.colors.background }]}> 
      <AppHeader title="Powiadomienia" />
      <View style={[GlobalStyles.section, { backgroundColor: theme.colors.card }]}> 
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Powiadomienia</Text>
        <View style={styles.row}> 
          <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Włączone</Text>
          {loading ? <ActivityIndicator color={theme.colors.primary} /> : (
            <Switch
              value={enabled}
              onValueChange={async (v) => { if (v) { await request(); } else { await openSettings(); } }}
              accessibilityLabel={enabled ? 'Powiadomienia włączone' : 'Powiadomienia wyłączone'}
            />
          )}
        </View>
        <Text style={[styles.helper, { color: theme.colors.textSecondary }]}>Aby całkowicie wyłączyć, użyj ustawień systemowych.</Text>
        <TouchableOpacity onPress={openSettings} style={[{ marginTop: Spacing.small, alignSelf: 'flex-start', paddingHorizontal: Spacing.medium, paddingVertical: Spacing.xSmall, borderRadius: 16, backgroundColor: theme.colors.inputBackground }]}>
          <Text style={{ color: theme.colors.textPrimary }}>Otwórz ustawienia systemowe</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  title: { ...Typography.h3, marginBottom: Spacing.small },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { ...Typography.body },
  helper: { marginTop: Spacing.small },
});

export default NotificationsScreen;



