<?php
/* ============================================================================
 * Lumen Commerce — order endpoint  (single file, no framework)
 * ----------------------------------------------------------------------------
 *   POST  /store/api/orders.php
 *         Public. Receives a JSON order from the storefront checkout,
 *         stores it server-side and emails the shop owner. Returns the
 *         server-assigned order number.
 *
 *   GET   /store/api/orders.php?key=ADMIN_KEY
 *         Private. Returns every stored order as JSON so the Admin app can
 *         sync real orders onto any device. Requires the admin key.
 *
 * Storage: data/orders.jsonl (one JSON order per line). The data/ folder is
 * protected from the web by data/.htaccess.
 * ==========================================================================*/

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

$method = $_SERVER["REQUEST_METHOD"];
if ($method === "OPTIONS") { http_response_code(204); exit; }

$cfg       = require __DIR__ . "/config.php";
$dataDir   = __DIR__ . "/data";
$ordersF   = $dataDir . "/orders.jsonl";

function fail($code, $msg) {
  http_response_code($code);
  echo json_encode(array("ok" => false, "error" => $msg));
  exit;
}
function clean($s) { return trim(str_replace(array("\r", "\n", "\t"), " ", (string)$s)); }
function num($v)   { return round(floatval($v), 2); }

/* ---- read all stored orders ------------------------------------------- */
function readOrders($ordersF) {
  $out = array();
  if (is_file($ordersF)) {
    $lines = file($ordersF, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $ln) {
      $o = json_decode($ln, true);
      if (is_array($o)) $out[] = $o;
    }
  }
  return $out;
}

/* ====================================================================== GET */
if ($method === "GET") {
  $key = isset($_GET["key"]) ? $_GET["key"] : "";
  if (!is_string($key) || !hash_equals((string)$cfg["admin_key"], $key)) fail(403, "Forbidden");
  echo json_encode(array("ok" => true, "orders" => readOrders($ordersF)));
  exit;
}

/* ===================================================================== POST */
if ($method !== "POST") fail(405, "Method not allowed");

$raw = file_get_contents("php://input");
if ($raw === false || strlen($raw) > 200000) fail(413, "Order too large");
$in = json_decode($raw, true);
if (!is_array($in) || empty($in["items"]) || !is_array($in["items"])) fail(400, "Invalid order");

if (!is_dir($dataDir)) { @mkdir($dataDir, 0775, true); }

/* server-assigned, trustworthy fields */
$existing = readOrders($ordersF);
$number   = 1001 + count($existing);

$cust = isset($in["customer"]) && is_array($in["customer"]) ? $in["customer"] : array();
$email = filter_var(isset($cust["email"]) ? $cust["email"] : "", FILTER_VALIDATE_EMAIL);
$email = $email ? $email : "";

$items = array();
$subtotal = 0;
foreach ($in["items"] as $it) {
  if (!is_array($it)) continue;
  $line = array(
    "title"   => substr(clean(isset($it["title"]) ? $it["title"] : "Item"), 0, 200),
    "price"   => num(isset($it["price"]) ? $it["price"] : 0),
    "qty"     => max(1, intval(isset($it["qty"]) ? $it["qty"] : 1)),
    "options" => array(),
  );
  if (isset($it["options"]) && is_array($it["options"])) {
    foreach ($it["options"] as $k => $v) $line["options"][clean($k)] = clean($v);
  }
  $subtotal += $line["price"] * $line["qty"];
  $items[] = $line;
}
if (!count($items)) fail(400, "No valid items");

$record = array(
  "id"        => substr(clean(isset($in["id"]) ? $in["id"] : ("o_" . uniqid())), 0, 60),
  "number"    => $number,
  "createdAt" => gmdate("c"),
  "status"    => "pending",
  "source"    => "web",
  "customer"  => array(
    "name"     => substr(clean(isset($cust["name"]) ? $cust["name"] : ""), 0, 120),
    "email"    => $email,
    "address"  => substr(clean(isset($cust["address"]) ? $cust["address"] : ""), 0, 200),
    "city"     => substr(clean(isset($cust["city"]) ? $cust["city"] : ""), 0, 120),
    "postcode" => substr(clean(isset($cust["postcode"]) ? $cust["postcode"] : ""), 0, 40),
    "country"  => substr(clean(isset($cust["country"]) ? $cust["country"] : ""), 0, 80),
    "phone"    => substr(clean(isset($cust["phone"]) ? $cust["phone"] : ""), 0, 40),
  ),
  "items"        => $items,
  "subtotal"     => num(isset($in["subtotal"]) ? $in["subtotal"] : $subtotal),
  "discount"     => num(isset($in["discount"]) ? $in["discount"] : 0),
  "discountCode" => substr(clean(isset($in["discountCode"]) ? $in["discountCode"] : ""), 0, 40),
  "shipping"     => num(isset($in["shipping"]) ? $in["shipping"] : 0),
  "tax"          => num(isset($in["tax"]) ? $in["tax"] : 0),
  "total"        => num(isset($in["total"]) ? $in["total"] : $subtotal),
  "note"         => substr(clean(isset($in["note"]) ? $in["note"] : ""), 0, 1000),
);

/* persist */
$ok = @file_put_contents($ordersF, json_encode($record) . "\n", FILE_APPEND | LOCK_EX);
if ($ok === false) fail(500, "Could not save order");

/* notify the owner */
$cur = isset($cfg["currency"]) ? $cfg["currency"] : "£";
$body  = "New order #" . $number . " — " . $cfg["store_name"] . "\n\n";
foreach ($record["items"] as $it) {
  $opts = $it["options"] ? " (" . implode(", ", array_values($it["options"])) . ")" : "";
  $body .= "  " . $it["qty"] . " x " . $it["title"] . $opts .
           "  —  " . $cur . number_format($it["price"] * $it["qty"], 2) . "\n";
}
$body .= "\nSubtotal: " . $cur . number_format($record["subtotal"], 2) . "\n";
if ($record["discount"] > 0) $body .= "Discount (" . $record["discountCode"] . "): -" . $cur . number_format($record["discount"], 2) . "\n";
$body .= "Shipping: " . $cur . number_format($record["shipping"], 2) . "\n";
$body .= "TOTAL: "    . $cur . number_format($record["total"], 2) . "\n\n";
$c = $record["customer"];
$body .= "Ship to:\n" . $c["name"] . "\n" . $c["address"] . "\n" .
         $c["city"] . " " . $c["postcode"] . "\n" . $c["country"] . "\n" .
         ($c["phone"] ? "Phone: " . $c["phone"] . "\n" : "") .
         "Email: " . $c["email"] . "\n";
if ($record["note"]) $body .= "\nNote: " . $record["note"] . "\n";

$subject = "New order #" . $number . " — " . ($c["name"] ? $c["name"] : "website");
$headers = "From: " . clean($cfg["from_email"]) . "\r\n" .
           ($email ? "Reply-To: " . $email . "\r\n" : "") .
           "Content-Type: text/plain; charset=UTF-8\r\n";
@mail($cfg["owner_email"], $subject, $body, $headers);

echo json_encode(array("ok" => true, "id" => $record["id"], "number" => $number));
