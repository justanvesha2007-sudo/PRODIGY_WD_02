/* =============================================
   CHRONO X 2050 — STOPWATCH LOGIC
   Prodigy Infotech | Intern Project
   ============================================= */

// ─── STATE ────────────────────────────────────
let startTime      = 0;   // timestamp when timer last started
let elapsedTime    = 0;   // total accumulated ms
let lapStartTime   = 0;   // elapsed ms at last lap start
let intervalId     = null;
let isRunning      = false;
let lapTimes       = [];  // array of lap durations in ms

// ─── DOM REFS ─────────────────────────────────
const hoursEl        = document.getElementById('hours');
const minutesEl      = document.getElementById('minutes');
const secondsEl      = document.getElementById('seconds');
const msEl           = document.getElementById('milliseconds');
const statusDot      = document.getElementById('statusDot');
const statusText     = document.getElementById('statusText');
const lapCountEl     = document.getElementById('lapCount');
const startPauseBtn  = document.getElementById('startPauseBtn');
const startPauseLabel= document.getElementById('startPauseLabel');
const resetBtn       = document.getElementById('resetBtn');
const lapBtn         = document.getElementById('lapBtn');
const lapsList       = document.getElementById('lapsList');
const noLaps         = document.getElementById('noLaps');
const clearLapsBtn   = document.getElementById('clearLapsBtn');
const progressBar    = document.getElementById('progressBar');
const iconPlay       = startPauseBtn.querySelector('.icon-play');
const iconPause      = startPauseBtn.querySelector('.icon-pause');
const separators     = document.querySelectorAll('.sep');

// Inject SVG gradient for progress bar
const svgDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
svgDefs.innerHTML = `
  <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%"   stop-color="#00f5ff"/>
    <stop offset="100%" stop-color="#a855f7"/>
  </linearGradient>`;
document.querySelector('.progress-ring').prepend(svgDefs);

// ─── HELPERS ──────────────────────────────────

/**
 * Format milliseconds into { h, m, s, ms } parts
 */
function parseTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  return {
    h:  Math.floor(totalSec / 3600),
    m:  Math.floor((totalSec % 3600) / 60),
    s:  totalSec % 60,
    ms: ms % 1000,
  };
}

function pad2(n) { return String(n).padStart(2, '0'); }
function pad3(n) { return String(n).padStart(3, '0'); }

/**
 * Format a total-ms value into "HH:MM:SS.mmm" string for lap display
 */
