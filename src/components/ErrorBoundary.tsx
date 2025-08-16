import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import * as Updates from 'expo-updates';
import { Spacing, Typography } from '../styles/AppStyles';
import { ThemeReactContext } from '../contexts/ThemeContext';
import Logger from '../utils/logger';

type ErrorBoundaryState = { hasError: boolean; error?: unknown };

export default class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    Logger.captureException(error, { componentStack: info?.componentStack });
  }

  async handleReload() {
    try {
      await Updates.reloadAsync();
    } catch (e) {
      Logger.error('Failed to reload app', e);
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const theme = this.context as any;
    const message = this.state.error instanceof Error ? this.state.error.message : String(this.state.error ?? 'Unknown error');
    return (
      <View style={[styles.container, theme ? { backgroundColor: theme.colors.background } : null]}>
        <View style={[styles.card, theme ? { backgroundColor: theme.colors.card, borderColor: theme.colors.border } : null]}>
          <Text style={[styles.title, theme ? { color: theme.colors.textPrimary } : null]}>Coś poszło nie tak</Text>
          <Text style={[styles.subtitle, theme ? { color: theme.colors.textSecondary } : null]}>Aplikacja napotkała błąd. Spróbuj ponownie uruchomić.</Text>
          <ScrollView style={[styles.errorBox, theme ? { borderColor: theme.colors.border } : null]} contentContainerStyle={{ padding: Spacing.small }}>
            <Text style={[styles.errorText, theme ? { color: theme.colors.textSecondary } : null]} selectable numberOfLines={8}>{message}</Text>
          </ScrollView>
          <TouchableOpacity style={[styles.button, theme ? { backgroundColor: theme.colors.primary } : null]} onPress={() => this.handleReload()} accessibilityRole="button" accessibilityLabel="Uruchom ponownie aplikację">
            <Text style={styles.buttonText}>Uruchom ponownie</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

ErrorBoundary.contextType = ThemeReactContext as any;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', padding: Spacing.large },
  card: { width: '100%', maxWidth: 600, backgroundColor: '#1b1b1b', borderRadius: 14, padding: Spacing.large, borderColor: '#222', borderWidth: 1 },
  title: { ...Typography.h2, color: '#fff', textAlign: 'center', marginBottom: Spacing.small },
  subtitle: { ...Typography.body, color: '#bbb', textAlign: 'center', marginBottom: Spacing.large },
  errorBox: { maxHeight: 180, backgroundColor: '#0d0d0d', borderRadius: 8, marginBottom: Spacing.large, borderColor: '#222', borderWidth: 1 },
  errorText: { ...Typography.small, color: '#ddd' },
  button: { backgroundColor: '#0782F9', padding: Spacing.medium, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '700', fontSize: 16 },
});


