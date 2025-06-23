// script.js
(function() {
    // DOM Elements
    const inpCols      = document.getElementById('inpCols');
    const inpRows      = document.getElementById('inpRows');
    const inpSides     = document.getElementById('inpSides');
    const labelCols    = document.getElementById('labelCols');
    const labelRows    = document.getElementById('labelRows');
    const labelSides   = document.getElementById('labelSides');
    const btnToggle    = document.getElementById('btnToggle');
    const soundIcon = document.getElementById('soundIcon');
    const canvas       = document.getElementById('canvas');
    const ctx          = canvas.getContext('2d');
    const info         = document.getElementById('info');

    const btnInfo      = document.getElementById('btnInfo');
    const infoModal    = document.getElementById('infoModal');
    const btnModalClose= document.getElementById('btnModalClose');

    // Audio setup: three capture sounds
    const soundFiles = ['sound1.mp3', 'sound2.mp3', 'sound3.mp3'];
    const sounds = soundFiles.map(src => {
      const a = new Audio(src);
      a.volume = 0.5;
      return a;
    });
    let soundEnabled = true;

    // Simulation state
    let rafId = null;
    let isRunning = false;
    let dirty = false;
    let appliedCols, appliedRows, appliedSides;

    let gridCols, gridRows, sidesCount, cellSize, grid, balls, counts;
    const BALL_SPEED = 3;
    const SUB_STEPS = 5;
const stylishPalette = [
  { bg: '#1e1e1e', ball: '#ffe066' },     // Угольно-чёрный фон / жёлтый шарик
  { bg: '#0e7490', ball: '#fcd34d' },     // Тёмно-бирюзовый / тёпло-жёлтый
  { bg: '#ef4444', ball: '#ffffff' },     // Ярко-красный / белый
  { bg: '#7c3aed', ball: '#60f4f4' },     // Фиолетовый / бирюзовый
  { bg: '#065f46', ball: '#fef3c7' },     // Тёмно-зелёный / кремовый
  { bg: '#3b82f6', ball: '#ffadad' },     // Ярко-синий / розовый
  { bg: '#f59e0b', ball: '#1f2937' },     // Оранжевый / тёмно-серый шарик (вписан в инверсную схему)
  { bg: '#9333ea', ball: '#f9fafb' }      // Тёмный пурпур / почти-белый
];

btnInfo.addEventListener('click', () => {
  infoModal.classList.add('active');
});
btnModalClose.addEventListener('click', () => {
  infoModal.classList.remove('active');
});
// закрытие кликом вне содержимого
infoModal.addEventListener('click', e => {
  if (e.target === infoModal) {
    infoModal.classList.remove('active');
  }
});

    // Update labels & dirty flag on slider move
    function onSliderInput() {
      labelCols.textContent  = inpCols.value;
      labelRows.textContent  = inpRows.value;
      labelSides.textContent = inpSides.value;
      if (isRunning) {
        dirty = (+inpCols.value !== appliedCols) ||
                (+inpRows.value !== appliedRows) ||
                (+inpSides.value !== appliedSides);
        updateButtonLabel();
      }
    }
    inpCols.oninput   = onSliderInput;
    inpRows.oninput   = onSliderInput;
    inpSides.oninput  = onSliderInput;

    // Update Start/Stop/Restart button text
    function updateButtonLabel() {
      if (!isRunning) {
        btnToggle.textContent = 'Start';
      } else {
        btnToggle.textContent = dirty ? 'Restart' : 'Stop';
      }
    }

    // Toggle sound on/off
    btnSoundToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  if (soundEnabled) {
    soundIcon.src = 'volume-up-fill.svg';
    soundIcon.alt = 'Sound on';
  } else {
    soundIcon.src = 'volume-mute-fill.svg';
    soundIcon.alt = 'Sound off';
  }
});

    // Initialize grid, counts, balls
    function init() {
      gridCols   = appliedCols;
      gridRows   = appliedRows;
      sidesCount = appliedSides;
      cellSize   = canvas.width / gridCols;

      grid = Array.from({ length: gridRows }, () => Array(gridCols).fill(0));
      const cx = gridCols / 2, cy = gridRows / 2, angleStep = 2 * Math.PI / sidesCount;
      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          let a = Math.atan2(-(r + 0.5 - cy) / cy, (c + 0.5 - cx) / cx);
          if (a < 0) a += 2 * Math.PI;
          grid[r][c] = Math.floor(a / angleStep);
        }
      }

      counts = Array(sidesCount).fill(0);
      grid.flat().forEach(s => counts[s]++);

      balls = [];
      const centerX = canvas.width / 2, centerY = canvas.height / 2;
      const rX = canvas.width / 4, rY = canvas.height / 4;
      for (let i = 0; i < sidesCount; i++) {
        const ang = (i + 0.5) * angleStep;
        let dx = (Math.cos(ang) < 0 ? -1 : 1) * (Math.random() * 0.7 + 0.3);
        let dy = (Math.sin(ang) < 0 ? -1 : 1) * (Math.random() * 0.7 + 0.3);
        const m = Math.hypot(dx, dy);
        balls.push({
          side: i,
          color: stylishPalette[i % stylishPalette.length].ball,
          x: centerX + Math.cos(ang) * rX,
          y: centerY - Math.sin(ang) * rY,
          vx: dx / m * BALL_SPEED,
          vy: dy / m * BALL_SPEED
        });
      }
    }

    // Draw colored sectors
    function drawGrid() {
      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          ctx.fillStyle = stylishPalette[grid[r][c] % stylishPalette.length].bg;
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }
    }

    // Capture logic with sound
    function capture(r, c, side) {
      if (r < 0 || r >= gridRows || c < 0 || c >= gridCols) return;
      const prev = grid[r][c];
      if (prev !== side) {
        grid[r][c] = side;
        counts[prev]--;
        counts[side]++;

        // Play random capture sound
        if (soundEnabled) {
          const s = sounds[Math.floor(Math.random() * sounds.length)];
          s.currentTime = 0;
          s.play();
        }
      }
    }

    // Update ball position and handle collisions
    function updateBall(b) {
      const sx = b.vx / SUB_STEPS, sy = b.vy / SUB_STEPS;
      for (let i = 0; i < SUB_STEPS; i++) {
        const pc = Math.floor(b.x / cellSize), pr = Math.floor(b.y / cellSize);
        b.x += sx; b.y += sy;
        if (b.x < 0 || b.x > canvas.width)  { b.vx = -b.vx; b.x = Math.min(Math.max(b.x,0),canvas.width); }
        if (b.y < 0 || b.y > canvas.height) { b.vy = -b.vy; b.y = Math.min(Math.max(b.y,0),canvas.height); }
        const nc = Math.floor(b.x / cellSize), nr = Math.floor(b.y / cellSize);
        if (nc !== pc || nr !== pr) {
          if (nr >= 0 && nr < gridRows && nc >= 0 && nc < gridCols) {
            const orig = grid[nr][nc];
            capture(nr, nc, b.side);
            if (orig !== b.side) {
              if (nc !== pc) b.vx = -b.vx;
              if (nr !== pr) b.vy = -b.vy;
              b.x += b.vx * 0.01; b.y += b.vy * 0.01;
            }
          }
        }
      }
    }

    // Draw a ball
    function drawBall(b) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, cellSize * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.stroke();
    }

    // Update the on-screen counts
    function updateInfo() {
      info.innerHTML = '';
      counts.forEach((cnt, i) => {
        const div = document.createElement('div');
        div.className = 'sector-info';
        div.innerHTML = `<span class="color-box" style="background:${stylishPalette[i].bg}"></span>${cnt}`;
        info.appendChild(div);
      });
    }

    // Redraw the entire scene
    function redraw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawGrid();
      balls.forEach(drawBall);
      updateInfo();
    }

    // Animation loop
    function loop() {
      balls.forEach(updateBall);
      redraw();
      rafId = requestAnimationFrame(loop);
    }

    // Resize canvas to fit
    function setCanvasDims() {
      const wrapper = document.querySelector('.canvas-wrapper');
      const maxW = wrapper.clientWidth;
      const maxH = window.innerHeight * 0.8;
      const ar = appliedCols / appliedRows || 1;
      let w = maxW, h = w / ar;
      if (h > maxH) {
        h = maxH;
        w = h * ar;
      }
      canvas.width  = w;
      canvas.height = h;
      cellSize = canvas.width / appliedCols;
    }

    // Handle Start/Stop/Restart logic
    btnToggle.addEventListener('click', () => {
      if (!isRunning) {
        // Start
        appliedCols  = +inpCols.value;
        appliedRows  = +inpRows.value;
        appliedSides = +inpSides.value;
        dirty = false;
        updateButtonLabel();
        setCanvasDims();
        init();
        isRunning = true;
        loop();
      } else if (dirty) {
        // Restart with new settings
        cancelAnimationFrame(rafId);
        appliedCols  = +inpCols.value;
        appliedRows  = +inpRows.value;
        appliedSides = +inpSides.value;
        dirty = false;
        updateButtonLabel();
        setCanvasDims();
        init();
        loop();
      } else {
        // Stop
        cancelAnimationFrame(rafId);
        isRunning = false;
        dirty = false;
        updateButtonLabel();
      }
    });

    // Keep canvas responsive on resize
    window.addEventListener('resize', () => {
      if (!isRunning) return;
      const oldW = canvas.width, oldH = canvas.height;
      setCanvasDims();
      const sx = canvas.width / oldW, sy = canvas.height / oldH;
      balls.forEach(b => { b.x *= sx; b.y *= sy; });
      redraw();
    });

    // Initialize labels and button
    labelCols.textContent  = inpCols.value;
    labelRows.textContent  = inpRows.value;
    labelSides.textContent = inpSides.value;
    updateButtonLabel();
})();
