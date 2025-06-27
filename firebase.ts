// src/firebase.ts

// Import the functions you need from the Firebase SDKs
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyBtzd0B3fIDJ8XRM1ESKx3klnGZRtVy0Dg',
  authDomain: 'digital-scoresheet-by-jcta.firebaseapp.com',
  databaseURL: 'https://digital-scoresheet-by-jcta-default-rtdb.firebaseio.com',
  projectId: 'digital-scoresheet-by-jcta',
  storageBucket: 'digital-scoresheet-by-jcta.appspot.com',
  messagingSenderId: '911278880062',
  appId: '1:911278880062:web:7ae070f8bdc8e9bbe8686f',
  measurementId: 'G-C31DHJ8EXT',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the Realtime Database
export const db = getDatabase(app);
