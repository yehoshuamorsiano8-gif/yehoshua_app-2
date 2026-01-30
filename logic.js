function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));

    document.getElementById(`tab-${tabId}`).classList.add('active');
    
    // הפעלת פונקציה ספציפית לפי החלונית
    if (tabId === 'feedback') renderFeedback();
    if (tabId === 'architect') renderArchitectView(); // הוספנו את זה
}
// פונקציה חדשה להצגת המדדים בחלונית האדריכל
function renderArchitectView() {
    const container = document.getElementById('tab-architect');
    // שומרים על כפתור המחיקה שהיה שם, ומוסיפים את רשימת המדדים
    const adminControls = container.querySelector('.admin-controls');
    
    let metricsHTML = `<h3>מדדים פעילים במערכת</h3><ul style="list-style:none; padding:0;">`;
    architectConfig.metrics.forEach(m => {
        metricsHTML += `
            <li style="background:#f4f4f4; margin:10px 0; padding:10px; border-right:4px solid var(--primary); border-radius:5px;">
                <strong>${m.label}</strong> (${m.domain})<br>
                <small>סוג: ${m.type} | משקל בסיס: ${m.weight}</small>
            </li>`;
    });
    metricsHTML += `</ul>`;

    // הזרקה לדף - מעל כפתור המחיקה
    const listDiv = document.getElementById('metrics-list') || document.createElement('div');
    listDiv.id = 'metrics-list';
    listDiv.innerHTML = metricsHTML;
    container.insertBefore(listDiv, adminControls);
}

// הפעלה אוטומטית בטעינת הדף (מושך נתונים מהענן)
window.onload = async () => {
    console.log("Legacy System: בודק עדכונים בענן...");
    try {
        await LegacyCloud.pullFromCloud();
        console.log("Legacy System: סנכרון הושלם.");
    } catch (e) {
        console.warn("Legacy System: עובד במצב אופליין.");
    }
};

// --- חלק 2: ניהול הסטורי והדיווח היומי ---
let currentContext = 'normal';
let currentStep = 0;
let userEntries = {};

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
        inputHTML = `<button class="v-btn" onclick="saveEntry('${metric.id}', 1)" style="font-size:3rem; cursor:pointer; background:none; border:none;">✅</button>`;
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
                <button class="step-btn" onclick="updateStepper('${metric.id}', -1)" style="font-size:2rem; width:50px;">-</button>
                <span id="step-val-${metric.id}" style="font-size:2.5rem; min-width: 60px; text-align:center;">0</span>
                <button class="step-btn" onclick="updateStepper('${metric.id}', 1)" style="font-size:2rem; width:50px;">+</button>
            </div>
            <button class="next-btn" onclick="saveEntryFromStepper('${metric.id}')" style="margin-top:25px;">המשך</button>
        `;
    }

    card.innerHTML = `
        <div class="card-header">
            <span class="domain-tag" style="background:#3498db; color:white; padding:5px 15px; border-radius:15px; font-size:0.9rem;">${metric.domain}</span>
            <h2 style="margin-top:15px; font-size:1.8rem;">${metric.label}</h2>
        </div>
        <div class="input-area" style="flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center;">
            ${inputHTML}
        </div>
        <div class="card-footer" style="margin-top:20px;">
            <button class="skip-btn" onclick="saveEntry('${metric.id}', 0)" style="background:none; border:1px solid #ddd; padding:10px 20px; border-radius:10px; cursor:pointer; color:#888;">לא רלוונטי היום</button>
            <div style="margin-top:15px; color:#bbb; font-size:0.85rem;">${currentStep + 1} / ${architectConfig.metrics.length}</div>
        </div>
    `;
    container.appendChild(card);
}

// --- חלק 3: פונקציות שמירה וגרפים ---
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
    const today = new Date().toLocaleDateString('he-IL');

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
                <p>הנתונים שלך נשמרו ב-Legacy Cloud.</p>
                <button class="next-btn" onclick="switchTab('feedback')" style="background:#2ecc71; margin-top:20px;">צפה בגרף המעודכן</button>
            </div>`;
    } catch (e) {
        container.innerHTML = `<div class="story-card active"><h2 style="color:#e74c3c;">שגיאת סנכרון</h2><button onclick="switchTab('feedback')">המשך לגרפים</button></div>`;
    }
}

