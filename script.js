function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === pageId);
    });
    window.scrollTo(0, 0);
}

function showNotification(message) {
    const n = document.createElement('div');
    n.className = 'notification';
    n.textContent = message;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}

function playChime() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o1 = ctx.createOscillator();
        const o2 = ctx.createOscillator();
        const g = ctx.createGain();
        o1.frequency.value = 400.25;
        o2.frequency.value = 500.25;
        o1.type = 'sine';
        o2.type = 'sine';
        g.gain.setValueAtTime(0.05, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        o1.connect(g); o2.connect(g); g.connect(ctx.destination);
        o1.start(); o2.start();
        o1.stop(ctx.currentTime + 0.8);
        o2.stop(ctx.currentTime + 0.8);
    } catch(e) {}
}

const monsterPhrases = [
    "Не забудь выпить стакан воды! 💧",
    "Сделай глубокий вдох и выдох 🌬️",
    "Тренируй память каждый день! 🧠",
    "Посмотри вдаль — отдохни глазам 👁️",
    "Ты молодец, что заботишься о себе! 💚",
    "Выпей воды, даже если не хочешь пить 💧",
    "Помни: здоровье — это богатство! ✨",
    "Сделай перерыв и потянись! 🙆",
    "Дыши глубоко — это снимает стресс 🌿",
    "Твой мозг любит тренировки! 🎯",
    "Вода — источник жизни! 💦",
    "Не сиди долго — подвигайся! 🏃",
    "Регулярность важнее интенсивности! ⭐",
    "Ты на правильном пути! 🌱",
    "Забота о себе — необходимость! 💝"
];
let lastPhraseIndex = -1;

function monsterSpeak() {
    playChime();
    let idx;
    do { idx = Math.floor(Math.random() * monsterPhrases.length); } while (idx === lastPhraseIndex);
    lastPhraseIndex = idx;
    const s = document.getElementById('monsterSpeech');
    s.textContent = monsterPhrases[idx];
    s.style.display = 'block';
    setTimeout(() => s.style.display = 'none', 4000);
}

// ===== ДЫХАНИЕ (ИСПРАВЛЕННАЯ ЛОГИКА) =====
let breathingInterval;
let breathingPhase = 0;
const phases = ['Вдох...', 'Задержка...', 'Выдох...', 'Задержка...'];

// Мягкий звук дыхания: плавный тон вверх на вдохе, вниз на выдохе, на задержках тишина
let breathingAudio = null;
let breathingTone = null;

function getBreathingAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!breathingAudio) {
        const ctx = new AC();
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 600;
        filter.connect(ctx.destination);
        breathingAudio = { ctx, filter };
    }
    if (breathingAudio.ctx.state === 'suspended') breathingAudio.ctx.resume();
    return breathingAudio;
}

function playBreathTone(rising) {
    try {
        const a = getBreathingAudio();
        if (!a) return;

        const { ctx, filter } = a;
        const now = ctx.currentTime;
        const dur = 4;

        const from = rising ? 196 : 262;
        const to = rising ? 262 : 196;

        const gain = ctx.createGain();

        // Очень тихое и плавное звучание
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.012, now + 2);

        gain.gain.setValueAtTime(0.012, now + 2.5);
        gain.gain.linearRampToValueAtTime(0.0001, now + dur);

        gain.connect(filter);

        const osc = ctx.createOscillator();
        osc.type = 'sine';

        // Плавное изменение тона
        osc.frequency.setValueAtTime(from, now);
        osc.frequency.exponentialRampToValueAtTime(to, now + dur);

        osc.connect(gain);
        osc.start(now);
        osc.stop(now + dur + 0.1);

        breathingTone = { gain, oscs: [osc], ctx };

    } catch (e) {}
}

function fadeOutBreathTone() {
    if (!breathingTone) return;
    const { gain, oscs, ctx } = breathingTone;
    breathingTone = null;
    try {
        const now = ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(0.0001, now, 0.15);
        oscs.forEach(o => { try { o.stop(now + 0.8); } catch (e) {} });
    } catch (e) {}
}