function formatLapTime(ms) {
  const { h, m, s, ms: millis } = parseTime(ms);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}<span class="lap-ms">.${pad3(millis)}</span>`;
}

// ─── DISPLAY UPDATE ───────────────────────────
function updateDisplay(ms) {
  const { h, m, s, ms: millis } = parseTime(ms);
  hoursEl.textContent   = pad2(h);
  minutesEl.textContent = pad2(m);
  secondsEl.textContent = pad2(s);
  msEl.textContent      = pad3(millis);

  // Progress bar: cycles every 60 seconds (within current minute)
  const progressWidth = ((ms % 60000) / 60000) * 200;
  progressBar.setAttribute('width', progressWidth.toFixed(2));
}

// ─── TICK ─────────────────────────────────────
function tick() {
  elapsedTime = Date.now() - startTime;
  updateDisplay(elapsedTime);
}

// ─── START / PAUSE ────────────────────────────
function startPause() {
  if (!isRunning) {
    // START
    startTime   = Date.now() - elapsedTime;
    intervalId  = setInterval(tick, 13); // ~75fps-ish
    isRunning   = true;

    // UI
    startPauseLabel.textContent = 'PAUSE';
    iconPlay.classList.add('hidden');
    iconPause.classList.remove('hidden');
    startPauseBtn.classList.add('running');
    lapBtn.disabled = false;

    statusDot.className  = 'status-dot running';
    statusText.textContent = 'RUNNING';
    statusText.className   = 'status-text running';

    // Stop separator blinking while running
    separators.forEach(s => s.classList.remove('static'));

  } else {
    // PAUSE
    clearInterval(intervalId);
    intervalId = null;
    isRunning  = false;

    // UI
    startPauseLabel.textContent = 'RESUME';
    iconPlay.classList.remove('hidden');
    iconPause.classList.add('hidden');
    startPauseBtn.classList.remove('running');
    lapBtn.disabled = true;

    statusDot.className  = 'status-dot paused';
    statusText.textContent = 'PAUSED';
    statusText.className   = 'status-text paused';

    separators.forEach(s => s.classList.add('static'));
  }
}

// ─── RESET ────────────────────────────────────
function reset() {
  clearInterval(intervalId);
  intervalId   = null;
  isRunning    = false;
  elapsedTime  = 0;
  lapStartTime = 0;
  lapTimes     = [];

  updateDisplay(0);

  // UI
  startPauseLabel.textContent = 'START';
  iconPlay.classList.remove('hidden');
  iconPause.classList.add('hidden');
  startPauseBtn.classList.remove('running');
  lapBtn.disabled = true;

  statusDot.className    = 'status-dot';
  statusText.textContent = 'STANDBY';
  statusText.className   = 'status-text';
  lapCountEl.textContent = 'LAP: 00';

  progressBar.setAttribute('width', 0);
  separators.forEach(s => s.classList.remove('static'));

  renderLaps();
}

// ─── LAP ──────────────────────────────────────
function recordLap() {
  if (!isRunning) return;

  const lapDuration = elapsedTime - lapStartTime;
  lapTimes.push(lapDuration);
  lapStartTime = elapsedTime;

  lapCountEl.textContent = `LAP: ${pad2(lapTimes.length)}`;
  renderLaps();
}

// ─── RENDER LAPS ──────────────────────────────
function renderLaps() {
  lapsList.innerHTML = '';

  if (lapTimes.length === 0) {
    lapsList.appendChild(noLaps);
    return;
  }

  const maxLap  = Math.max(...lapTimes);
  const minLap  = Math.min(...lapTimes);

  // Render newest first
  [...lapTimes].reverse().forEach((dur, revIdx) => {
    const idx      = lapTimes.length - revIdx;   // 1-based lap number
    const isBest   = dur === minLap && lapTimes.length > 1;
    const isWorst  = dur === maxLap && lapTimes.length > 1;
    const barPct   = (dur / maxLap) * 100;

    const item = document.createElement('div');
    item.className = `lap-item${isBest ? ' best' : isWorst ? ' worst' : ''}`;

    item.innerHTML = `
      <span class="lap-number">L${pad2(idx)}</span>
      <div class="lap-bar-wrap">
        <div class="lap-bar" style="width: ${barPct.toFixed(1)}%"></div>
      </div>
      <span class="lap-time">${formatLapTime(dur)}</span>
      ${isBest  ? '<span class="lap-badge best">BEST</span>'  : ''}
      ${isWorst ? '<span class="lap-badge worst">SLOW</span>' : ''}
      ${!isBest && !isWorst ? '<span style="width:36px"></span>' : ''}
    `;

    lapsList.appendChild(item);
  });
}

// ─── CLEAR LAPS ───────────────────────────────
function clearLaps() {
  lapTimes     = [];
  lapStartTime = isRunning ? elapsedTime : 0;
  lapCountEl.textContent = 'LAP: 00';
  renderLaps();
}

// ─── EVENT LISTENERS ──────────────────────────
startPauseBtn.addEventListener('click', startPause);
resetBtn.addEventListener('click', reset);
lapBtn.addEventListener('click', recordLap);
clearLapsBtn.addEventListener('click', clearLaps);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'Space':
      e.preventDefault();
      startPause();
      break;
    case 'KeyR':
      reset();
      break;
    case 'KeyL':
      if (!lapBtn.disabled) recordLap();
      break;
  }
});

// ─── INIT ─────────────────────────────────────
updateDisplay(0);
renderLaps();
