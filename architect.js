// הגדרת מבנה האישיות - האדריכל
const architectConfig = {
    // רשימת המדדים (Metrics)
    metrics: [
        {
            id: 'learning',
            domain: 'רוחניות',
            label: 'דף יומי',
            type: 'v', // ביצועי (V)
            weight: 5, // משקל 1-5
            isBonus: false // מדד בסיס (Zero-Sum)
        },
        {
            id: 'work_hours',
            domain: 'קריירה',
            label: 'שעות ריכוז',
            type: 'slider', // סליידר זמן
            min: 0,
            max: 10,
            weight: 4,
            isBonus: false
        },
        {
            id: 'reading',
            domain: 'צמיחה',
            label: 'קריאת העשרה',
            type: 'stepper', // בורר מספרים (דפים)
            weight: 2,
            isBonus: true // מדד בונוס - אי עשייה לא פוגעת
        }
    ],

    // ניהול מצבי חיים (Life-Modes) מתוך האפיון
    lifeModes: {
        'normal': { weightMultiplier: 1 },
        'unplanned': { weightMultiplier: 0.5, skipBonus: true }, // יום בלת"מים מוריד לחץ
        'sick': { weightMultiplier: 0.2, hideBonus: true }      // במחלה רק חובות בסיס נשארות
    }
};

// פונקציה לחישוב משקל דינמי לפי ההקשר היומי
function getDynamicWeight(metricId, context) { // תיקון שם הפונקציה
    const metric = architectConfig.metrics.find(m => m.id === metricId);
    if (!metric) return 0; // הגנה למקרה שלא נמצא מדד

    const modeConfig = architectConfig.lifeModes[context] || architectConfig.lifeModes['normal'];
    
    let finalWeight = metric.weight;

    // אם זה יום חריג ומדד בונוס - נתעלם ממנו או נוריד משקל
    if (metric.isBonus && modeConfig.hideBonus) return 0;
    
    return finalWeight * modeConfig.weightMultiplier;
}