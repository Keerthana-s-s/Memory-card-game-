<?php
require 'db.php';

/*
  Optional query string:
  ?level=3 -> top 10 for Level 3 (display level)
  If omitted, defaults to level=1.
*/
$level = isset($_GET['level']) ? (int)$_GET['level'] : 1;
if ($level < 1) $level = 1;

$stmt = $conn->prepare("
    SELECT player_name, best_score AS score, best_time AS time_taken, level
    FROM leaderboard
    WHERE level = ?
    ORDER BY best_time ASC, best_score DESC, player_name ASC
    LIMIT 10
");
$stmt->bind_param("i", $level);
$stmt->execute();
$res = $stmt->get_result();

$rows = [];
while ($row = $res->fetch_assoc()) {
    $rows[] = $row;
}
echo json_encode(["success" => true, "data" => $rows, "level" => $level]);
