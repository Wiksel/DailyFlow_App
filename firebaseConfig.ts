// firebaseConfig.ts

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Twoja konfiguracja Firebase skopiowana z panelu Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAEuo7v6TFaT7AiCurZlUV4vI2BJBaCCgE",
  authDomain: "dailyflow-b949c.firebaseapp.com",  
  projectId: "dailyflow-b949c",
  storageBucket: "dailyflow-b949c.firebasestorage.app",
  messagingSenderId: "168363541358",
  appId: "1:168363541358:web:c4a31d4d9cdac97c61b77f",
  measurementId: "G-6S76KJLNWJ"
};

// Inicjalizacja Firebase (TYLKO dla usług JS SDK, jak Firestore)
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);