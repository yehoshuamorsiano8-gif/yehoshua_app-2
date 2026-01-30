// --- חלק 1: הגדרות יסוד (חייב להישאר בראש הקובץ) ---
let currentRange = 'today'; 
let myRadarChart = null; 
let currentContext = 'normal';
let currentStep = 0;
let userEntries = {};
let myTrendChart = null;
let currentLifeMode = localStorage.getItem('activeLifeMode') || 'routine';

// הגדרת המצבים (מבוסס על האפיון שלך)
const lifeModes = {
    routine: { label: "שגרה", disabledMetrics: [] },
    busy: { label: "עומס/מבחנים", disabledMetrics: ['leisure-time'] },
    vacation: { label: "חופשה", disabledMetrics: ['work-tasks', 'daily-study'] },
    emergency: { label: "מילואים/חירום", disabledMetrics: ['work-tasks', 'social-life'] }
};

// פונקציית ניווט
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));

    const targetTab = document.getElementById(`tab-${tabId}`);
    if (targetTab) targetTab.classList.add('active');
    
    const activeBtn = Array.from(document.querySelectorAll('.nav-item'))
                           .find(btn => btn.getAttribute('onclick')?.includes(tabId));
    if (activeBtn) activeBtn.classList.add('active');

    if (tabId === 'feedback') {
        renderFeedback();
        runStrategist(); // הפעלה של האסטרטג בכל כניסה למשוב
    }
    if (tabId === 'architect') renderArchitectView();
}

// --- חלק 2: ניהול הסטורי (דיווח יומי) ---
function setContext(contextType) {
    currentContext = contextType;
    document.getElementById('context-opener').classList.remove('active');
    startStory();
}

function startStory() {
    currentStep = 0;
    userEntries = {};
    renderStep();
}

function renderStep() {
    const container = document.getElementById('story-container');
    if (!container) return;
    container.innerHTML = ''; 

    if (currentStep >= architectConfig.metrics.length) {
        showReviewSummary();
        return;
    }

    const metric = architectConfig.metrics[currentStep];
    const card = document.createElement('div');
    card.className = 'story-card active';

    let inputHTML = '';
    if (metric.type === 'v') {
        inputHTML = `<button class="v-btn" onclick="saveEntry('${metric.id}', 1)" style="font-size:3rem; cursor:pointer;">✅</button>`;
    } else if (metric.type === 'slider') {
        inputHTML = `
            <input type="range" min="${metric.min || 0}" max="${metric.max || 10}" value="0" 
                   class="custom-slider" id="input-${metric.id}" 
                   oninput="document.getElementById('val-${metric.id}').innerText = this.value">
            <div id="val-${metric.id}" style="font-size: 2.5rem; margin: 15px;">0</div>
            <button class="next-btn" onclick="saveEntryFromInput('${metric.id}')">המשך</button>
        `;
    } else if (metric.type === 'stepper') {
        inputHTML = `
            <div class="stepper" style="display:flex; align-items:center; gap:20px;">
                <button class="step-btn" onclick="updateStepper('${metric.id}', -1)">-</button>
                <span id="step-val-${metric.id}" style="font-size:2.5rem; min-width: 60px; text-align:center;">0</span>
                <button class="step-btn" onclick="updateStepper('${metric.id}', 1)">+</button>
            </div>
            <button class="next-btn" onclick="saveEntryFromStepper('${metric.id}')" style="margin-top:25px;">המשך</button>
        `;
    }

    card.innerHTML = `
        <div class="card-header">
            <span class="domain-tag" style="background:#3498db; color:white; padding:5px 15px; border-radius:15px;">${metric.domain}</span>
            <h2 style="margin-top:15px;">${metric.label}</h2>
        </div>
        <div class="input-area" style="flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center;">
            ${inputHTML}
        </div>
        <div class="card-footer" style="margin-top:20px;">
            <button class="skip-btn" onclick="saveEntry('${metric.id}', 0)" style="color:#888;">לא רלוונטי היום</button>
            <div style="margin-top:10px; color:#bbb;">${currentStep + 1} / ${architectConfig.metrics.length}</div>
        </div>
    `;
    container.appendChild(card);
}

function saveEntry(id, value) {
    userEntries[id] = Number(value);
    currentStep++;
    renderStep();
}

function saveEntryFromInput(id) {
    const val = document.getElementById(`input-${id}`).value;
    saveEntry(id, val);
}

function updateStepper(id, delta) {
    const el = document.getElementById(`step-val-${id}`);
    let current = parseInt(el.innerText);
    el.innerText = Math.max(0, current + delta);
}

function saveEntryFromStepper(id) {
    const val = parseInt(document.getElementById(`step-val-${id}`).innerText);
    saveEntry(id, val);
}

