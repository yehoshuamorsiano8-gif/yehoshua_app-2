// ניהול מסד הנתונים המקומי
const LegacyData = {
    // שמירת יום חדש
    saveDay: function(date, context, entries) {
        const dayRecord = {
            date: date,
            context: context,
            entries: entries,
            score: this.calculateDailyScore(entries, context)
        };

        // שליפת נתונים קיימים
        let history = JSON.parse(localStorage.getItem('legacy_history')) || [];
        history.push(dayRecord);
        
        // שמירה חזרה
        localStorage.setItem('legacy_history', JSON.stringify(history));
        console.log("היום נשמר בהצלחה!", dayRecord);
    },

    // לוגיקת חישוב הציון (הלב של ה"הוגנות" באפיון)
    calculateDailyScore: function(entries, context) {
        let totalWeightedScore = 0;
        let totalWeights = 0;

        architectConfig.metrics.forEach(metric => {
            const val = entries[metric.id] || 0;
            
            // קבלת המשקל הדינמי מהאדריכל (מושפע מהבלת"מים)
            const dynamicWeight = getDynamicWeight(metric.id, context);

            if (dynamicWeight > 0) {
                // חישוב יחסי (למשל: אם זה V, אז 1 או 0. אם זה סליידר, אז הערך חלקי המקסימום)
                let performance = 0;
                if (metric.type === 'v') performance = val;
                else if (metric.type === 'slider' || metric.type === 'stepper') {
                    const max = metric.max || 10;
                    performance = Math.min(val / max, 1);
                }

                totalWeightedScore += (performance * dynamicWeight);
                totalWeights += dynamicWeight;
            }
        });

        // החזרת ציון סופי מ-0 עד 100
        return totalWeights > 0 ? Math.round((totalWeightedScore / totalWeights) * 100) : 0;
    },

    // שליפת היסטוריה לגרפים
    getHistory: function() {
        return JSON.parse(localStorage.getItem('legacy_history')) || [];
    }
};