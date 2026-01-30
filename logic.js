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