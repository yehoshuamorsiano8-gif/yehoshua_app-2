// שימוש בפורמט Compat - ללא import!
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_ID",
    appId: "YOUR_APP_ID"
};

// אתחול
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const LegacyCloud = {
    syncToCloud: async function(dayRecord) {
        try {
            const docId = dayRecord.date.replace(/\//g, "-");
            await db.collection("days").doc(docId).set(dayRecord);
            console.log("סונכרן בהצלחה לענן!");
        } catch (error) {
            console.error("שגיאה בסנכרון:", error);
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
            console.error("שגיאה במשיכה:", error);
            return [];
        }
    }
};