<?php
require 'db.php';

$data = json_decode(file_get_contents("php://input"), true);
$player_name = trim($data['player_name'] ?? '');
$score = (int)($data['score'] ?? 0);
$time_taken = (int)($data['time_taken'] ?? 0);
$level = (int)($data['level'] ?? 1); // display level (1-based from JS)

if ($player_name === '' || $level < 1) {
    echo json_encode(["success" => false, "message" => "Invalid payload"]);
    exit;
}

$stmt = $conn->prepare("
    INSERT INTO leaderboard (player_name, level, best_time, best_score)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      best_time = LEAST(best_time, VALUES(best_time)),
      best_score = GREATEST(best_score, VALUES(best_score)),
      updated_at = CURRENT_TIMESTAMP
");
$stmt->bind_param("siii", $player_name, $level, $time_taken, $score);

if ($stmt->execute()) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => $conn->error]);
}
$completed = (int)($data['completed'] ?? 0);
if ($completed !== 1) {
    echo json_encode(["success" => true, "message" => "Not a completed level; leaderboard unchanged."]);
    exit;
}