function renderFeedback() {
    const history = LegacyData.getHistory();
    if (history.length === 0) return;

    const ctx = document.getElementById('radarChart').getContext('2d');
    const latestDay = history[history.length - 1];

    // ניקוי גרף קודם למניעת באגים ויזואליים
    if (window.myRadarChart) window.myRadarChart.destroy();

    window.myRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: architectConfig.metrics.map(m => m.label),
            datasets: [{
                label: `ביצועים: ${latestDay.date}`,
                data: architectConfig.metrics.map(m => latestDay.entries[m.id] || 0),
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                borderColor: 'rgb(52, 152, 219)',
                pointBackgroundColor: 'rgb(52, 152, 219)'
            }]
        },
        options: {
            scales: { r: { min: 0, max: 10, ticks: { display: false } } }
        }
    });
}
function renderArchitectView() {
    const container = document.getElementById('tab-architect');
    // מנקים את החלונית (פרט לכפתור המחיקה)
    container.innerHTML = '<h2>האדריכל - מבנה המערכת</h2>';

    architectConfig.metrics.forEach(metric => {
        const card = document.createElement('div');
        card.style = "background:#fff; border:1px solid #ddd; margin:10px 0; padding:15px; border-radius:10px; text-align:right; border-right: 5px solid var(--primary);";
        card.innerHTML = `
            <div style="font-weight:bold; color:var(--primary);">${metric.domain}</div>
            <div style="font-size:1.2rem; margin:5px 0;">${metric.label}</div>
            <div style="font-size:0.8rem; color:#666;">
                סוג: ${metric.type} | משקל: ${metric.weight} | 
                ${metric.isBonus ? '<span style="color:green;">בונוס</span>' : '<span style="color:red;">בסיס</span>'}
            </div>
        `;
        container.appendChild(card);
    });

    // מחזירים את כפתור המחיקה המאובטח בסוף
    const deleteBtn = document.createElement('div');
    deleteBtn.innerHTML = `
        <div style="margin-top:30px; padding:15px; border:1px dashed red; border-radius:10px;">
            <p>ניהול נתונים מתקדם:</p>
            <button onclick="LegacyCloud.secureDeleteAll()" style="background:red; color:white; border:none; padding:10px; border-radius:5px;">מחיקת כל הנתונים מהענן</button>
        </div>`;
    container.appendChild(deleteBtn);
}
// עדכון פונקציית הניווט - הוספת קריאה לאדריכל
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));

    document.getElementById(`tab-${tabId}`).classList.add('active');
    
    const activeBtn = Array.from(document.querySelectorAll('.nav-item'))
                           .find(btn => btn.getAttribute('onclick').includes(tabId));
    if (activeBtn) activeBtn.classList.add('active');

    // הרצת פונקציות ספציפיות לפי החלונית
    if (tabId === 'feedback') renderFeedback();
    if (tabId === 'architect') renderArchitectView(); // יצירת התצוגה בזמן אמת
}

// פונקציה חדשה: בניית תצוגת האדריכל
function renderArchitectView() {
    const container = document.getElementById('tab-architect');
    // ניקוי ראשוני והוספת כותרת
    container.innerHTML = `
        <div style="padding: 10px;">
            <h2>ניהול האדריכל</h2>
            <p style="color: #666; font-size: 0.9rem;">כאן מוגדרים המדדים שמרכיבים את ה-Legacy שלך.</p>
        </div>
    `;

    // בניית כרטיס לכל מדד שקיים ב-architect.js
    architectConfig.metrics.forEach(m => {
        const card = document.createElement('div');
        card.style = `
            background: #fff;
            border-right: 5px solid ${m.isBonus ? '#2ecc71' : '#3498db'};
            margin: 10px 0;
            padding: 15px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            text-align: right;
        `;
        card.innerHTML = `
            <div style="font-weight: bold; font-size: 1.1rem;">${m.label}</div>
            <div style="font-size: 0.85rem; color: #777; margin: 4px 0;">תחום: ${m.domain} | משקל: ${m.weight}</div>
            <div style="font-size: 0.8rem;">
                סוג קלט: <span style="background: #eee; padding: 2px 6px; border-radius: 4px;">${m.type}</span>
                ${m.isBonus ? '<span style="color: #2ecc71; margin-right: 10px;">★ מדד בונוס</span>' : ''}
            </div>
        `;
        container.appendChild(card);
    });

    // הוספת כפתור המחיקה המאובטח (סעיף 9 באפיון)
    const adminBox = document.createElement('div');
    adminBox.style = "margin-top: 40px; padding: 20px; border-top: 2px dashed #ffcccc; background: #fff5f5; border-radius: 10px;";
    adminBox.innerHTML = `
        <h4 style="color: #e74c3c; margin-top: 0;">אזור אבטחה</h4>
        <p style="font-size: 0.8rem;">פעולות אלו משפיעות ישירות על ה-Cloud Firestore.</p>
        <button onclick="LegacyCloud.secureDeleteAll()" style="background: #e74c3c; color: white; border: none; padding: 12px; border-radius: 8px; width: 100%; cursor: pointer; font-weight: bold;">
            מחיקת כל הנתונים מהענן (Safe Delete)
        </button>
    `;
    container.appendChild(adminBox);
}
let currentRange = 'today';

