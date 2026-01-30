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
        let history = this.getHistory();
        
        // מניעת כפילויות (עדכון רשומה קיימת לאותו תאריך)
        const existingIndex = history.findIndex(d => d.date === date);
        if (existingIndex > -1) {
            history[existingIndex] = dayRecord;
        } else {
            history.push(dayRecord);
        }
        
        // שמירה חזרה ל-LocalStorage
        localStorage.setItem('legacy_history', JSON.stringify(history));
        return dayRecord;
    },

    // חישוב הציון המשוקלל לפי חוקי ה-Architect
    calculateDailyScore: function(entries, context) {
        let totalWeightedScore = 0;
        let totalWeights = 0;

        architectConfig.metrics.forEach(metric => {
            const val = entries[metric.id] || 0;
            
            // קריאה לפונקציה מהאדריכל (וידוא שם תקין: getDynamicWeight)
            const dynamicWeight = getDynamicWeight(metric.id, context);

            if (dynamicWeight > 0) {
                let performance = 0;
                
                // חישוב לפי סוג המדד
                if (metric.type === 'v') {
                    performance = val ? 1 : 0; 
                } else if (metric.type === 'slider' || metric.type === 'stepper') {
                    const max = metric.max || 10;
                    const min = metric.min || 0;
                    // נירמול הערך לטווח של 0 עד 1
                    performance = (val - min) / (max - min);
                    performance = Math.max(0, Math.min(performance, 1)); 
                }

                totalWeightedScore += (performance * dynamicWeight);
                totalWeights += dynamicWeight;
            }
        });

        // החזרת ציון סופי מ-0 עד 100
        return totalWeights > 0 ? Math.round((totalWeightedScore / totalWeights) * 100) : 0;
    },

    // שליפת ההיסטוריה לגרפים בצורה בטוחה
    getHistory: function() {
        try {
            const history = JSON.parse(localStorage.getItem('legacy_history')) || [];
            return history.sort((a, b) => a.timestamp - b.timestamp);
        } catch (e) {
            console.error("שגיאה בקריאת היסטוריה:", e);
            return [];
        }
    }
};