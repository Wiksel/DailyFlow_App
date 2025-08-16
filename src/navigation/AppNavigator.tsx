import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, AppState } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, Theme as NavTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { doc, getDoc } from '../utils/firestoreCompat';
import { db } from '../../firebaseConfig';
import { RootTabParamList, TaskStackParamList, BudgetStackParamList, AuthStackParamList } from '../types/navigation';
import { isPasswordResetInProgress } from '../utils/authUtils';
import { ToastProvider } from '../contexts/ToastContext';
import { CategoryProvider } from '../contexts/CategoryContext';
import LoginScreen from '../screens/LoginScreen';
import NicknameScreen from '../screens/NicknameScreen';
import HomeScreen from '../screens/HomeScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import BudgetsScreen from '../screens/BudgetsScreen';
import BudgetDetailScreen from '../screens/BudgetDetailScreen';
import ChoreTemplatesScreen from '../screens/ChoreTemplatesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import WeekPlanScreen from '../screens/WeekPlanScreen';
import RecurringSeriesScreen from '../screens/RecurringSeriesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import DisplaySettingsScreen from '../screens/DisplaySettingsScreen';
import AccountSettingsScreen from '../screens/AccountSettingsScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import OutboxScreen from '../screens/OutboxScreen';
import ArchiveScreen from '../screens/ArchiveScreen';
import { GlobalStyles } from '../styles/AppStyles';
import { useTheme } from '../contexts/ThemeContext';
import Constants from 'expo-constants';
import Logger from '../utils/logger';
import { initNotifications, registerNotificationResponseListener, ensureDailyMorningReminderScheduled } from '../utils/notifications';
import { processOutbox } from '../utils/offlineQueue';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();
const TasksStackNavigator = createNativeStackNavigator<TaskStackParamList>();
const BudgetsStackNavigator = createNativeStackNavigator<BudgetStackParamList>();

  function TaskStack() {
  return (
    <TasksStackNavigator.Navigator screenOptions={{ animation: 'slide_from_right' }}>
        <TasksStackNavigator.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <TasksStackNavigator.Screen name="TaskDetail" component={TaskDetailScreen} options={{ headerShown: false }} />
        <TasksStackNavigator.Screen name="Archive" component={ArchiveScreen} options={{ headerShown: false }} />
        <TasksStackNavigator.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil i para' }} />
        <TasksStackNavigator.Screen name="ChoreTemplates" component={ChoreTemplatesScreen} options={{ headerShown: false }} />
        <TasksStackNavigator.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
        <TasksStackNavigator.Screen name="WeekPlan" component={WeekPlanScreen} options={{ headerShown: false }} />
        <TasksStackNavigator.Screen name="RecurringSeries" component={RecurringSeriesScreen} options={{ headerShown: false }} />
        <TasksStackNavigator.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
        <TasksStackNavigator.Screen name="DisplaySettings" component={DisplaySettingsScreen} options={{ headerShown: false }} />
        <TasksStackNavigator.Screen name="Outbox" component={OutboxScreen} options={{ headerShown: false }} />
        <TasksStackNavigator.Screen name="AccountSettings" component={AccountSettingsScreen} options={{ headerShown: false }} />
        <TasksStackNavigator.Screen name="Categories" component={CategoriesScreen} options={{ headerShown: false }} />
    </TasksStackNavigator.Navigator>
  );
}

  function BudgetStack() {
    return (
      <BudgetsStackNavigator.Navigator screenOptions={{ animation: 'slide_from_right' }}>
        <BudgetsStackNavigator.Screen name="Budgets" component={BudgetsScreen} options={{ headerShown: false }} />
        <BudgetsStackNavigator.Screen name="BudgetDetail" component={BudgetDetailScreen} options={{ headerShown: false }} />
      </BudgetsStackNavigator.Navigator>
    );
}

function AppTabs() {
  const theme = useTheme();
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: theme.colors.primary, tabBarInactiveTintColor: theme.colors.textSecondary, headerStyle: { backgroundColor: theme.colors.card }, headerTitleStyle: { color: theme.colors.textPrimary }, tabBarStyle: { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border } }}>
      <Tab.Screen name="TasksTab" component={TaskStack} options={{ title: 'Zadania', headerShown: false, tabBarIcon: ({ color, size }) => <Feather name="check-square" color={color} size={size} /> }} />
      <Tab.Screen name="BudgetsTab" component={BudgetStack} options={{ title: 'Budżet', headerShown: false, tabBarIcon: ({ color, size }) => <Feather name="dollar-sign" color={color} size={size} /> }} />
    </Tab.Navigator>
  );
}

