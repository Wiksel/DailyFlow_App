import '@testing-library/jest-native/extend-expect';
import './test-utils';

// Mock context hooks to return mock values
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => require('./test-utils').mockTheme,
  ThemeProvider: ({ children }: any) => children,
}));

jest.mock('../contexts/UIContext', () => ({
  useUI: () => require('./test-utils').mockUI,
  UIProvider: ({ children }: any) => children,
}));

jest.mock('../contexts/ToastContext', () => ({
  useToast: () => require('./test-utils').mockToast,
  ToastProvider: ({ children }: any) => children,
}));

jest.mock('../contexts/CategoryContext', () => ({
  useCategories: () => require('./test-utils').mockCategories,
  CategoryProvider: ({ children }: any) => children,
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock expo modules
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  getBadgeCountAsync: jest.fn(() => Promise.resolve(0)),
  setBadgeCountAsync: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: '/test/documents/',
  cacheDirectory: '/test/cache/',
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  getInfoAsync: jest.fn(),
}));

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
}));

jest.mock('expo-updates', () => ({
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
}));

// Mock React Native modules
// jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}));

// Mock React Native Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock Firebase
jest.mock('@react-native-firebase/app', () => ({
  app: jest.fn(() => ({})),
  apps: [],
  initializeApp: jest.fn(),
}));

jest.mock('@react-native-firebase/auth', () => ({
  auth: jest.fn(() => ({
    currentUser: null,
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    verifyPhoneNumber: jest.fn(),
    signInWithCredential: jest.fn(),
    linkWithCredential: jest.fn(),
  })),
  getAuth: jest.fn(() => ({
    currentUser: null,
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    verifyPhoneNumber: jest.fn(),
    signInWithCredential: jest.fn(),
    linkWithCredential: jest.fn(),
  })),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  GoogleAuthProvider: jest.fn(() => ({
    credential: jest.fn(),
  })),
  signInWithCredential: jest.fn(),
}));

jest.mock('@react-native-firebase/firestore', () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn(),
    doc: jest.fn(),
    addDoc: jest.fn(),
    updateDoc: jest.fn(),
    deleteDoc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    onSnapshot: jest.fn(),
  })),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(),
    signOut: jest.fn(),
    getCurrentUser: jest.fn(),
    isSignedIn: jest.fn(),
  },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  })),
  useRoute: jest.fn(() => ({
    params: {},
  })),
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: jest.fn(() => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children }: any) => children,
  })),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: jest.fn(() => ({
    Navigator: ({ children }: any) => children,
    Tab: ({ children }: any) => children,
  })),
}));

jest.mock('react-native-gesture-handler', () => ({
  Gesture: {
    Pan: () => ({
      activeOffsetX: () => ({
        failOffsetY: () => ({
          onEnd: () => ({
            runOnJS: () => ({}),
          }),
        }),
      }),
    }),
  },
  GestureDetector: ({ children }: any) => children,
  State: {
    UNDETERMINED: 0,
    FAILED: 1,
    BEGAN: 2,
    CANCELLED: 3,
    ACTIVE: 4,
    END: 5,
  },
}));

// Global test utilities
global.console = {
  ...console,
  // Uncomment to ignore a specific log level
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Mock timers
jest.useFakeTimers();
