const canvas = document.querySelector('#mine');
const ctx = canvas.getContext('2d');

const scoreEl = document.querySelector('#score');
const timerEl = document.querySelector('#timer');
const progressEl = document.querySelector('#progress');
const dropBtn = document.querySelector('#dropBtn');
const pauseBtn = document.querySelector('#pauseBtn');
const bestScoreEl = document.querySelector('#bestScore');
const overlay = document.querySelector('#overlay');
const startBtn = document.querySelector('#startBtn');
const titleEl = document.querySelector('#overlay-title');
const copyEl = document.querySelector('#overlay-copy');
const toast = document.querySelector('#toast');
const soundBtn = document.querySelector('#soundBtn');
const feverBadge = document.querySelector('#feverBadge');
const targetEl = document.querySelector('#target');
const targetAmount = document.querySelector('#targetAmount');

const W = 780;
const H = 355;
let TARGET = 700;
let state = 'ready';
let pausedState = 'swing';
let score = 0;
let pendingMoney = 0;
let time = 60;
let angle = 0;
let angleDir = 1;
let rope = 0;
let hookX = W / 2;
let hookY = 38;
let caught = null;
let lastTime = 0;
let toastTimer = 0;
let audioOn = false;
let audio;
let elapsed = 0;
let feverTime = 0;
let nextFever = 12;
let bestScore = 0;

try {
    const savedTarget = Number(localStorage.getItem('goldRushTarget'));
    if (Number.isSafeInteger(savedTarget) && savedTarget > 0) {
        TARGET = savedTarget;
    }
} catch {}

function updateTargetDisplay() {
    targetEl.textContent = '$' + TARGET;
    targetAmount.value = String(TARGET);
    copyEl.innerHTML = `Thu thập đủ <b>$${TARGET}</b> trước khi hết giờ nhé!`;
    progressEl.style.width = Math.min(100, (score / TARGET) * 100) + '%';

    if (state === 'ready') {
        timerEl.innerHTML = timeForTarget(TARGET) + '<span>s</span>';
    }
}

function timeForTarget(target) {
    return Math.ceil(60 * Math.sqrt(target / 700));
}

const extraRockSpots = [
    [75, 230, 13], [130, 330, 15], [245, 190, 13], [320, 300, 14],
    [445, 215, 13], [505, 340, 14], [635, 180, 13], [745, 325, 15],
    [175, 280, 12], [390, 190, 12], [565, 230, 13], [700, 275, 12]
];

const items = [
    { x: 95, y: 265, r: 19, type: 'gold', value: 250, weight: 2.05 },
    { x: 192, y: 305, r: 14, type: 'gold', value: 100, weight: 1.3 },
    { x: 300, y: 245, r: 17, type: 'gold', value: 200, weight: 1.7 },
    { x: 410, y: 290, r: 19, type: 'gold', value: 250, weight: 2.05 },
    { x: 518, y: 250, r: 16, type: 'gold', value: 150, weight: 1.5 },
    { x: 674, y: 300, r: 21, type: 'gold', value: 300, weight: 2.3 },
    { x: 151, y: 200, r: 15, type: 'rock', value: 20, weight: 2.2 },
    { x: 362, y: 328, r: 17, type: 'rock', value: 25, weight: 2.4 },
    { x: 590, y: 195, r: 14, type: 'rock', value: 15, weight: 2.1 },
    { x: 256, y: 335, r: 26, type: 'diamond', value: 500, weight: 3.2 },
    { x: 625, y: 265, r: 26, type: 'diamond', value: 500, weight: 3.2 },
    { x: 220, y: 255, r: 22, type: 'ruby', value: 350, weight: 2.55 },
    { x: 470, y: 325, r: 23, type: 'emerald', value: 400, weight: 2.8 },
    { x: 552, y: 320, r: 21, type: 'sapphire', value: 300, weight: 2.3 },
    { x: 720, y: 225, r: 24, type: 'amethyst', value: 450, weight: 3.0 }
];