function AuthScreens({ user, onProfileCreated }: { user: FirebaseAuthTypes.User | null, onProfileCreated: () => void }) {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Nickname">
        {props => <NicknameScreen {...props} onProfileCreated={onProfileCreated} />}
      </AuthStack.Screen>
    </AuthStack.Navigator>
  );
}

const AppNavigator = () => {
  const theme = useTheme();
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [userProfileExists, setUserProfileExists] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [showThemeFade, setShowThemeFade] = useState(false);

  useEffect(() => {
    // Notifications init (safe for Expo Go via lazy import)
    (async () => {
      try {
        await initNotifications();
      } catch {}
    })();
    let sub: any;
    (async () => { try { sub = await registerNotificationResponseListener(); } catch {} })();
    const webClientId = (Constants?.expoConfig?.extra as any)?.googleWebClientId;
    if (webClientId) {
      GoogleSignin.configure({ webClientId });
    } else {
      Logger.warn('[GoogleSignin] Brak googleWebClientId w app config. Logowanie Google może nie działać.');
    }

    const subscriber = onAuthStateChanged(getAuth(), async (user) => {
      setUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          setUserProfileExists(userDoc.exists());
        } catch (e) {
          Logger.warn('Failed to read user profile', e);
          setUserProfileExists(false);
        }
      } else {
        setUserProfileExists(false);
      }
      if (initializing) {
        setInitializing(false);
      }
    });
    (async () => { try { await ensureDailyMorningReminderScheduled(); } catch (e) { Logger.warn('ensureDailyMorningReminderScheduled failed', e); } })();
    const outboxTimer = setInterval(() => { processOutbox().catch((e) => Logger.debug('processOutbox tick failed', e)); }, 15000);
    const appStateSub = AppState.addEventListener('change', (state) => { if (state === 'active') { processOutbox().catch((e) => Logger.debug('processOutbox onFocus failed', e)); } });
    return () => { try { sub?.remove?.(); } catch {}; try { appStateSub.remove(); } catch {}; clearInterval(outboxTimer); subscriber(); };
  }, []);

  // Fade overlay when theme/accent changes to smoothen transition
  useEffect(() => {
    setShowThemeFade(true);
    const t = setTimeout(() => setShowThemeFade(false), 220);
    return () => clearTimeout(t);
  }, [theme.colorScheme, theme.accent, theme.colors.primary]);

  if (initializing) {
    return <View style={GlobalStyles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }

  // Dopuszczamy logowanie także użytkowników telefonicznych i Google (nie wymagamy weryfikacji e‑maila dla Google)
  const hasDummyEmail = !!user?.email && user!.email!.endsWith('@dailyflow.app');
  const hasGoogleProvider = !!user?.providerData?.some((p) => p.providerId === 'google.com');
  const requiresEmailVerification = !!user?.email && !hasDummyEmail && !user?.phoneNumber && !hasGoogleProvider;
  const isVerified = requiresEmailVerification ? !!user?.emailVerified : true;
  const suppressAppTabs = isPasswordResetInProgress();
  const needsOnboarding = !!user && isVerified && !userProfileExists;

  const navigationTheme: NavTheme = theme.colorScheme === 'dark' ? {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.card,
      text: theme.colors.textPrimary,
      border: theme.colors.border,
      notification: theme.colors.primary,
    },
  } : {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.card,
      text: theme.colors.textPrimary,
      border: theme.colors.border,
      notification: theme.colors.primary,
    },
  };

  return (
    <ToastProvider>
      <CategoryProvider>
        <NavigationContainer theme={navigationTheme}>
          {user && isVerified && !needsOnboarding && !suppressAppTabs ? (
            <AppTabs />
          ) : (
            <AuthScreens user={user} onProfileCreated={() => setUserProfileExists(true)} />
          )}
          {/* Subtelny fade przy zmianie motywu */}
          {showThemeFade && (
            <Animated.View
              pointerEvents="none"
              entering={FadeIn.duration(120)}
              exiting={FadeOut.duration(180)}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: theme.colors.background }}
            />
          )}
        </NavigationContainer>
      </CategoryProvider>
    </ToastProvider>
  );
};

export default AppNavigator;