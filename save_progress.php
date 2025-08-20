<?php
require 'db.php';

$data = json_decode(file_get_contents("php://input"), true);

$player_name   = trim($data['player_name'] ?? '');
$current_level = (int)($data['current_level'] ?? 0);
$attempts_left = (int)($data['attempts_left'] ?? 3);
$score         = (int)($data['score'] ?? 0);
$time_left     = (int)($data['time_left'] ?? 0);

if ($player_name === '') {
    echo json_encode(["success" => false, "message" => "Invalid payload"]);
    exit;
}

$stmt = $conn->prepare("
  INSERT INTO player_progress (player_name, current_level, attempts_left, score, time_left)
  VALUES (?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    current_level = VALUES(current_level),
    attempts_left = VALUES(attempts_left),
    score         = VALUES(score),
    time_left     = VALUES(time_left),
    updated_at    = CURRENT_TIMESTAMP
");
$stmt->bind_param("siiii", $player_name, $current_level, $attempts_left, $score, $time_left);

if ($stmt->execute()) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => $conn->error]);
}
function saveScore(completed = false) {
  const playerName = document.getElementById('playerName').value.trim();
  fetch('save_score.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      player_name: playerName,
      score: score,
      time_taken: timer,
      level: level + 1,
      completed: completed ? 1 : 0
    })
  });
  saveProgress(playerName, level, attempts, score, timeLeft);
}