function setRockCountForTarget() {
    const desired = Math.min(
        extraRockSpots.length,
        Math.max(0, Math.ceil(Math.sqrt(TARGET / 700)) - 1)
    );

    items.splice(0, items.length, ...items.filter(item => !item.scaledRock));

    for (let i = 0; i < desired; i++) {
        const [x, y, r] = extraRockSpots[i];
        items.push({
            x,
            y,
            r,
            type: 'rock',
            value: 10 + (i % 3) * 5,
            weight: 2.1 + (i % 3) * 0.1,
            scaledRock: true
        });
    }
}

try {
    bestScore = Math.max(0, Number(localStorage.getItem('goldRushBestScore')) || 0);
} catch {}

bestScoreEl.textContent = '$' + String(bestScore).padStart(4, '0');
updateTargetDisplay();
setRockCountForTarget();

function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
}

window.addEventListener('resize', resize);
resize();

function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, r);
        return;
    }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function draw() {
    const background = ctx.createLinearGradient(0, 0, 0, H);
    background.addColorStop(0, '#796044');
    background.addColorStop(0.48, '#62472e');
    background.addColorStop(1, '#3b3029');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(390, 30, 8, 390, 70, 380);
    glow.addColorStop(0, '#ffcb6630');
    glow.addColorStop(1, '#ffcb6600');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#332b29';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 60);
    ctx.quadraticCurveTo(75, 40, 145, 57);
    ctx.quadraticCurveTo(240, 72, 326, 46);
    ctx.quadraticCurveTo(435, 21, 522, 49);
    ctx.quadraticCurveTo(675, 75, 780, 45);
    ctx.lineTo(780, 0);
    ctx.fill();

    ctx.fillStyle = '#45362b';
    ctx.beginPath();
    ctx.moveTo(0, 350);
    ctx.lineTo(0, 325);
    ctx.quadraticCurveTo(85, 310, 160, 330);
    ctx.quadraticCurveTo(240, 350, 330, 327);
    ctx.quadraticCurveTo(420, 308, 505, 333);
    ctx.quadraticCurveTo(630, 350, 780, 317);
    ctx.lineTo(780, 355);
    ctx.fill();

    for (let i = 0; i < 14; i++) {
        const x = (i * 83 + 29) % 780;
        const y = (i * 47 + 87) % 340;
        ctx.fillStyle = i % 2 ? '#c59b6240' : '#302e2c55';
        ctx.beginPath();
        ctx.ellipse(x, y, 3 + (i % 4), 2 + (i % 3), 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.strokeStyle = '#32271f';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(64, 49);
    ctx.lineTo(64, 112);
    ctx.moveTo(716, 48);
    ctx.lineTo(716, 114);
    ctx.stroke();
    ctx.strokeStyle = '#8e6139';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(55, 52);
    ctx.lineTo(64, 52);
    ctx.lineTo(64, 109);
    ctx.moveTo(707, 51);
    ctx.lineTo(716, 51);
    ctx.lineTo(716, 109);
    ctx.stroke();

    items.forEach(item => {
        if (!item.taken) drawItem(item);
    });

    ctx.fillStyle = '#283347';
    roundedRect(363, 10, 54, 27, 7);
    ctx.fill();
    ctx.strokeStyle = '#d5a44d';
    ctx.lineWidth = 2;
    roundedRect(363, 10, 54, 27, 7);
    ctx.stroke();
    ctx.fillStyle = '#ffce62';
    ctx.beginPath();
    ctx.arc(390, 23, 5, 0, Math.PI * 2);
    ctx.fill();

    drawMiner();

    ctx.save();
    ctx.translate(390, 26);
    ctx.rotate(angle);
    const length = state === 'down' || state === 'return' ? rope : 11;
    ctx.strokeStyle = '#d1c4a8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, length);
    ctx.stroke();
    ctx.translate(0, length);
    ctx.strokeStyle = '#cdd0d0';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.quadraticCurveTo(-8, 12, 0, 13);
    ctx.quadraticCurveTo(8, 12, 7, 4);
    ctx.stroke();
    ctx.restore();

    if (caught) {
        ctx.save();
        ctx.translate(hookX - Math.sin(angle) * 20, hookY + Math.cos(angle) * 20);
        drawItem({ ...caught, x: 0, y: 0 }, true);
        ctx.restore();
    }

    for (let i = 0; i < 4; i++) {
        const x = 115 + i * 177;
        const y = 90 + (i % 2) * 34;
        ctx.fillStyle = '#ffd97877';
        ctx.font = '12px serif';
        ctx.fillText('✦', x, y);
    }
}

function drawMiner() {
    const pulling = state === 'return' && caught;
    const effort = pulling ? Math.sin(performance.now() / 95) * 2 : 0;
    ctx.save();
    ctx.translate(320, 51 + effort * 0.25);
    ctx.lineCap = 'round';

    ctx.strokeStyle = '#503923';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-36, 65);
    ctx.lineTo(39, 65);
    ctx.stroke();
    ctx.strokeStyle = '#bc8242';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-36, 62);
    ctx.lineTo(39, 62);
    ctx.stroke();

    ctx.strokeStyle = '#29354a';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-5, 39);
    ctx.lineTo(-10, 58);
    ctx.lineTo(-17, 60);
    ctx.moveTo(4, 39);
    ctx.lineTo(10, 57);
    ctx.lineTo(17, 59);
    ctx.stroke();

    ctx.fillStyle = '#397c70';
    ctx.beginPath();
    ctx.moveTo(-8, 13);
    ctx.quadraticCurveTo(0, 8, 8, 13);
    ctx.lineTo(12, 42);
    ctx.lineTo(-12, 42);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d2a04c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 15);
    ctx.lineTo(0, 40);
    ctx.stroke();

    ctx.strokeStyle = '#d2a078';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(5, 17);
    ctx.lineTo(19, 8 + effort);
    ctx.lineTo(39, -18 + effort);
    ctx.moveTo(-5, 18);
    ctx.lineTo(8, 27);
    ctx.lineTo(26, 9 + effort);
    ctx.stroke();
    ctx.strokeStyle = '#b88546';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(38, -20 + effort);
    ctx.lineTo(46, -27 + effort);
    ctx.stroke();

    ctx.fillStyle = '#e7b78d';
    ctx.beginPath();
    ctx.arc(0, 1, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0b83e';
    ctx.beginPath();
    ctx.arc(0, -2, 11, Math.PI, Math.PI * 2);
    ctx.lineTo(12, 1);
    ctx.quadraticCurveTo(0, 5, -12, 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff0a5';
    ctx.beginPath();
    ctx.arc(0, -4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawItem(item) {
    ctx.save();
    ctx.translate(item.x, item.y);

    if (item.type === 'gold') {
        const gradient = ctx.createRadialGradient(
            -item.r * 0.35, -item.r * 0.4, 2, 0, 0, item.r * 1.2
        );
        gradient.addColorStop(0, '#fff3a5');
        gradient.addColorStop(0.4, '#ffc83f');
        gradient.addColorStop(1, '#b66a18');
        ctx.fillStyle = gradient;
        ctx.strokeStyle = '#ffe68a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, item.r * 1.25, item.r * 0.82, -0.24, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff1a7';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.ellipse(-item.r * 0.3, -item.r * 0.17, item.r * 0.23, item.r * 0.1, -0.35, 0, Math.PI * 2);
        ctx.fill();
    } else if (['diamond', 'ruby', 'emerald', 'sapphire', 'amethyst'].includes(item.type)) {
        const colors = {
            diamond: ['#5fe7ed', '#d7ffff', '#54e7ff'],
            ruby: ['#fa4567', '#ffd0d8', '#ff3159'],
            emerald: ['#42d889', '#c4ffe0', '#28e884'],
            sapphire: ['#508cff', '#d4e5ff', '#397bff'],
            amethyst: ['#b66cff', '#eed8ff', '#ad55ff']
        };
        const [fill, stroke, glow] = colors[item.type];
        ctx.shadowColor = glow;
        ctx.shadowBlur = 14;
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -item.r * 1.3);
        ctx.lineTo(item.r, 0);
        ctx.lineTo(0, item.r * 1.3);
        ctx.lineTo(-item.r, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffffaa';
        ctx.beginPath();
        ctx.moveTo(0, -item.r);
        ctx.lineTo(0, item.r);
        ctx.moveTo(-item.r * 0.7, 0);
        ctx.lineTo(item.r * 0.7, 0);
        ctx.stroke();
    } else {
        ctx.fillStyle = '#777571';
        ctx.strokeStyle = '#a7a49a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-item.r, -item.r * 0.4);
        ctx.lineTo(-item.r * 0.5, -item.r);
        ctx.lineTo(item.r * 0.5, -item.r * 0.8);
        ctx.lineTo(item.r, item.r * 0.1);
        ctx.lineTo(item.r * 0.45, item.r * 0.8);
        ctx.lineTo(-item.r * 0.7, item.r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#99968b';
        ctx.beginPath();
        ctx.arc(-item.r * 0.2, -item.r * 0.3, item.r * 0.22, 0, 7);
        ctx.fill();
    }

    ctx.restore();
}

function begin() {
    score = pendingMoney;
    pendingMoney = 0;
    time = timeForTarget(TARGET);
    elapsed = 0;
    feverTime = 0;
    nextFever = 12;
    feverBadge.hidden = true;
    state = 'swing';
    caught = null;
    items.forEach(item => { item.taken = false; });
    scoreEl.textContent = '$' + String(score).padStart(4, '0');
    progressEl.style.width = Math.min(100, (score / TARGET) * 100) + '%';
    timerEl.innerHTML = Math.ceil(time) + '<span>s</span>';
    overlay.classList.add('hidden');
    dropBtn.disabled = false;
    pauseBtn.disabled = false;
    pauseBtn.textContent = 'Ⅱ';
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function pauseGame() {
    if (!['swing', 'down', 'return'].includes(state)) return;
    pausedState = state;
    state = 'paused';
    titleEl.textContent = 'TẠM DỪNG';
    copyEl.textContent = 'Mỏ vàng đang chờ bạn. Tiếp tục khi đã sẵn sàng.';
    startBtn.textContent = 'TIẾP TỤC';
    overlay.classList.remove('hidden');
    dropBtn.disabled = true;
    pauseBtn.disabled = true;
}

function resumeGame() {
    if (state !== 'paused') return;
    state = pausedState;
    overlay.classList.add('hidden');
    dropBtn.disabled = false;
    pauseBtn.disabled = false;
    pauseBtn.textContent = 'Ⅱ';
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function loop(now) {
    if (state === 'ready' || state === 'over' || state === 'paused') return;

    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    elapsed += dt;

    if (feverTime > 0) feverTime = Math.max(0, feverTime - dt);
    if (feverTime === 0 && elapsed >= nextFever) {
        feverTime = 5;
        nextFever += 18;
        showToast('CƠN SỐT VÀNG! VÀNG X2 TRONG 5 GIÂY');
        beep(760);
    }

    feverBadge.hidden = feverTime <= 0;
    if (feverTime > 0) feverBadge.textContent = `VÀNG X2 · ${Math.ceil(feverTime)}s`;

    if (state !== 'down' && state !== 'return') {
        angle += angleDir * dt * 0.72;
        if (angle > 0.82 || angle < -0.82) angleDir *= -1;
        hookX = 390 - Math.sin(angle) * 11;
        hookY = 26 + Math.cos(angle) * 11;
    }

    if (state === 'down') {
        rope += dt * 255;
        hookX = 390 - Math.sin(angle) * rope;
        hookY = 26 + Math.cos(angle) * rope;
        const hit = items.find(item =>
            !item.taken && Math.hypot(item.x - hookX, item.y - hookY) < item.r * 1.15 + 12
        );

        if (hit) {
            hit.taken = true;
            caught = { ...hit, multiplier: feverTime > 0 ? 2 : 1 };
            state = 'return';
            const prize = hit.value * caught.multiplier;
            const message = hit.type === 'rock'
                ? `Đá có mạch vàng · +$${prize}`
                : `+ $${prize}${caught.multiplier === 2 ? ' · X2' : ''}`;
            showToast(message);
            beep(hit.type === 'rock' ? 170 : 600);
        } else if (hookY + Math.cos(angle) * 13 > H - 4) {
            state = 'return';
        }
    }

    if (state === 'return') {
        const returnSpeed = caught ? 185 / caught.weight : 250;
        rope = Math.max(0, rope - dt * returnSpeed);
        hookX = 390 - Math.sin(angle) * rope;
        hookY = 26 + Math.cos(angle) * rope;

        if (rope <= 0) {
            if (caught) {
                score += caught.value * (caught.multiplier || 1);
                caught = null;
                scoreEl.textContent = '$' + String(score).padStart(4, '0');
                progressEl.style.width = Math.min(100, (score / TARGET) * 100) + '%';
                if (score >= TARGET) {
                    finish(true);
                    return;
                }
            }
            state = 'swing';
        }
    }

    time -= dt;
    if (time <= 0) {
        time = 0;
        finish(score >= TARGET);
        return;
    }

    timerEl.innerHTML = Math.ceil(time) + '<span>s</span>';
    draw();
    requestAnimationFrame(loop);
}

function drop() {
    if (state !== 'swing') return;
    state = 'down';
    rope = 0;
    beep(340);
}

function finish(win) {
    state = 'over';
    feverBadge.hidden = true;
    dropBtn.disabled = true;
    pauseBtn.disabled = true;

    if (score > bestScore) {
        bestScore = score;
        bestScoreEl.textContent = '$' + String(bestScore).padStart(4, '0');
        try {
            localStorage.setItem('goldRushBestScore', String(bestScore));
        } catch {}
    }

    titleEl.textContent = win ? 'KHO BÁU THUỘC VỀ BẠN!' : 'HẾT GIỜ!';
    copyEl.innerHTML = win
        ? `Tuyệt lắm! Bạn đào được <b>$${score}</b>.`
        : `Bạn đào được <b>$${score}</b>. Cố thêm lần nữa nhé!`;
    startBtn.innerHTML = 'CHƠI LẠI <span>↻</span>';
    overlay.classList.remove('hidden');
    if (win) beep(800);
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 950);
}

function beep(frequency) {
    if (!audioOn) return;

    try {
        audio ??= new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        gain.gain.value = 0.055;
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.12);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start();
        oscillator.stop(audio.currentTime + 0.12);
    } catch {}
}

document.querySelector('#targetForm').addEventListener('submit', event => {
    event.preventDefault();
    const amount = Number(targetAmount.value);

    if (!Number.isSafeInteger(amount) || amount < 1) {
        showToast('Mục tiêu phải là số nguyên dương hợp lệ');
        return;
    }

    const previousDuration = timeForTarget(TARGET);
    TARGET = amount;
    setRockCountForTarget();

    try {
        localStorage.setItem('goldRushTarget', String(TARGET));
    } catch {}

    updateTargetDisplay();
    if (['swing', 'down', 'return', 'paused'].includes(state)) {
        time = Math.max(0, time + timeForTarget(TARGET) - previousDuration);
        timerEl.innerHTML = Math.ceil(time) + '<span>s</span>';
    }

    const rockCount = items.filter(item => item.type === 'rock').length;
    showToast(`Mục tiêu $${TARGET} · ${timeForTarget(TARGET)} giây · ${rockCount} tảng đá`);
    if (['swing', 'down', 'return', 'paused'].includes(state) && score >= TARGET) finish(true);
});

startBtn.addEventListener('click', () => {
    if (state === 'paused') resumeGame();
    else begin();
});
dropBtn.addEventListener('click', drop);
pauseBtn.addEventListener('click', pauseGame);
canvas.addEventListener('pointerdown', () => {
    if (state === 'swing') drop();
});

soundBtn.addEventListener('click', () => {
    audioOn = !audioOn;
    soundBtn.classList.toggle('muted', !audioOn);
    soundBtn.setAttribute('aria-label', audioOn ? 'Tắt âm thanh' : 'Bật âm thanh');
    if (audioOn) beep(520);
});

document.addEventListener('keydown', event => {
    if (event.repeat) return;

    if (event.code === 'KeyP') {
        event.preventDefault();
        if (state === 'paused') resumeGame();
        else pauseGame();
    }

    if (event.code === 'Space') {
        event.preventDefault();
        if (state === 'ready' || state === 'over') begin();
        else if (state === 'paused') resumeGame();
        else drop();
    }
});
