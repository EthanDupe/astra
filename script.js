// --- FLUID SECTION ROUTING ---
function switchTab(tabId) {
  // Remove active class from all sections
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.remove('active');
  });
  
  // Add active class to target section
  const target = document.getElementById(tabId);
  if (target) {
    target.classList.add('active');
  }
}

// --- SMOOTH CURSOR (WITH GLASS TEXT SELECT) ---
const cursor = document.getElementById('cursor');
let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let curPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

document.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

function animateCursor() {
  const ease = 0.15;
  curPos.x += (mouse.x - curPos.x) * ease;
  curPos.y += (mouse.y - curPos.y) * ease;
  if (cursor) {
    cursor.style.left = `${curPos.x}px`;
    cursor.style.top = `${curPos.y}px`;
  }
  requestAnimationFrame(animateCursor);
}
animateCursor();

// Attach hover and glass text-select effects dynamically
document.addEventListener('mouseover', e => {
  if (!cursor) return;
  const textTarget = e.target.closest('input, textarea, [contenteditable="true"], .notif-selectable-text');
  const interactiveTarget = e.target.closest('a, button, .app-card, .game-btn');

  if (textTarget && !interactiveTarget) {
    cursor.classList.remove('hover');
    cursor.classList.add('text-select');
  } else if (interactiveTarget) {
    cursor.classList.remove('text-select');
    cursor.classList.add('hover');
  }
});

document.addEventListener('mouseout', e => {
  if (!cursor) return;
  if (e.target.closest('input, textarea, [contenteditable="true"], .notif-selectable-text')) {
    cursor.classList.remove('text-select');
  }
  if (e.target.closest('a, button, .app-card, .game-btn')) {
    cursor.classList.remove('hover');
  }
});

// --- STARFIELD BACKGROUND ---
const canvas = document.getElementById('bg-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let width, height, stars = [];

function initCanvas() {
  if (!canvas) return;
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  stars = Array.from({ length: Math.floor((width * height) / 5000) }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 1.5,
    speed: Math.random() * 0.4 + 0.1,
    opacity: Math.random()
  }));
}

function drawStars() {
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "white";
  stars.forEach(star => {
    ctx.globalAlpha = star.opacity;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
    star.y -= star.speed;
    if (star.y < -5) star.y = height + 5;
  });
  requestAnimationFrame(drawStars);
}

if (canvas) {
  window.addEventListener('resize', initCanvas);
  initCanvas();
  drawStars();
}

// --- APP OVERLAY LOGIC ---
function openApp(url) {
  const overlay = document.getElementById('appOverlay');
  document.getElementById('appFrame').src = url;
  overlay.classList.add('active');
  document.body.style.cursor = 'auto'; // Re-enable system cursor for iframe
  if (cursor) cursor.style.display = 'none';
}

function closeApp() {
  const overlay = document.getElementById('appOverlay');
  overlay.classList.remove('active');
  document.getElementById('appFrame').src = '';
  document.body.style.cursor = 'none';
  if (cursor) cursor.style.display = 'block';
}
