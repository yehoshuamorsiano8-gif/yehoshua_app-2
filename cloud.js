// שימוש בפורמט Compat - ללא import!
const firebaseConfig = {
    apiKey: "YOUR_API_KEY", // כאן תזין את המפתח שלך
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_ID",
    appId: "YOUR_APP_ID"
};

// אתחול פיירבייס
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

const LegacyCloud = {
    // סנכרון יום בודד לענן
    syncToCloud: async function(dayRecord) {
        try {
            // הפיכת התאריך למזהה מסמך חוקי (ללא לוכסנים)
            const docId = dayRecord.date.replace(/\//g, "-");
            await db.collection("days").doc(docId).set(dayRecord);
            console.log("Legacy Sync: הצלחה");
        } catch (error) {
            console.error("Legacy Sync Error:", error);
            throw error;
        }
    },

    // משיכת כל ההיסטוריה לסנכרון מכשירים
    pullFromCloud: async function() {
        try {
            const snapshot = await db.collection("days").orderBy("timestamp", "asc").get();
            const history = snapshot.docs.map(doc => doc.data());
            
            if (history.length > 0) {
                localStorage.setItem('legacy_history', JSON.stringify(history));
                console.log("Legacy Cloud: הנתונים עודכנו מהענן");
            }
            return history;
        } catch (error) {
            console.error("Cloud Pull Error:", error);
            return [];
        }
    },

    // מימוש סעיף 9 באפיון: מנגנון מחיקה מאובטח
    secureDeleteAll: async function() {
        const confirmation = prompt("פרוטוקול אבטחה: הקלד 'DELETE' למחיקה סופית של כל נתוני ה-Legacy מהענן:");
        
        if (confirmation === "DELETE") {
            try {
                const snapshot = await db.collection("days").get();
                const batch = db.batch();
                snapshot.docs.forEach((doc) => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                localStorage.clear();
                alert("המחיקה הושלמה. המערכת תתאפס.");
                window.location.reload();
            } catch (error) {
                alert("שגיאה בתהליך המחיקה.");
            }
        } else {
            alert("המחיקה בוטלה. הנתונים מוגנים.");
        }
    }
};