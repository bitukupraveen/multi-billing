import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAG2dWGEfmMcW2xfl_sp3MgON9vu0U84oU",
    authDomain: "ecommerce-billing.firebaseapp.com",
    projectId: "ecommerce-billing",
    storageBucket: "ecommerce-billing.firebasestorage.app",
    messagingSenderId: "840189427660",
    appId: "1:840189427660:web:ca0ce44168cc8c07c32769",
    measurementId: "G-PYYH75W244"
};

const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app); 
export const db = getFirestore(app);