function startBreathing() {
    stopBreathing();
    breathingPhase = 0;
    updateBreathingPhase();
    breathingInterval = setInterval(() => {
        breathingPhase = (breathingPhase + 1) % 4;
        updateBreathingPhase();
    }, 4000);
}

function updateBreathingPhase() {
    const circle = document.getElementById('breathingCircle');
    const text = document.getElementById('breathingText');
    text.textContent = phases[breathingPhase];

    if (breathingPhase === 0) {
        circle.classList.add('inhale');
        playBreathTone(true);
    } else if (breathingPhase === 1) {
        // задержка — шар не меняется
    } else if (breathingPhase === 2) {
        circle.classList.remove('inhale');
        playBreathTone(false);
    } else if (breathingPhase === 3) {
        // задержка — шар не меняется
    }
}

function stopBreathing() {
    clearInterval(breathingInterval);
    fadeOutBreathTone();
    const circle = document.getElementById('breathingCircle');
    const text = document.getElementById('breathingText');
    circle.classList.remove('inhale');
    text.textContent = 'Готов?';
}
// ===== ВОДА =====
let waterCount = parseInt(localStorage.getItem('zoiWaterCount')) || 0;

function initWaterTracker() {
    const c = document.getElementById('waterGlasses');
    if (!c) return;
    c.innerHTML = '';
    for (let i = 0; i < 8; i++) {
        const g = document.createElement('div');
        g.className = 'glass' + (i < waterCount ? ' filled' : '');
        g.onclick = () => toggleGlass(i);
        c.appendChild(g);
    }
    const wc = document.getElementById('waterCount');
    if (wc) wc.textContent = waterCount;
}

function toggleGlass(i) {
    waterCount = (i < waterCount) ? i : i + 1;
    localStorage.setItem('zoiWaterCount', waterCount);
    initWaterTracker();
}

function resetWater() {
    waterCount = 0;
    localStorage.setItem('zoiWaterCount', 0);
    initWaterTracker();
    showNotification('Счетчик сброшен');
}

// ===== ПАМЯТЬ =====
const allWords = [
    'яблоко', 'дерево', 'книга', 'солнце', 'облако', 'река', 'гора', 'птица',
    'цветок', 'дорога', 'город', 'море', 'звезда', 'камень', 'ветер', 'дождь',
    'музыка', 'танец', 'песня', 'картина', 'театр', 'парк', 'время', 'память',
    'мечта', 'радость', 'дружба', 'семья', 'компьютер', 'телефон', 'экран',
    'клавиша', 'папка', 'файл', 'сеть', 'программа', 'окно', 'дверь', 'стол',
    'стул', 'лампа', 'зеркало', 'карта', 'глобус', 'планета', 'космос', 'ракета',
    'корабль', 'поезд', 'самолет', 'автомобиль', 'велосипед', 'мост',
    'башня', 'замок', 'дворец', 'музей', 'библиотека', 'школа', 'университет',
    'наука', 'искусство', 'культура', 'история', 'философия', 'математика',
    'физика', 'химия', 'биология', 'география', 'астрономия', 'медицина'
];

let currentLevel = 1, targetWords = [], selectedWords = [], memoryTimer, timeLeft = 0, score = 0;

function getWordsForLevel(l) {
    return [...allWords].sort(() => Math.random() - 0.5).slice(0, l + 2);
}

function getDistractorWords(t, c) {
    return allWords.filter(w => !t.includes(w)).sort(() => Math.random() - 0.5).slice(0, c);
}

function updateLevelIndicator() {
    document.querySelectorAll('.level-dot').forEach((d, i) => {
        d.classList.toggle('active', i < currentLevel);
    });
}

function startMemoryGame() {
    currentLevel = 1; score = 0;
    updateLevelIndicator();
    startLevel();
}

function startLevel() {
    targetWords = getWordsForLevel(currentLevel);
    selectedWords = [];
    document.getElementById('startMemoryBtn').style.display = 'inline-block';
    document.getElementById('checkMemoryBtn').style.display = 'none';
    document.getElementById('nextLevelBtn').style.display = 'none';
    document.getElementById('wordOptions').innerHTML = '';
    document.getElementById('scoreDisplay').textContent = `Очки: ${score}`;
    document.getElementById('wordsDisplay').innerHTML = targetWords.map(w => `<div class="word-item">${w}</div>`).join('');
    timeLeft = 10;
    document.getElementById('memoryTimer').textContent = timeLeft;
    memoryTimer = setInterval(() => {
        timeLeft--;
        document.getElementById('memoryTimer').textContent = timeLeft;
        if (timeLeft <= 0) { clearInterval(memoryTimer); showWordOptions(); }
    }, 1000);
}

