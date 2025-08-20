const startBtn = document.getElementById('startBtn');
const stopBtn  = document.getElementById('stopBtn');
const gameBoard = document.getElementById('game-board');
const attemptsLeftDisplay = document.getElementById('attemptsLeft');
const scoreDisplay = document.getElementById('score');
const timerDisplay = document.getElementById('timer');
const cooldownMessage = document.getElementById('cooldown-message');
const cooldownTimer = document.getElementById('cooldown-timer');
const gameInfo = document.getElementById('game-info');
const levelDisplay = document.getElementById('levelDisplay');
const controls = document.getElementById('controls');
const lbLevelSelect = document.getElementById('lbLevel');

let firstCard = null;
let secondCard = null;
let attempts = 3;
let score = 0;
let level = 0;                // 0-based
let timer = 0;
let timeLeft = 0;
let timerInterval, countdownInterval;
let lockBoard = false;

const cooldownKey = "lastPlayTime";
const cardImages = [
  "images/img1.jpg","images/img2.png","images/img3.jpg","images/img4.jpg",
  "images/img5.jpg","images/img6.jpg","images/img7.jpg","images/img8.jpg"
];

const patterns = [
  { cols: 4, rows: 3, timeLimit: 60 },   // L1
  { cols: 4, rows: 4, timeLimit: 90 },   // L2
  { cols: 5, rows: 4, timeLimit: 120 },  // L3
  { cols: 6, rows: 4, timeLimit: 150 },  // L4
  { cols: 6, rows: 5, timeLimit: 180 }   // L5
];

function fillLeaderboardLevelOptions() {
  lbLevelSelect.innerHTML = "";
  for (let i = 1; i <= patterns.length; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `Level ${i}`;
    lbLevelSelect.appendChild(opt);
  }
  lbLevelSelect.value = 1;
}
fillLeaderboardLevelOptions();

startBtn.addEventListener('click', async () => {
  const playerName = document.getElementById('playerName').value.trim();
  if (!playerName) { alert("Please enter your name!"); return; }

  // 60s global cooldown between *fresh* starts
  let lastPlay = localStorage.getItem(cooldownKey);
  if (lastPlay && Date.now() - lastPlay < 60000) {
    let remaining = Math.ceil(60 - (Date.now() - lastPlay) / 1000);
    cooldownMessage.classList.remove("hidden");
    cooldownTimer.textContent = remaining;
    return;
  }
  cooldownMessage.classList.add("hidden");
  localStorage.setItem(cooldownKey, Date.now());

  // check saved progress
  const progress = await getProgress(playerName);
  if (progress) {
    const resume = confirm(
      `Resume your saved game?\n` +
      `Level: ${progress.current_level + 1}\nAttempts Left: ${progress.attempts_left}\n` +
      `Score: ${progress.score}${progress.time_left ? `\nTime Left: ${progress.time_left}s` : ""}`
    );
    if (resume) {
      level = progress.current_level;
      attempts = progress.attempts_left;
      score = progress.score;
      timeLeft = progress.time_left; // 0 means fresh for this level
      startGame(true);
      return;
    }
  }

  // start fresh
  level = 0; attempts = 3; score = 0; timeLeft = 0;
  startGame(false);
});

stopBtn.addEventListener('click', async () => {
  const playerName = document.getElementById('playerName').value.trim();
  clearInterval(timerInterval); clearInterval(countdownInterval);
  await saveProgress(playerName, level, attempts, score, timeLeft);
  alert("Progress saved. You can come back and resume later!");
  loadLeaderboard(); // still can see leaderboard
});

lbLevelSelect.addEventListener('change', () => {
  loadLeaderboard(parseInt(lbLevelSelect.value, 10) || 1);
});

function startGame(resuming) {
  controls.classList.remove("hidden");
  gameBoard.innerHTML = "";
  timer = 0;
  firstCard = null; secondCard = null;

  attemptsLeftDisplay.textContent = attempts;
  scoreDisplay.textContent = score;
  levelDisplay.textContent = level + 1;

  gameInfo.classList.remove("hidden");
  gameBoard.classList.remove("hidden");

  const pattern = patterns[level % patterns.length];
  gameBoard.style.gridTemplateColumns = `repeat(${pattern.cols}, 100px)`;

  // set timeLeft
  if (!resuming || !timeLeft) {
    timeLeft = pattern.timeLimit;
  }

  clearInterval(timerInterval);
  clearInterval(countdownInterval);

  timerInterval = setInterval(() => { timer++; }, 1000);

  countdownInterval = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = timeLeft;
    if (timeLeft <= 0) {
      handleLevelFail();
    }
  }, 1000);

  const totalCards = pattern.cols * pattern.rows;
  const neededImages = totalCards / 2;
  const selectedImages = cardImages.slice().sort(() => 0.5 - Math.random()).slice(0, neededImages);
  const gameCards = [...selectedImages, ...selectedImages].sort(() => 0.5 - Math.random());

  gameCards.forEach(img => {
    const card = document.createElement("div");
    card.classList.add("card");
    card.innerHTML = `
      <div class="front"></div>
      <img src="${img}" class="back" style="display:none">
    `;
    card.addEventListener('click', () => flipCard(card, img));
    gameBoard.appendChild(card);
  });

  // update LB view to current level by default
  lbLevelSelect.value = (level + 1).toString();
  loadLeaderboard(level + 1);
}

