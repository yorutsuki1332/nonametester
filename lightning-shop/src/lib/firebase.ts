import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';
import 'firebase/compat/storage';

const firebaseConfig = {
    apiKey: "AIzaSyBky8OW6DkZ1nmcH_uqARRCBKuYmkavMzI",
    authDomain: "tester-ec75c.firebaseapp.com",
    projectId: "tester-ec75c",
    storageBucket: "tester-ec75c.firebasestorage.app",
    messagingSenderId: "761357583297",
    appId: "1:761357583297:web:5d7bc8f4afc16a38cce540",
    measurementId: "G-PGXJMR5LMT"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export const db = firebase.firestore();
export const auth = firebase.auth();
export const storage = firebase.storage();