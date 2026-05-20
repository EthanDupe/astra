// --- FLUID SECTION ROUTING ---
function switchTab(tabId) {
  // Remove active class from all sections
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.remove('active');
  });
  
  // Add active class to target section
  const target = document.getElementById(tabId);
  if(target) {
    target.classList.add('active');
  }
}

// --- SMOOTH CURSOR ---
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
  cursor.style.left = `${curPos.x}px`;
  cursor.style.top = `${curPos.y}px`;
  requestAnimationFrame(animateCursor);
}
animateCursor();

// Attach hover effects dynamically
document.addEventListener('mouseover', e => {
  if(e.target.closest('a, button, .app-card, .game-btn')) {
    cursor.classList.add('hover');
  }
});
document.addEventListener('mouseout', e => {
  if(e.target.closest('a, button, .app-card, .game-btn')) {
    cursor.classList.remove('hover');
  }
});

// --- STARFIELD BACKGROUND ---
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let width, height, stars = [];

function initCanvas() {
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

window.addEventListener('resize', initCanvas);
initCanvas();
drawStars();

// --- APP OVERLAY LOGIC ---
function openApp(url) {
  const overlay = document.getElementById('appOverlay');
  document.getElementById('appFrame').src = url;
  overlay.classList.add('active');
  document.body.style.cursor = 'auto'; // Re-enable system cursor for iframe
  cursor.style.display = 'none';
}

function closeApp() {
  const overlay = document.getElementById('appOverlay');
  overlay.classList.remove('active');
  document.getElementById('appFrame').src = '';
  document.body.style.cursor = 'none';
  cursor.style.display = 'block';
}
