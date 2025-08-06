import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { getAuth, FirebaseAuthTypes, onAuthStateChanged } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { RootTabParamList, TaskStackParamList, BudgetStackParamList, AuthStackParamList } from '../types/navigation';
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
import CategoriesScreen from '../screens/CategoriesScreen';
import ArchiveScreen from '../screens/ArchiveScreen';
import { GlobalStyles } from '../styles/AppStyles';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();
const TasksStackNavigator = createNativeStackNavigator<TaskStackParamList>();
const BudgetsStackNavigator = createNativeStackNavigator<BudgetStackParamList>();

function TaskStack() {
  return (
    <TasksStackNavigator.Navigator
      screenOptions={{
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        animation: 'slide_from_right',
      }}
    >
      <TasksStackNavigator.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <TasksStackNavigator.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: 'Szczegóły zadania', gestureEnabled: false }} />
      <TasksStackNavigator.Screen name="Archive" component={ArchiveScreen} options={{ title: 'Archiwum zadań' }} />
      <TasksStackNavigator.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil i para' }} />
      <TasksStackNavigator.Screen name="ChoreTemplates" component={ChoreTemplatesScreen} options={{ title: 'Szablony obowiązków' }} />
      <TasksStackNavigator.Screen name="Settings" component={SettingsScreen} options={{ title: 'Ustawienia' }} />
      <TasksStackNavigator.Screen name="Categories" component={CategoriesScreen} options={{ title: 'Zarządzaj kategoriami' }} />
    </TasksStackNavigator.Navigator>
  );
}

function BudgetStack() {
    return (
      <BudgetsStackNavigator.Navigator
        screenOptions={{
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          animation: 'slide_from_right',
        }}
      >
        <BudgetsStackNavigator.Screen name="Budgets" component={BudgetsScreen} options={{ headerShown: false }} />
        <BudgetsStackNavigator.Screen name="BudgetDetail" component={BudgetDetailScreen} options={{ title: 'Szczegóły budżetu', gestureEnabled: false }} />
      </BudgetsStackNavigator.Navigator>
    );
}

function AppTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: '#0782F9', tabBarInactiveTintColor: 'gray' }}>
      <Tab.Screen name="TasksTab" component={TaskStack} options={{ title: 'Zadania', headerShown: false, tabBarIcon: ({ color, size }) => <Feather name="check-square" color={color} size={size} /> }} />
      <Tab.Screen name="BudgetsTab" component={BudgetStack} options={{ title: 'Budżet', headerShown: false, tabBarIcon: ({ color, size }) => <Feather name="dollar-sign" color={color} size={size} /> }} />
    </Tab.Navigator>
  );
}

function AuthScreens({ user, onProfileCreated, onRefreshAuthState }: { user: FirebaseAuthTypes.User | null, onProfileCreated: () => void, onRefreshAuthState?: () => void }) {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login">
        {props => <LoginScreen {...props} onRefreshAuthState={onRefreshAuthState} />}
      </AuthStack.Screen>
      <AuthStack.Screen name="Nickname">
        {props => <NicknameScreen {...props} user={user} onProfileCreated={onProfileCreated} />}
      </AuthStack.Screen>
    </AuthStack.Navigator>
  );
}

const AppNavigator = () => {
  const auth = getAuth();
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [userProfileExists, setUserProfileExists] = useState(false);
  const [userVerifiedByPhone, setUserVerifiedByPhone] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Funkcja do ręcznego odświeżenia stanu użytkownika
  const refreshUserState = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const profileExists = userDoc.exists();
      setUserProfileExists(profileExists);
      
      if (profileExists) {
        const userData = userDoc.data();
        setUserVerifiedByPhone(userData?.verifiedByPhone || false);
      } else {
        setUserVerifiedByPhone(false);
      }
    }
  };

  useEffect(() => {
    GoogleSignin.configure({
        webClientId: '168363541358-dpjc8d1ulrvso0cjg8s34qoujhkskfsd.apps.googleusercontent.com',
    });

    const subscriber = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const profileExists = userDoc.exists();
        setUserProfileExists(profileExists);
        
        // Sprawdź czy użytkownik jest zweryfikowany przez telefon
        if (profileExists) {
          const userData = userDoc.data();
          setUserVerifiedByPhone(userData?.verifiedByPhone || false);
        } else {
          setUserVerifiedByPhone(false);
        }
      } else {
        setUserProfileExists(false);
        setUserVerifiedByPhone(false);
      }
      if (initializing) {
        setInitializing(false);
      }
    });
    return subscriber;
  }, []);

  if (initializing) {
    return <View style={GlobalStyles.centered}><ActivityIndicator size="large" /></View>;
  }

  const needsOnboarding = user && user.emailVerified && !userProfileExists;
  
  // Użytkownik jest w pełni zweryfikowany jeśli:
  // - ma zweryfikowany email ALBO jest zweryfikowany przez telefon
  // - ma utworzony profil
  const isUserFullyVerified = user && (user.emailVerified || userVerifiedByPhone) && userProfileExists;

  return (
    <ToastProvider>
      <CategoryProvider>
        <NavigationContainer>
          {isUserFullyVerified ? (
            <AppTabs />
          ) : (
            <AuthScreens 
              user={user} 
              onProfileCreated={refreshUserState}
              onRefreshAuthState={refreshUserState}
            />
          )}
        </NavigationContainer>
      </CategoryProvider>
    </ToastProvider>
  );
};

export default AppNavigator;