function updateFeedbackRange(range) {
    currentRange = range;
    // עדכון ויזואלי של הכפתורים
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.includes(range === 'today' ? 'היום' : range === 'week' ? 'שבוע' : 'חודש'));
    });
    renderFeedback();
}

// עדכון פונקציית renderFeedback הקיימת או החלפתה
function renderFeedback() {
    const history = JSON.parse(localStorage.getItem('legacy_history') || '[]');
    if (history.length === 0) return;

    let dataToShow;
    const now = new Date();

    if (currentRange === 'today') {
        dataToShow = history[history.length - 1].scores;
    } else {
        // חישוב ממוצע שבועי או חודשי
        const daysToInclude = currentRange === 'week' ? 7 : 30;
        const recentDays = history.slice(-daysToInclude);
        
        dataToShow = {};
        // אתחול ממוצעים
        architectConfig.metrics.forEach(m => {
            if (!dataToShow[m.domain]) dataToShow[m.domain] = 0;
        });

        recentDays.forEach(day => {
            for (let domain in day.scores) {
                dataToShow[domain] += day.scores[domain] / recentDays.length;
            }
        });
    }

// משתנה גלובלי לשמירת הגרף - חייב להיות מחוץ לפונקציות
let myRadarChart = null; 
let currentRange = 'today';

function updateFeedbackRange(range) {
    currentRange = range;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.includes(range === 'today' ? 'היום' : range === 'week' ? 'שבוע' : 'חודש'));
    });
    renderFeedback();
}

function renderFeedback() {
    // מנסה למשוך מהענן, אם אין - מושך מהלוקאל
    const history = JSON.parse(localStorage.getItem('legacy_history') || localStorage.getItem('legacy_data') || '[]');
    
    if (history.length === 0) {
        console.warn("לא נמצאה היסטוריה להצגת גרף");
        return;
    }

    let dataToShow = {};

    if (currentRange === 'today') {
        // מציג את היום האחרון
        const latestEntry = history[history.length - 1];
        // וידוא שהנתונים מגיעים מהמקום הנכון (entries או scores)
        dataToShow = latestEntry.entries || latestEntry.scores || {};
    } else {
        const daysToInclude = currentRange === 'week' ? 7 : 30;
        const recentDays = history.slice(-daysToInclude);
        
        // חישוב ממוצעים לפי דומיין
        recentDays.forEach(day => {
            const entries = day.entries || day.scores || {};
            architectConfig.metrics.forEach(m => {
                if (!dataToShow[m.label]) dataToShow[m.label] = 0;
                dataToShow[m.label] += (entries[m.id] || 0) / recentDays.length;
            });
        });
    }

    // הקריאה החשובה ביותר - כאן קורה הציור!
    drawRadarChart(dataToShow);
}

function drawRadarChart(dataPoints) {
    const canvas = document.getElementById('radarChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (myRadarChart) {
        myRadarChart.destroy();
    }

    const labels = Object.keys(dataPoints);
    const values = Object.values(dataPoints);

    myRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: `ביצועי Legacy (${currentRange})`,
                data: values,
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(52, 152, 219, 1)'
            }]
        },
        options: {
            scales: {
                r: {
                    angleLines: { display: true },
                    suggestedMin: 0,
                    suggestedMax: 10,
                    ticks: { stepSize: 2 }
                }
            }
        }
    });
}
}