function showWordOptions() {
    document.getElementById('wordsDisplay').innerHTML = '<p style="color: var(--accent); font-weight: 600;">Время вышло! Выберите слова:</p>';
    const distractors = getDistractorWords(targetWords, 6);
    const allOptions = [...targetWords, ...distractors].sort(() => Math.random() - 0.5);
    document.getElementById('wordOptions').innerHTML = allOptions.map(w =>
        `<button class="word-option" onclick="toggleWord(this, '${w}')">${w}</button>`
    ).join('');
    document.getElementById('checkMemoryBtn').style.display = 'inline-block';
    document.getElementById('startMemoryBtn').style.display = 'none';
    timeLeft = 30;
    document.getElementById('memoryTimer').textContent = timeLeft;
    memoryTimer = setInterval(() => {
        timeLeft--;
        document.getElementById('memoryTimer').textContent = timeLeft;
        if (timeLeft <= 0) { clearInterval(memoryTimer); checkMemory(); }
    }, 1000);
}

function toggleWord(el, w) {
    if (selectedWords.includes(w)) {
        selectedWords = selectedWords.filter(x => x !== w);
        el.classList.remove('selected');
    } else {
        selectedWords.push(w);
        el.classList.add('selected');
    }
}

function checkMemory() {
    clearInterval(memoryTimer);
    const correct = targetWords.filter(w => selectedWords.includes(w)).length;
    const wrong = selectedWords.filter(w => !targetWords.includes(w)).length;
    const missed = targetWords.filter(w => !selectedWords.includes(w)).length;
    const points = correct * 5;
    score += points;
    document.querySelectorAll('.word-option').forEach(btn => {
        const w = btn.textContent;
        if (targetWords.includes(w) && selectedWords.includes(w)) btn.classList.add('correct');
        else if (!targetWords.includes(w) && selectedWords.includes(w)) btn.classList.add('wrong');
        btn.onclick = null;
    });
    document.getElementById('scoreDisplay').textContent = `Правильно: ${correct} (+${points}) | Ошибок: ${wrong} | Пропущено: ${missed} | Всего: ${score}`;
    if (correct === targetWords.length && wrong === 0) {
        if (currentLevel < 3) {
            document.getElementById('nextLevelBtn').style.display = 'inline-block';
        } else {
            showNotification(`Поздравляем! Итого: ${score} очков!`);
            document.getElementById('startMemoryBtn').style.display = 'inline-block';
            document.getElementById('startMemoryBtn').textContent = 'Играть снова';
        }
    } else {
        document.getElementById('startMemoryBtn').style.display = 'inline-block';
        document.getElementById('startMemoryBtn').textContent = 'Начать заново';
    }
    document.getElementById('checkMemoryBtn').style.display = 'none';
    document.getElementById('memoryTimer').textContent = '';
}

function nextLevel() {
    currentLevel++;
    updateLevelIndicator();
    startLevel();
}

// ===== ОБРАТНАЯ СВЯЗЬ =====
let currentRating = 0;
function setRating(r) {
    currentRating = r;
    document.querySelectorAll('.rating-star').forEach((s, i) => {
        s.classList.toggle('active', i < r);
    });
}

function submitFeedback(e) {
    e.preventDefault();
    const f = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        category: document.getElementById('category').value,
        rating: currentRating,
        message: document.getElementById('message').value,
        date: new Date().toISOString()
    };
    const arr = JSON.parse(localStorage.getItem('zoiFeedbacks') || '[]');
    arr.push(f);
    localStorage.setItem('zoiFeedbacks', JSON.stringify(arr));
    showNotification('Спасибо за обратную связь!');
    document.getElementById('feedbackForm').reset();
    setRating(0);
}

document.addEventListener('DOMContentLoaded', () => {
    initWaterTracker();
    updateLevelIndicator();
});
