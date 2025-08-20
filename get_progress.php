<?php
require 'db.php';

$player_name = trim($_GET['player_name'] ?? '');
if ($player_name === '') {
    echo json_encode(["success" => false, "message" => "player_name required"]);
    exit;
}

$stmt = $conn->prepare("SELECT player_name, current_level, attempts_left, score, time_left FROM player_progress WHERE player_name = ?");
$stmt->bind_param("s", $player_name);
$stmt->execute();
$res = $stmt->get_result(); // ← removed stray 'h'
if ($row = $res->fetch_assoc()) {
    echo json_encode(["success" => true, "data" => $row]);
} else {
    echo json_encode(["success" => true, "data" => null]);
}
