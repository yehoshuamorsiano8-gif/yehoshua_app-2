// שימוש בפורמט Compat עם המפתחות האמיתיים שלך
const firebaseConfig = {
  apiKey: "AIzaSyCByvoHlq6K8UZmfO5MoYSjSA5DwJWaDn4",
  authDomain: "yehoshua-system.firebaseapp.com",
  projectId: "yehoshua-system",
  storageBucket: "yehoshua-system.firebasestorage.app",
  messagingSenderId: "233499815606",
  appId: "1:233499815606:web:d302a0797a11635ff3c017",
  measurementId: "G-ZM2F0GSBMN"
};

// אתחול פיירבייס (בדיקה שלא אותחל כבר)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

const LegacyCloud = {
    // סנכרון יום בודד לענן
    syncToCloud: async function(dayRecord) {
        try {
            const docId = dayRecord.date.replace(/\//g, "-");
            // שימוש ב-db (Firestore) שאתחלנו למעלה
            await db.collection("days").doc(docId).set(dayRecord);
            console.log("Legacy Sync: הצלחה לפרויקט yehoshua-system");
            return true;
        } catch (error) {
            console.error("Legacy Sync Error:", error);
            throw error;
        }
    },

    pullFromCloud: async function() {
        try {
            const snapshot = await db.collection("days").orderBy("timestamp", "asc").get();
            const history = snapshot.docs.map(doc => doc.data());
            if (history.length > 0) {
                localStorage.setItem('legacy_history', JSON.stringify(history));
            }
            return history;
        } catch (error) {
            console.error("Cloud Pull Error:", error);
            return [];
        }
    }
};