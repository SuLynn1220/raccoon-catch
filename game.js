const H = 800;
let W;

const $canvas = $('#game');
const canvas = $canvas[0];
const ctx = canvas.getContext('2d');
const racconImg = new Image();
racconImg.src = 'image/raccon.png';

const player = {
    x: 0,
    y: H - 100,
    size: 160,
    speed: 600
}

const keys = {};

const ITEM_TYPES = [
    { name: '姊姊',   emoji: '📁', score: 50,  weight: 1, phrases: ['姊姊口頭禪 1', '姊姊口頭禪 2', '姊姊口頭禪 3'] },
    { name: '瑞鍾',   emoji: '🏸', score: 30,  weight: 2, phrases: ['瑞鍾口頭禪 1', '瑞鍾口頭禪 2', '瑞鍾口頭禪 3'] },
    { name: '世聰',   emoji: '🏀', score: 20,  weight: 3, phrases: ['世聰口頭禪 1', '世聰口頭禪 2', '世聰口頭禪 3'] },
    { name: '系主任', emoji: '💾', score: 10,  weight: 4, phrases: ['這我不知道去找姐姐', '怎麼了 在把妹嗎', '系主任口頭禪 3'] },
    { name: '東華',   emoji: '🍎', score: -15, weight: 2, phrases: ['不要選我 我會把你當掉', '東華口頭禪 2', '東華口頭禪 3'] },
    { name: '佳衛',   emoji: '🎈', score: 0,   weight: 2, damage: 1, phrases: ['怎麼還沒寫出來', '來領一個 Project'] }
];

const ITEM_SIZE = 60;       // 掉落物大小
const items = [];           // 場上有的掉落物

// 掉落物產出間隔
const SPAWN_START = 2.0;
const SPAWN_END = 1.0;

// 掉落物下降速度
const SPEED_START = 0.8;
const SPEED_END = 1.4;

const REF_W = 800;
let spawnTimer = 0;
let lastTime = 0;
let score = 0;
const MISS_PENALTY = -20;

// 遊戲時間
const GAME_TIME = 60;
let timeLeft = GAME_TIME;

// 血量
const MAX_LIVES = 3;
let lives = MAX_LIVES;

// 資訊欄高度
const HUD_H = 90;

// 口頭禪
const PHRASE_TIME = 2.5;
let phrase = null;

// 遊戲狀態
let gameState = 'playing';
let endReason = '';

// 遊戲進度
function getProgress() {
    return 1 - timeLeft / GAME_TIME;
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

// 依照權重隨機選取掉落物
function pickType() {
    let total = 0;
    for (const t of ITEM_TYPES) total += t.weight;


    let r = Math.random() * total;
    for (const t of ITEM_TYPES) {
        if (r < t.weight) return t;
        r -= t.weight;
    }

    return ITEM_TYPES[ITEM_TYPES.length - 1];
}

// 創建該掉落物對應物件
function spawnItem() {
    const half = ITEM_SIZE / 2;
    items.push({
        type: pickType(),
        x: half + Math.random() * (W - ITEM_SIZE),
        y: -half,
        speed: (200 + Math.random() * 60) * lerp(SPEED_START, SPEED_END, getProgress())
    });
}

// 判斷是否接到
function isCatch(item) {
    const half = ITEM_SIZE / 2;

    const boxLeft = player.x - player.size * 0.4;
    const boxRight = player.x + player.size * 0.4;
    const boxTop = player.y - player.size * 0.55;
    const boxBottom = player.y;

    return item.x + half > boxLeft && item.x - half < boxRight && item.y + half > boxTop && item.y - half < boxBottom;
}

// 接到後的處理 → 加扣分(血)、口頭禪
function catchItem(item) {
    // 加分
    score += item.type.score;

    // 扣咖啡
    if (item.type.damage) lives -= item.type.damage;

    // 隨機選取該人物口頭禪
    const list = item.type.phrases;
    const text = list[Math.floor(Math.random() * list.length)];
    phrase = {
        text: item.type.name + ': ' + text,
        timer: PHRASE_TIME
    };
}

// 更新所有物件
function update(dt) {
    if (gameState !== 'playing') return;
    
    // 移動浣熊
    let dir = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) dir--;
    if (keys['ArrowRight'] || keys['KeyD']) dir++;
    
    player.x += dir * player.speed * dt;

    // 防止浣熊超出畫面
    const half = player.size / 2;
    player.x = Math.max(player.x, half);
    player.x = Math.min(player.x, W - half);
    
    // 產生掉落物
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
        spawnItem();
        const interval = lerp(SPAWN_START, SPAWN_END, getProgress());
        spawnTimer = interval / (W / REF_W); 
    }

    // 每個掉落物持續墜落
    for (const item of items) {
        item.y += item.speed * dt;
    }

    // 有無接到該掉落物
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        
        if (isCatch(item)) {
            catchItem(item);
            items.splice(i, 1);
        } else if (item.y - ITEM_SIZE / 2 > H) {
            if (item.type.score > 0) score += MISS_PENALTY;
            items.splice(i, 1);
        }
    }
    
    // 遊戲倒計時
    timeLeft = Math.max(0, timeLeft - dt);
    
    // 口頭禪持續時間
    if (phrase) {
        phrase.timer -= dt;
        if (phrase.timer <= 0) phrase = null;
    }

    if (lives <= 0) gameOver('咖啡喝完了');
    else if (timeLeft <= 0) gameOver('時間到了');
}

