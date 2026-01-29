// --- חלק 1: ניהול הניווט בין החלוניות ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));

    document.getElementById(`tab-${tabId}`).classList.add('active');
    
    // סימון הכפתור הנכון בתפריט (מטפל בלחיצה ישירה)
    const activeBtn = Array.from(document.querySelectorAll('.nav-item'))
                           .find(btn => btn.getAttribute('onclick').includes(tabId));
    if (activeBtn) activeBtn.classList.add('active');
}

// --- חלק 2: ניהול הסטורי והדיווח היומי ---
let currentContext = 'normal';
let currentStep = 0;
let userEntries = {};

// הגדרת הקשר יומי (מופעל מכפתורי הפתיחה ב-HTML)
function setContext(contextType) {
    currentContext = contextType;
    console.log(`הקשר יומי: ${contextType}`);
    
    document.getElementById('context-opener').classList.remove('active');
    startStory();
}

function startStory() {
    currentStep = 0;
    userEntries = {};
    renderStep();
}

// פונקציית הציור של הכרטיסים (Render)
function renderStep() {
    const container = document.getElementById('story-container');
    container.innerHTML = ''; 

    // בדיקה אם עברנו את כל המדדים שמוגדרים ב-architect.js
    if (currentStep >= architectConfig.metrics.length) {
        showReviewSummary();
        return;
    }

    const metric = architectConfig.metrics[currentStep];
    const card = document.createElement('div');
    card.className = 'story-card active';

    // יצירת ממשק הקלט לפי סוג המדד
    let inputHTML = '';
    if (metric.type === 'v') {
        inputHTML = `<button class="v-btn" onclick="saveEntry('${metric.id}', 1)">✅</button>`;
    } else if (metric.type === 'slider') {
        inputHTML = `
            <input type="range" min="${metric.min}" max="${metric.max}" value="0" 
                   class="custom-slider" id="input-${metric.id}" 
                   oninput="document.getElementById('val-${metric.id}').innerText = this.value">
            <div id="val-${metric.id}" style="font-size: 2rem; margin: 10px;">0</div>
            <button class="next-btn" onclick="saveEntryFromInput('${metric.id}')">המשך</button>
        `;
    } else if (metric.type === 'stepper') {
        inputHTML = `
            <div class="stepper">
                <button class="step-btn" onclick="updateStepper('${metric.id}', -1)">-</button>
                <span id="step-val-${metric.id}" style="font-size:2rem; min-width: 60px;">0</span>
                <button class="step-btn" onclick="updateStepper('${metric.id}', 1)">+</button>
            </div>
            <button class="next-btn" onclick="saveEntryFromStepper('${metric.id}')" style="margin-top:20px;">המשך</button>
        `;
    }

    card.innerHTML = `
        <div class="card-header">
            <span class="domain-tag" style="background:#eee; padding:5px 10px; border-radius:10px; font-size:0.8rem;">${metric.domain}</span>
            <h2 style="margin-top:10px;">${metric.label}</h2>
        </div>
        <div class="input-area" style="flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center;">
            ${inputHTML}
        </div>
        <div class="card-footer" style="margin-top:20px;">
            <button class="skip-btn" onclick="saveEntry('${metric.id}', 0)" style="background:none; border:1px solid #ddd; padding:10px; border-radius:10px; cursor:pointer;">לא רלוונטי היום</button>
            <div style="margin-top:15px; color:#888; font-size:0.8rem;">משימה ${currentStep + 1} מתוך ${architectConfig.metrics.length}</div>
        </div>
    `;

    container.appendChild(card);
}

// --- חלק 3: פונקציות עזר לשמירה ועדכון ---

function saveEntry(id, value) {
    userEntries[id] = value;
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

    // יצירת הרשומה
    const dayRecord = {
        date: today,
        context: currentContext,
        entries: userEntries,
        timestamp: new Date().getTime()
    };

    // שמירה מקומית
    LegacyData.saveDay(today, currentContext, userEntries);

    // הצגת הודעת טעינה
    container.innerHTML = `<div class="story-card active"><h2>מסנכרן לענן... ☁️</h2></div>`;

    try {
        // סנכרון לענן (cloud.js)
        await LegacyCloud.syncToCloud(dayRecord);

        container.innerHTML = `
            <div class="story-card active">
                <h2>סונכרן בהצלחה! ✅</h2>
                <p>הנתונים עודכנו ב"גוגל דוקס" האישי שלך.</p>
                <button class="next-btn" onclick="switchTab('feedback')" style="padding:15px 30px; background:#2ecc71; color:white; border:none; border-radius:10px; font-size:1.1rem; cursor:pointer; margin-top:20px;">עבור לגרפים</button>
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<div class="story-card active"><h2>שגיאת סנכרון ❌</h2><p>הנתונים נשמרו רק מקומית.</p></div>`;
    }
}
function renderFeedback() {
    const history = LegacyData.getHistory();
    if (history.length === 0) return;

    const ctx = document.getElementById('radarChart').getContext('2d');
    const latestScore = history[history.length - 1].entries;

    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: architectConfig.metrics.map(m => m.label),
            datasets: [{
                label: 'ביצועים נוכחיים',
                data: architectConfig.metrics.map(m => latestScore[m.id] || 0),
                fill: true,
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                borderColor: 'rgb(52, 152, 219)',
            }]
        }
    });
}