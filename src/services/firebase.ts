import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyD4df_zrpcpHhjG8G1QQTBW0oBEb5O3gTI',
  authDomain: 'skiturapp-94a50.firebaseapp.com',
  projectId: 'skiturapp-94a50',
  storageBucket: 'skiturapp-94a50.firebasestorage.app',
  messagingSenderId: '293970439712',
  appId: '1:293970439712:web:fa99091896a9e387935645',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