// 根據視窗大小變更所有尺寸
function resize() {
    const winW = $(window).width();
    const winH = $(window).height();
    
    const scale = winH / H;
    W = winW / scale;

    $canvas.css({
        width: winW + 'px',
        height: winH + 'px'
    });
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = winW * dpr;
    canvas.height = winH * dpr;

    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
}

// 繪製掉落物及浣熊 (會移動的東西)
function draw() {
    // 掉落物
    ctx.fillStyle = '#f7f5ec';
    ctx.fillRect(0, 0, W, H);
    
    ctx.font = ITEM_SIZE + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (const item of items) {
        ctx.fillText(item.type.emoji, item.x, item.y);
    }
    
    // 浣熊
    const w = player.size;
    const h = player.size * racconImg.height / racconImg.width;

    ctx.drawImage(racconImg, player.x - w / 2, player.y - h / 2, w, h);
}

// 繪製遊戲結束畫面
function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, W, H);
    
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText(endReason, W / 2, H / 2 - 80);

    ctx.font = 'bold 40px sans-serif';
    ctx.fillText('分數：' + score, W / 2, H / 2);
    
    ctx.font = '26px sans-serif';
    ctx.fillText('按空白鍵再玩一次', W / 2, H / 2 + 80);
}

// 繪製上方資訊欄 (固定的東西)
function drawHUD() {
    const midY = HUD_H / 2;
    
    // 框出上方區域
    ctx.fillStyle = '#fffdf6';
    ctx.fillRect(0, 0, W, HUD_H);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, HUD_H);
    ctx.lineTo(W, HUD_H);
    ctx.stroke();
    
    ctx.textBaseline = 'middle';
    
    // 咖啡
    ctx.fillStyle = '#333';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('咖啡續命', 24, midY);
    
    ctx.font = '36px sans-serif';
    for (let i = 0; i < MAX_LIVES; i++) {
        ctx.globalAlpha = i < lives ? 1 : 0.2;
        ctx.fillText('☕', 130 + i * 46, midY);
    }
    ctx.globalAlpha = 1;

    // 口頭禪
    const barW = Math.min(W * 0.45, 640);
    
    ctx.textAlign = 'center';
    if (phrase) {
        ctx.fillStyle = '#333';
        ctx.font = '26px sans-serif';
        ctx.fillText(phrase.text, W / 2, midY, barW - 24);
    } else {
        ctx.fillStyle = '#bbb';
        ctx.font = '22px sans-serif';
        ctx.fillText('口頭禪', W / 2, midY);
    }

    // 分數
    const boxW = 180;
    const boxX = W - boxW - 24;
    
    ctx.fillStyle = '#333';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCORE ' + score, boxX + boxW / 2, midY);
    
    // 倒數計時
    ctx.fillStyle = timeLeft <= 10 ? '#d33' : '#333';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('⏱ ' + Math.ceil(timeLeft), boxX - 20, midY);
    
    // 遊戲結束畫面
    if (gameState === 'over') drawGameOver();
}

// 遊戲結束 → 更改狀態
function gameOver(reason) {
    gameState = 'over';
    endReason = reason;
}

// 重新開始 → 回到初始狀態
function resetGame() {
    items.length = 0;
    score = 0;
    lives = MAX_LIVES;
    timeLeft = GAME_TIME;
    phrase = null;
    spawnTimer = 0;
    player.x = W / 2;
    gameState = 'playing';
}

// 改變視窗大小時重設尺寸
$(window).on('resize', function() {
    resize();
});

// 按下按鍵
$(document).on('keydown', function(e) {
    keys[e.code] = true;

    // 空白鍵 → 重啟遊戲
    if (e.code === 'Space' && gameState === 'over') resetGame();
});

// 放開按鍵
$(document).on('keyup', function(e) {
    keys[e.code] = false;
});

// 切視窗 (讓浣熊停止走動)
$(window).on('blur', function() {
    for (const k in keys) keys[k] = false;
});

// main loop
function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    update(dt);
    draw();
    drawHUD();

    requestAnimationFrame(loop);
}

// document ready
$(function() {
    resize();
    player.x = W / 2;
    lastTime = performance.now();
    requestAnimationFrame(loop);
});