function handleLevelFail() {
  clearInterval(timerInterval);
  clearInterval(countdownInterval);

  attempts--;
  attemptsLeftDisplay.textContent = attempts;
  score = Math.max(0, score - 20); // -20 for retry
  scoreDisplay.textContent = score;

  // record this run for ranking (stopped/failed at this level)
  saveScore(); // saves current level and elapsed time (timer)

  if (attempts > 0) {
    if (confirm(`❌ Time’s up! You lost 1 attempt. -20 points.\nAttempts left: ${attempts}\nRetry now?`)) {
      timeLeft = 0; // fresh timer next start
      startGame(false);
    } else {
      alert("⏳ Wait 2 minutes to retry this level.");
      setTimeout(() => { timeLeft = 0; startGame(false); }, 120000);
    }
  } else {
    alert("❌ Game Over! No attempts left.");
    loadLeaderboard(level + 1);
  }
}

function flipCard(card, img) {
  if (lockBoard || card.classList.contains("flipped")) return;

  card.classList.add("flipped");
  card.querySelector('img').style.display = "block";

  if (!firstCard) { firstCard = { card, img }; return; }
  secondCard = { card, img };
  lockBoard = true;

  if (firstCard.img === secondCard.img) {
    score += 10;
    scoreDisplay.textContent = score;
    resetBoard();

    if (document.querySelectorAll(".card:not(.flipped)").length === 0) {
      endLevelSuccess();
    }
  } else {
    setTimeout(() => {
      firstCard.card.classList.remove("flipped");
      secondCard.card.classList.remove("flipped");
      firstCard.card.querySelector('img').style.display = "none";
      secondCard.card.querySelector('img').style.display = "none";
      resetBoard();
    }, 800);
  }
}

function resetBoard() { firstCard = null; secondCard = null; lockBoard = false; }

function endLevelSuccess() {
  clearInterval(timerInterval); clearInterval(countdownInterval);
  alert("🎉 Level Completed!");
  saveScore(); // record best for this level

  if (level < patterns.length - 1) {
    level++;
    attempts = 3;       // reset for next level
    timeLeft = 0;
    startGame(false);
  } else {
    alert("🏆 You completed all levels!");
    loadLeaderboard(level + 1);
  }
}

// ----- Backend helpers -----

function saveScore() {
  const playerName = document.getElementById('playerName').value.trim();
  // time taken in this level = pattern time limit - remaining OR simply 'timer'
  // We’ll use 'timer' (elapsed since level start); smaller is better.
  fetch('save_score.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      player_name: playerName,
      score: score,
      time_taken: timer,
      level: level + 1      // display level
    })
  });
  // also save progress snapshot (so they can continue if they stop next)
  saveProgress(playerName, level, attempts, score, timeLeft);
}

async function saveProgress(playerName, currentLevel, attemptsLeft, scoreVal, timeLeftVal) {
  try {
    await fetch('save_progress.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_name: playerName,
        current_level: currentLevel,
        attempts_left: attemptsLeft,
        score: scoreVal,
        time_left: timeLeftVal
      })
    });
  } catch(e) { /* ignore */ }
}

async function getProgress(playerName) {
  try {
    const r = await fetch('get_progress.php?player_name=' + encodeURIComponent(playerName));
    const j = await r.json();
    return j.success ? j.data : null;
  } catch(e) { return null; }
}

function loadLeaderboard(displayLevel = 1) {
  fetch('get_leaderboard.php?level=' + displayLevel)
    .then(res => res.json())
    .then(data => {
      const list = document.getElementById('leaderboardList');
      list.innerHTML = "";
      if (data.success && Array.isArray(data.data)) {
        data.data.forEach((item, idx) => {
          const li = document.createElement('li');
          li.textContent = `#${idx+1} ${item.player_name} – ${item.time_taken}s (Score ${item.score})`;
          list.appendChild(li);
        });
      }
    });
}

// initial
loadLeaderboard(1);
function loadLeaderboard(displayLevel = 1) {
  fetch('get_leaderboard.php?level=' + displayLevel)
    .then(res => res.json())
    .then(data => {
      const list = document.getElementById('leaderboardList');
      list.innerHTML = "";
      if (data.success && Array.isArray(data.data) && data.data.length) {
        data.data.forEach((item, idx) => {
          const li = document.createElement('li');
          li.textContent = `#${idx+1} ${item.player_name} – ${item.time_taken}s (Score ${item.score})`;
          list.appendChild(li);
        });
      } else {
        const li = document.createElement('li');
        li.textContent = "No results yet for this level.";
        list.appendChild(li);
      }
    })
    .catch(() => {
      const list = document.getElementById('leaderboardList');
      list.innerHTML = "<li>Couldn’t load leaderboard.</li>";
    });
}

