<?php
/* StartDotCom HQ fast endpoint: loads only WordPress's database layer, so it stays light when 30 people sync about once a second.
   If a host blocks direct access to plugin files, the office automatically falls back to admin-ajax.php. */
define('SHORTINIT', true);
$sdchq_load = '';
foreach (array(__DIR__, isset($_SERVER['SCRIPT_FILENAME']) ? dirname($_SERVER['SCRIPT_FILENAME']) : '') as $sdchq_dir) {
    for ($i = 0; $i < 8 && $sdchq_dir !== '' && $sdchq_load === ''; $i++) { $sdchq_dir = dirname($sdchq_dir); if (is_file($sdchq_dir . '/wp-load.php')) { $sdchq_load = $sdchq_dir . '/wp-load.php'; } }
}
if ($sdchq_load === '') { http_response_code(503); header('Content-Type: application/json'); echo '{"ok":false,"err":"no_wp"}'; exit; }
require $sdchq_load;
require __DIR__ . '/inc/core.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { sdchq_out(array('ok' => true, 'ping' => 1)); }
sdchq_sync(sdchq_body());