async function showReviewSummary() {
    const container = document.getElementById('story-container');
    const today = new Date().toLocaleDateString('he-IL').replace(/\//g, "-");

    const dayRecord = {
        date: today,
        context: currentContext,
        entries: userEntries,
        timestamp: new Date().getTime()
    };

    LegacyData.saveDay(today, currentContext, userEntries);
    container.innerHTML = `<div class="story-card active"><h2>מסנכרן לענן... ☁️</h2></div>`;

    try {
        await LegacyCloud.syncToCloud(dayRecord);
        container.innerHTML = `
            <div class="story-card active">
                <h2 style="color:#2ecc71;">סונכרן בהצלחה! ✅</h2>
                <button class="next-btn" onclick="switchTab('feedback')" style="background:#2ecc71; margin-top:20px;">צפה בגרף</button>
            </div>`;
    } catch (e) {
        container.innerHTML = `<div class="story-card active"><h2 style="color:#e74c3c;">שגיאת סנכרון</h2><button onclick="switchTab('feedback')">המשך לגרפים</button></div>`;
    }
}

// --- חלק 3: הצגת נתונים וגרפים ---
function updateFeedbackRange(range) {
    currentRange = range;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.includes(range === 'today' ? 'היום' : range === 'week' ? 'שבוע' : 'חודש'));
    });
    renderFeedback();
}

function renderFeedback() {
    const history = LegacyData.getHistory();
    if (history.length === 0) {
        console.warn("אין נתונים להצגת גרפים");
        return;
    }

    // 1. הכנת נתונים לגרף עכביש (היום האחרון)
    let radarData = {};
    const latestDay = history[history.length - 1];
    architectConfig.metrics.forEach(m => {
        radarData[m.label] = latestDay.entries[m.id] || 0;
    });
    drawRadarChart(radarData);

    // 2. הכנת נתונים לגרף מגמה (כל ההיסטוריה)
    drawTrendChart(history);
}

function drawRadarChart(dataPoints) {
    const canvas = document.getElementById('radarChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (myRadarChart) myRadarChart.destroy();

    myRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: Object.keys(dataPoints),
            datasets: [{
                label: 'Snapshot יומי',
                data: Object.values(dataPoints),
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                borderColor: '#3498db',
                borderWidth: 2
            }]
        },
        options: {
            scales: { r: { min: 0, max: 10, ticks: { display: false } } },
            plugins: { legend: { display: false } }
        }
    });
}

