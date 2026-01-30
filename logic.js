// --- חלק 1: הגדרות יסוד (חייב להישאר בראש הקובץ) ---
let currentRange = 'today'; 
let myRadarChart = null; 
let currentContext = 'normal';
let currentStep = 0;
let userEntries = {};
let myTrendChart = null;

// פונקציית ניווט
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));

    const targetTab = document.getElementById(`tab-${tabId}`);
    if (targetTab) targetTab.classList.add('active');
    
    const activeBtn = Array.from(document.querySelectorAll('.nav-item'))
                           .find(btn => btn.getAttribute('onclick')?.includes(tabId));
    if (activeBtn) activeBtn.classList.add('active');

    if (tabId === 'feedback') renderFeedback();
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
    if (history.length === 0) return;

    let dataPoints = {};
    const latestDay = history[history.length - 1];

    if (currentRange === 'today') {
        architectConfig.metrics.forEach(m => {
            dataPoints[m.label] = latestDay.entries[m.id] || 0;
        });
    } else {
        const daysToInclude = currentRange === 'week' ? 7 : 30;
        const recentDays = history.slice(-daysToInclude);
        
        architectConfig.metrics.forEach(m => {
            let sum = 0;
            recentDays.forEach(day => sum += (day.entries[m.id] || 0));
            dataPoints[m.label] = sum / Math.max(1, recentDays.length);
        });
    }
    drawRadarChart(dataPoints);
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
                label: `ביצועי Legacy (${currentRange})`,
                data: Object.values(dataPoints),
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                borderColor: '#3498db',
                borderWidth: 2,
                pointBackgroundColor: '#3498db'
            }]
        },
        options: {
            scales: {
                r: {
                    min: 0,
                    max: 10,
                    ticks: { stepSize: 2, display: false }
                }
            },
            plugins: { legend: { display: false } }
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
};