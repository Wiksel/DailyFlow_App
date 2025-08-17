import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LabeledInput from '../components/LabeledInput';
import { getAuth } from '@react-native-firebase/auth';
import { useToast } from '../contexts/ToastContext';
import { createNewUserInFirestore } from '../utils/authUtils';
import { Colors, Spacing, Typography, GlobalStyles } from '../styles/AppStyles';
import { useTheme } from '../contexts/ThemeContext';

interface NicknameScreenProps { onProfileCreated: () => void; }

const NicknameScreen = ({ onProfileCreated }: NicknameScreenProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [nickname, setNickname] = useState('');
  const { showToast } = useToast();
  const theme = useTheme();

  const NICK_LOGO_DIAMETER = 140;
  // Sfery dekoracyjne – spójne ze stylem ekranu logowania
  const sphereConfigs = useMemo(() => {
    const targetCount = 32;
    const r = NICK_LOGO_DIAMETER / 2;
    const colors = [
      'rgba(255, 0, 0, 0.28)',     // red
      'rgba(255, 69, 0, 0.28)',     // orange red
      'rgba(255, 140, 0, 0.28)',    // dark orange
      'rgba(255, 215, 0, 0.28)',    // gold
      'rgba(255, 255, 0, 0.28)',    // yellow
      'rgba(50, 205, 50, 0.28)',    // lime green
      'rgba(0, 200, 83, 0.28)',     // vivid green
      'rgba(0, 191, 255, 0.28)',    // deep sky blue
      'rgba(30, 144, 255, 0.28)',   // dodger blue
      'rgba(0, 0, 255, 0.28)',      // pure blue
      'rgba(255, 105, 180, 0.28)',  // hot pink
      'rgba(255, 20, 147, 0.28)',   // deep pink
      'rgba(0, 255, 255, 0.28)',    // cyan
      'rgba(64, 224, 208, 0.28)',   // turquoise
      'rgba(0, 255, 127, 0.28)',    // spring green
      'rgba(127, 255, 0, 0.28)',    // chartreuse
    ];
    type Sphere = { top: number; left: number; size: number; color: string; cx: number; cy: number };
    const items: Sphere[] = [];
    const maxAttempts = 6000;
    let attempts = 0;
    const baseMinGap = 1.5;
    const hotspot1 = { x: r + 0.28 * r, y: r - 0.12 * r };
    const hotspot2 = { x: r - 0.26 * r, y: r + 0.18 * r };
    while (items.length < targetCount && attempts < maxAttempts) {
      attempts++;
      const size = 8 + Math.random() * 14;
      const mix = Math.random();
      let cx: number, cy: number;
      if (mix < 0.35) {
        const theta = Math.random() * Math.PI * 2;
        const rr = Math.sqrt(Math.random()) * (r - size / 2 - 1);
        cx = r + rr * Math.cos(theta);
        cy = r + rr * Math.sin(theta);
      } else if (mix < 0.65) {
        const theta = Math.random() * Math.PI * 2;
        const rr = Math.sqrt(Math.random()) * (0.5 * r);
        cx = hotspot1.x + rr * Math.cos(theta);
        cy = hotspot1.y + rr * Math.sin(theta);
      } else {
        const theta = Math.random() * Math.PI * 2;
        const rr = Math.sqrt(Math.random()) * (0.48 * r);
        cx = hotspot2.x + rr * Math.cos(theta);
        cy = hotspot2.y + rr * Math.sin(theta);
      }
      const dxc = cx - r, dyc = cy - r;
      if (dxc * dxc + dyc * dyc > (r - size / 2 - 1) * (r - size / 2 - 1)) continue;
      let ok = true;
      for (let i = 0; i < items.length; i++) {
        const other = items[i];
        const dx = other.cx - cx;
        const dy = other.cy - cy;
        const dist = Math.hypot(dx, dy);
        const desiredGap = baseMinGap + (Math.random() < 0.15 ? -2 : 0);
        const minDist = (other.size + size) / 2 + desiredGap;
        if (dist < minDist) { ok = false; break; }
      }
      if (!ok && Math.random() < 0.35) ok = true;
      if (!ok) continue;
      items.push({ cx, cy, left: cx - size / 2, top: cy - size / 2, size, color: colors[Math.floor(Math.random() * colors.length)] });
    }
    return items.map(({ cx, cy, ...rest }) => rest);
  }, []);

  const handleFinish = async () => {
    const user = getAuth().currentUser;
    if (!nickname.trim() || !user) {
      showToast('Nick nie może być pusty.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await createNewUserInFirestore(user, nickname);
      showToast('Konto pomyślnie utworzone!', 'success');
      onProfileCreated(); // Powiadom AppNavigator o zakończeniu
    } catch (error: any) {
      showToast(`Błąd finalizacji rejestracji: ${error.message}`, 'error');
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <ScrollView contentContainerStyle={styles.scrollContentContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
            <View style={styles.heroContainer}>
              <View style={styles.heroCircle}>
                {sphereConfigs.map((s, i) => (
                  <View key={i} style={[styles.sphere, { backgroundColor: s.color, top: s.top, left: s.left, width: s.size, height: s.size, borderRadius: s.size / 2 }]}>
                    <LinearGradient
                      pointerEvents="none"
                      colors={[ 'rgba(255,255,255,0.55)', 'rgba(0,0,0,0.28)' ]}
                      start={{ x: 0.05, y: 0.95 }}
                      end={{ x: 0.95, y: 0.05 }}
                      style={[StyleSheet.absoluteFillObject as any, { borderRadius: s.size / 2 }]}
                    />
                    <View style={styles.sphereHighlight} />
                  </View>
                ))}
                <LinearGradient
                  pointerEvents="none"
                  colors={[ 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)', 'rgba(0,0,0,0.00)' ]}
                  start={{ x: 0.0, y: 1.0 }}
                  end={{ x: 1.0, y: 0.0 }}
                  style={StyleSheet.absoluteFillObject as any}
                />
              </View>
              <View style={styles.heroTextWrap}>
                <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Witaj w DailyFlow!</Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>Wybierz swój nick, który będzie widoczny w aplikacji.</Text>
              </View>
            </View>
            <LabeledInput label="Nick" placeholder="Twój Nick" value={nickname} onChangeText={setNickname} editable={!isLoading} containerStyle={{ width: '100%' }} />
            <TouchableOpacity
                style={[GlobalStyles.button, { marginTop: Spacing.medium, width: '100%', backgroundColor: theme.colors.primary }]}
                onPress={async () => { try { const m = await import('expo-haptics'); await m.impactAsync(m.ImpactFeedbackStyle.Medium); } catch {}; handleFinish(); }}
                disabled={isLoading}
            >
                {isLoading ? <ActivityIndicator color="white" /> : <Text style={GlobalStyles.buttonText}>Zaczynajmy!</Text>}
            </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.backgroundLight },
    scrollContentContainer: { flexGrow: 1, justifyContent: 'center' },
    content: { alignItems: 'center', padding: Spacing.xLarge, gap: Spacing.medium },
    heroContainer: { alignItems: 'center', justifyContent: 'center' },
    heroCircle: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.small, position: 'relative', overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.06)' },
    heroIcon: { width: 80, height: 80 },
    sphere: { position: 'absolute', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
    sphereHighlight: { position: 'absolute', bottom: 2, left: 2, width: '40%', height: '40%', borderRadius: 100, opacity: 0.5, backgroundColor: 'rgba(255,255,255,0.2)' },
    heroTextWrap: { alignItems: 'center' },
    modalTitle: { ...Typography.h2, textAlign: 'center', marginBottom: Spacing.small },
    modalSubtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.large },
});

export default NicknameScreen;