function drawTrendChart(history) {
    const canvas = document.getElementById('trendChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (myTrendChart) myTrendChart.destroy();

    // הכנת התוויות (תאריכים) והערכים (ממוצע יומי)
    const labels = history.map(day => day.date);
    const dataValues = history.map(day => {
        const scores = Object.values(day.entries);
        const sum = scores.reduce((a, b) => a + b, 0);
        return (sum / scores.length).toFixed(1); // ממוצע יומי
    });

    myTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Legacy Score',
                data: dataValues,
                borderColor: '#2ecc71', // ירוק "מניות"
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                fill: true,
                tension: 0.4, // קו מעוגל ויפה
                borderWidth: 3,
                pointRadius: 4
            }]
        },
        options: {
            scales: {
                y: { min: 0, max: 10 }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// --- חלק 4: תצוגת האדריכל ---
function renderArchitectView() {
    const container = document.getElementById('tab-architect');
    if (!container) return;
    container.innerHTML = '<h2>ניהול האדריכל</h2>';

    architectConfig.metrics.forEach(m => {
        const card = document.createElement('div');
        card.style = "background:#fff; border-right:5px solid #3498db; margin:10px 0; padding:15px; border-radius:10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); text-align:right;";
        card.innerHTML = `
            <div style="font-weight:bold;">${m.label}</div>
            <div style="font-size:0.8rem; color:#777;">תחום: ${m.domain} | משקל: ${m.weight}</div>
        `;
        container.appendChild(card);
    });

    const adminBox = document.createElement('div');
    adminBox.innerHTML = `<button onclick="LegacyCloud.secureDeleteAll()" style="background:#e74c3c; color:white; border:none; padding:12px; border-radius:8px; width:100%; margin-top:20px; cursor:pointer;">מחיקת כל הנתונים מהענן</button>`;
    container.appendChild(adminBox);
}

// אתחול בטעינה
window.onload = async () => {
    try {
        await LegacyCloud.pullFromCloud();
    } catch (e) {
        console.warn("Legacy System: Offline mode.");
    }
    function runStrategist() {
    const history = LegacyData.getHistory();
    const insightElement = document.getElementById('insight-text');
    if (!insightElement || history.length === 0) return;

    const latest = history[history.length - 1].entries;
    const metrics = architectConfig.metrics;

    // 1. זיהוי נקודת חוזק (הציון הכי גבוה)
    let bestMetric = metrics[0];
    metrics.forEach(m => {
        if ((latest[m.id] || 0) > (latest[bestMetric.id] || 0)) bestMetric = m;
    });

    // 2. חישוב מגמה בהשוואה ליום הקודם
    let trendMsg = "ברוך הבא למסע! המשך לדווח כדי שאוכל לזהות מגמות.";
    if (history.length > 1) {
        const prev = history[history.length - 2].entries;
        
        // חישוב ממוצעים פשוטים
        const calcAvg = (entryObj) => {
            const vals = Object.values(entryObj);
            return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        };

        const latestAvg = calcAvg(latest);
        const prevAvg = calcAvg(prev);
        const diff = (latestAvg - prevAvg).toFixed(1);

        if (diff > 0.5) trendMsg = `📈 המגמה בשיפור! עלית ב-${diff} נקודות מהדיווח הקודם.`;
        else if (diff < -0.5) trendMsg = `📉 שים לב, יש ירידה של ${Math.abs(diff)} נקודות. מה ניתן לשפר מחר?`;
        else trendMsg = "📊 המצב יציב. עקביות היא המפתח ל-Legacy.";
    }

    // 3. הזרקה לממשק
    insightElement.innerHTML = `
        <div style="margin-bottom: 10px;">
            <span style="background: #f1c40f; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">ניתוח יומי</span><br>
            היום הצטיינת ב<strong>"${bestMetric.label}"</strong>. שמירה על עקביות כאן תבנה תשתית חזקה.
        </div>
        <div>
            <span style="background: #3498db; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">מגמת על</span><br>
            ${trendMsg}
        </div>
    `;
}
// פונקציה לשינוי מצב חיים
function setLifeMode(modeId) {
    currentLifeMode = modeId;
    localStorage.setItem('activeLifeMode', modeId);
    
    // עדכון ויזואלי של הכפתורים
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick').includes(modeId));
    });

    // הודעה מהאסטרטג
    alert(`המערכת עברה למצב: ${lifeModes[modeId].label}. השאלון והמשקולות עודכנו.`);
    
    // רענון התצוגה של האדריכל/משוב אם פתוחים
    if (document.getElementById('tab-feedback').classList.contains('active')) renderFeedback();
}

// עדכון פונקציית ה-renderStep (החלף את הלוגיקה הקודמת שמחליטה איזה מטריקה להציג)
function renderStep() {
    const container = document.getElementById('story-container');
    if (!container) return;

    // סינון מדדים לפי Life Mode
    const activeMetrics = architectConfig.metrics.filter(m => 
        !lifeModes[currentLifeMode].disabledMetrics.includes(m.id)
    );

    if (currentStep >= activeMetrics.length) {
        showReviewSummary();
        return;
    }

    const metric = activeMetrics[currentStep];
    // ... המשך פונקציית ה-renderStep כפי שהייתה מקודם ...
}
// הוסף את זה בסוף הקובץ logic.js

function runStrategist() {
    const insightElement = document.getElementById('insight-text');
    if (!insightElement) return;

    const history = LegacyData.getHistory();
    
    // אם אין היסטוריה - מציגים הודעת פתיחה
    if (history.length === 0) {
        insightElement.innerHTML = "ברוך הבא, אדריכל. התחל לדווח כדי לקבל תובנות אסטרטגיות.";
        return;
    }

    const latest = history[history.length - 1].entries;
    const metrics = architectConfig.metrics;

    // 1. זיהוי נקודת חוזק
    let bestMetric = metrics[0];
    metrics.forEach(m => {
        if ((latest[m.id] || 0) > (latest[bestMetric.id] || 0)) {
            bestMetric = m;
        }
    });

    // 2. חישוב מגמה
    let trendMsg = "מנתח נתונים...";
    if (history.length > 1) {
        const prev = history[history.length - 2].entries;
        const calcAvg = (obj) => {
            const vals = Object.values(obj);
            return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        };
        const diff = (calcAvg(latest) - calcAvg(prev)).toFixed(1);
        
        if (diff > 0.5) trendMsg = `📈 המגמה בשיפור! עלייה של ${diff} נקודות.`;
        else if (diff < -0.5) trendMsg = `📉 ירידה של ${Math.abs(diff)}. מה קרה היום?`;
        else trendMsg = "📊 המצב יציב. עקביות היא המפתח.";
    }

    // 3. הצגה למשתמש
    insightElement.innerHTML = `
        <div style="margin-bottom: 8px;">
            <strong>כוכב היום:</strong> ${bestMetric.label} (ציון גבוה).
        </div>
        <div>
            <strong>מגמה:</strong> ${trendMsg}
        </div>
    `;
}
};