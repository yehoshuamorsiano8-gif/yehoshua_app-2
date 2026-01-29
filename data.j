// ניהול מסד הנתונים המקומי והלוגיקה המתמטית
const LegacyData = {
    // שמירת יום חדש בזיכרון המקומי
    saveDay: function(date, context, entries) {
        const dayRecord = {
            date: date,
            context: context,
            entries: entries,
            score: this.calculateDailyScore(entries, context),
            timestamp: new Date().getTime()
        };

        // שליפת נתונים קיימים
        let history = JSON.parse(localStorage.getItem('legacy_history')) || [];
        
        // מניעת כפילויות (אם כבר קיים דיווח להיום - נעדכן אותו)
        const existingIndex = history.findIndex(d => d.date === date);
        if (existingIndex > -1) {
            history[existingIndex] = dayRecord;
        } else {
            history.push(dayRecord);
        }
        
        // שמירה חזרה ל-LocalStorage
        localStorage.setItem('legacy_history', JSON.stringify(history));
        console.log("נתונים נשמרו מקומית:", dayRecord);
        return dayRecord;
    },

    // חישוב הציון המשוקלל לפי חוקי ה-Architect
    calculateDailyScore: function(entries, context) {
        let totalWeightedScore = 0;
        let totalWeights = 0;

        architectConfig.metrics.forEach(metric => {
            const val = entries[metric.id] || 0;
            
            // קבלת המשקל הדינמי (מושפע מבלת"מים/מחלה)
            const dynamicWeight = getDynamicWeight(metric.id, context);

            if (dynamicWeight > 0) {
                let performance = 0;
                
                // חישוב לפי סוג המדד
                if (metric.type === 'v') {
                    performance = val; // 1 או 0
                } else if (metric.type === 'slider' || metric.type === 'stepper') {
                    const max = metric.max || 10;
                    performance = Math.min(val / max, 1); // נירמול לערך בין 0 ל-1
                }

                totalWeightedScore += (performance * dynamicWeight);
                totalWeights += dynamicWeight;
            }
        });

        // החזרת ציון סופי מ-0 עד 100
        return totalWeights > 0 ? Math.round((totalWeightedScore / totalWeights) * 100) : 0;
    },

    // שליפת ההיסטוריה לגרפים
    getHistory: function() {
        const history = JSON.parse(localStorage.getItem('legacy_history')) || [];
        // מיון לפי זמן כדי שהגרף יהיה כרונולוגי
        return history.sort((a, b) => a.timestamp - b.timestamp);
    }
};