<?php
/**
 * Plugin Name: StartDotCom HQ – Virtual Office
 * Description: A 3D virtual office for your team: messages, mail, calendar, shared documents, voice and video calls, all inside your own WordPress. No outside services needed.
 * Version: 9.0.0
 * Requires at least: 5.6
 * Requires PHP: 7.2
 * Author: TechDotAI
 * License: GPLv2 or later
 * Text Domain: startdotcom-hq
 */
if (!defined('ABSPATH')) { exit; }
define('SDCHQ_VER', '9.0.0');
define('SDCHQ_DIR', plugin_dir_path(__FILE__));
require_once SDCHQ_DIR . 'inc/core.php';

/* ---------------- install ---------------- */
function sdchq_install() {
    global $wpdb; require_once ABSPATH . 'wp-admin/includes/upgrade.php'; $cs = $wpdb->get_charset_collate();
    dbDelta("CREATE TABLE " . sdchq_t('docs') . " (
  rev bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  path varchar(190) NOT NULL,
  col varchar(32) NOT NULL,
  data longtext NOT NULL,
  del tinyint(1) NOT NULL DEFAULT 0,
  byuid bigint(20) unsigned NOT NULL DEFAULT 0,
  t int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY  (rev),
  UNIQUE KEY path (path),
  KEY col (col)
) $cs;");
    dbDelta("CREATE TABLE " . sdchq_t('pres') . " (
  peer varchar(40) NOT NULL,
  uid bigint(20) unsigned NOT NULL,
  data text NOT NULL,
  t int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY  (peer),
  KEY t (t)
) $cs;");
    dbDelta("CREATE TABLE " . sdchq_t('ev') . " (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  topic varchar(32) NOT NULL,
  dest varchar(40) NOT NULL DEFAULT '',
  data mediumtext NOT NULL,
  peer varchar(40) NOT NULL,
  t int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY  (id)
) $cs;");
    dbDelta("CREATE TABLE " . sdchq_t('members') . " (
  uid bigint(20) unsigned NOT NULL,
  status varchar(12) NOT NULL DEFAULT 'pending',
  role varchar(12) NOT NULL DEFAULT 'member',
  name varchar(120) NOT NULL DEFAULT '',
  email varchar(190) NOT NULL DEFAULT '',
  created int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY  (uid)
) $cs;");
    if (get_option('sdchq_secret', '') === '') { add_option('sdchq_secret', wp_generate_password(64, false), '', 'yes'); }
    add_option('sdchq_settings', array(), '', 'yes'); add_option('sdchq_invites', array(), '', 'no'); add_option('sdchq_codes', array(), '', 'no');
    update_option('sdchq_dbver', SDCHQ_VER);
}
register_activation_hook(__FILE__, 'sdchq_install');
add_action('plugins_loaded', function () { if (get_option('sdchq_dbver') !== SDCHQ_VER) { sdchq_install(); } });

function sdchq_opt($k = null) {
    $d = array('name' => get_bloginfo('name') . ' HQ', 'tagline' => 'Sign in to walk into the office.', 'slug' => 'hq', 'signup' => 1, 'approval' => 1, 'domains' => '', 'sync' => 800, 'ice' => '', 'maxmb' => 20);
    $s = array_merge($d, (array) get_option('sdchq_settings', array())); return $k === null ? $s : (isset($s[$k]) ? $s[$k] : null);
}
function sdchq_public_lic() { $L = sdchq_license(); return array('tier' => $L['tier'], 'label' => $L['label'], 'seats' => $L['seats'], 'used' => sdchq_seats_used(), 'addons' => $L['addons'], 'wm' => $L['wm'], 'org' => $L['org'], 'valid' => $L['valid'], 'exp' => $L['exp'], 'trial' => isset($L['trial']) ? $L['trial'] : 0, 'site' => preg_replace('/^www\\./i', '', (string) parse_url(home_url(), PHP_URL_HOST)), 'buy' => (string) get_option('sdchq_buyurl', 'https://portal.zuchera.com')); }
function sdchq_url() { return get_option('permalink_structure') ? home_url('/' . sdchq_opt('slug') . '/') : add_query_arg('hq', '1', home_url('/')); }

/* ---------------- membership ---------------- */
function sdchq_member_ensure($user, $code_role = '') {
    global $wpdb; $m = sdchq_member($user->ID); $T = sdchq_t('members'); $wpadmin = user_can($user, 'manage_options');
    $name = $user->display_name ? $user->display_name : $user->user_login; $email = strtolower($user->user_email);
    if ($m) {
        if ($wpadmin && ($m['status'] !== 'approved' || $m['role'] === 'member')) { $wpdb->update($T, array('status' => 'approved', 'role' => $wpdb->get_var("SELECT COUNT(*) FROM $T WHERE role = 'owner' AND uid <> " . (int) $user->ID) ? 'admin' : 'owner'), array('uid' => $user->ID)); return sdchq_member($user->ID); }
        return $m;
    }
    $status = 'pending'; $role = 'member'; $inv = (array) get_option('sdchq_invites', array());
    if ($wpadmin) { $status = 'approved'; $role = $wpdb->get_var("SELECT COUNT(*) FROM $T WHERE role = 'owner'") ? 'admin' : 'owner'; }
    elseif ($code_role) { $status = 'approved'; $role = $code_role === 'admin' ? 'admin' : 'member'; }
    elseif (isset($inv[$email])) { $status = 'approved'; $role = $inv[$email]['role'] === 'admin' ? 'admin' : 'member'; $inv[$email]['used'] = 1; update_option('sdchq_invites', $inv, false); }
    else {
        $dom = substr(strrchr($email, '@'), 1); $allowed = array_filter(array_map('trim', explode(',', strtolower(sdchq_opt('domains')))));
        if (!sdchq_opt('approval') || ($dom && in_array($dom, $allowed, true))) { $status = 'approved'; }
    }
    $wpdb->insert($T, array('uid' => $user->ID, 'status' => $status, 'role' => $role, 'name' => $name, 'email' => $email, 'created' => time()));
    return sdchq_member($user->ID);
}
function sdchq_session($user, $code_role = '') {
    $m = sdchq_member_ensure($user, $code_role);
    return array('ok' => true, 'token' => sdchq_token_make($user->ID), 'me' => array('id' => 'u' . $user->ID, 'name' => $m['name'], 'email' => $m['email'], 'role' => $m['role'], 'status' => ($m['status'] === 'approved' && !sdchq_seat_ok($user->ID)) ? 'full' : $m['status']));
}
function sdchq_ip_key($what) { return 'sdchq_' . $what . '_' . md5(isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'x'); }
function sdchq_ip_check($what, $max) { if ((int) get_transient(sdchq_ip_key($what)) >= $max) { sdchq_out(array('ok' => false, 'err' => 'Too many attempts. Wait a few minutes and try again.'), 429); } }
function sdchq_ip_hit($what, $secs) { $k = sdchq_ip_key($what); $n = (int) get_transient($k); set_transient($k, $n + 1, $secs); }
function sdchq_code_role($code) { $c = (array) get_option('sdchq_codes', array()); $code = preg_replace('/[^A-Za-z0-9]/', '', (string) $code); return ($code !== '' && isset($c[$code]) && $c[$code]['exp'] > time()) ? $c[$code]['role'] : ''; }

/* ---------------- sign-in, sign-up, sign-out (no email needed at any step) ---------------- */
function sdchq_ajax_login() {
    $b = sdchq_body(); sdchq_ip_check('login', 15);
    $login = isset($b['login']) ? trim((string) $b['login']) : ''; $pw = isset($b['password']) ? (string) $b['password'] : '';
    if ($login === '' || $pw === '') { sdchq_out(array('ok' => false, 'err' => 'Enter your email and password.')); }
    if (is_email($login)) { $u = get_user_by('email', $login); if ($u) { $login = $u->user_login; } }
    $user = wp_signon(array('user_login' => $login, 'user_password' => $pw, 'remember' => true), is_ssl());
    if (is_wp_error($user)) { sdchq_ip_hit('login', 600); sdchq_out(array('ok' => false, 'err' => 'That email and password do not match.')); }   // only failed attempts count, so a whole team behind one office address can sign in
    wp_set_current_user($user->ID); sdchq_out(sdchq_session($user, sdchq_code_role(isset($b['code']) ? $b['code'] : '')));
}
function sdchq_ajax_register() {
    $b = sdchq_body(); $code_role = sdchq_code_role(isset($b['code']) ? $b['code'] : '');
    if (!$code_role) { sdchq_ip_check('reg', 40); sdchq_ip_hit('reg', 3600); }
    if (!sdchq_opt('signup') && !$code_role) { sdchq_out(array('ok' => false, 'err' => 'New accounts are by invitation only. Ask an admin for an invite link.')); }
    $email = isset($b['email']) ? sanitize_email((string) $b['email']) : ''; $pw = isset($b['password']) ? (string) $b['password'] : ''; $name = isset($b['name']) ? sanitize_text_field(substr((string) $b['name'], 0, 80)) : '';
    if (!is_email($email)) { sdchq_out(array('ok' => false, 'err' => 'Enter a valid email address.')); }
    if (strlen($pw) < 8) { sdchq_out(array('ok' => false, 'err' => 'Passwords need at least 8 characters.')); }
    if ($name === '') { sdchq_out(array('ok' => false, 'err' => 'Enter your name.')); }
    if (email_exists($email)) { sdchq_out(array('ok' => false, 'err' => 'That email already has an account. Sign in instead.')); }
    $login = sanitize_user(strstr($email, '@', true), true); if ($login === '') { $login = 'member'; } $base = $login; $i = 1; while (username_exists($login)) { $login = $base . (++$i); }
    $uid = wp_insert_user(array('user_login' => $login, 'user_pass' => $pw, 'user_email' => $email, 'display_name' => $name, 'first_name' => $name, 'role' => 'subscriber'));
    if (is_wp_error($uid)) { sdchq_out(array('ok' => false, 'err' => $uid->get_error_message())); }
    wp_set_current_user($uid); wp_set_auth_cookie($uid, true, is_ssl());
    sdchq_out(sdchq_session(get_user_by('id', $uid), $code_role));
}
function sdchq_ajax_token() { if (!is_user_logged_in()) { sdchq_out(array('ok' => false, 'err' => 'auth'), 401); } sdchq_out(sdchq_session(wp_get_current_user())); }
function sdchq_ajax_logout() { wp_logout(); sdchq_out(array('ok' => true)); }
function sdchq_ajax_api() { sdchq_sync(sdchq_body()); }
foreach (array('login', 'register', 'token', 'logout', 'api', 'upload', 'admin') as $a) { add_action('wp_ajax_sdchq_' . $a, 'sdchq_ajax_' . $a); add_action('wp_ajax_nopriv_sdchq_' . $a, 'sdchq_ajax_' . $a); }

/* ---------------- files: stored in this site's uploads folder ---------------- */
function sdchq_files_dir() {
    $u = wp_upload_dir(); $dir = trailingslashit($u['basedir']) . 'sdchq';
    if (!is_dir($dir)) { wp_mkdir_p($dir); @file_put_contents($dir . '/.htaccess', "Options -Indexes\n<FilesMatch \"\\.(php|phtml|phar|pl|py|cgi|sh)$\">\nRequire all denied\n</FilesMatch>\n"); @file_put_contents($dir . '/index.html', ''); }
    return array($dir, trailingslashit($u['baseurl']) . 'sdchq');
}
function sdchq_ajax_upload() {
    $uid = sdchq_token_uid(isset($_POST['tok']) ? wp_unslash($_POST['tok']) : ''); $m = $uid ? sdchq_member($uid) : null;
    if (!$m || $m['status'] !== 'approved') { sdchq_out(array('ok' => false, 'err' => 'auth'), 401); }
    if (empty($_FILES['file']) || !empty($_FILES['file']['error'])) { sdchq_out(array('ok' => false, 'err' => 'The file did not arrive. It may be larger than this server allows.')); }
    $f = $_FILES['file']; $max = max(1, (int) sdchq_opt('maxmb')) * 1048576; if ($f['size'] > $max) { sdchq_out(array('ok' => false, 'err' => 'Files up to ' . (int) sdchq_opt('maxmb') . ' MB.')); }
    $name = sanitize_file_name($f['name']); $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    $ok = array('jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'txt', 'md', 'csv', 'json', 'mp4', 'webm', 'mov', 'mp3', 'wav', 'ogg', 'm4a', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip');
    if (!in_array($ext, $ok, true)) { sdchq_out(array('ok' => false, 'err' => 'That file type is not allowed here.')); }
    list($dir, $url) = sdchq_files_dir(); $sub = bin2hex(random_bytes(10)); if (!wp_mkdir_p($dir . '/' . $sub)) { sdchq_out(array('ok' => false, 'err' => 'The uploads folder is not writable.')); }
    $name = substr($name, -90); if (!move_uploaded_file($f['tmp_name'], $dir . '/' . $sub . '/' . $name)) { sdchq_out(array('ok' => false, 'err' => 'Could not save the file.')); }
    sdchq_out(array('ok' => true, 'id' => $sub . '/' . $name, 'url' => $url . '/' . $sub . '/' . rawurlencode($name), 'size' => (int) $f['size']));
}

/* ---------------- admin actions from inside the office ---------------- */
function sdchq_slack_post($uid, $b) {
    $o = (array) get_option('sdchq_slack', array()); $conv = preg_replace('/[^A-Za-z0-9_~\\-]/', '', (string) (isset($b['conv']) ? $b['conv'] : ''));
    if (empty($o['url']) || !in_array($conv, (array) (isset($o['ch']) ? $o['ch'] : array()), true) || strpos($conv, 'dm_') === 0) { sdchq_out(array('ok' => false)); }
    $k = 'sdchq_sl_' . (int) $uid; $n = (int) get_transient($k); if ($n >= 20) { sdchq_out(array('ok' => false, 'err' => 'slow down')); } set_transient($k, $n + 1, 60);
    $m = sdchq_member($uid); $text = wp_strip_all_tags(substr((string) (isset($b['text']) ? $b['text'] : ''), 0, 1500)); if ($text === '') { sdchq_out(array('ok' => false)); }
    wp_remote_post($o['url'], array('timeout' => 5, 'redirection' => 0, 'headers' => array('Content-Type' => 'application/json'), 'body' => wp_json_encode(array('text' => '*' . $m['name'] . '* (' . ($conv === 'all' ? 'office chat' : '#' . substr($conv, 3)) . '): ' . $text))));
    sdchq_out(array('ok' => true));
}
function sdchq_member_op($uid, $b) {
    $op = (string) $b['op']; $k = 'sdchq_op_' . $op . '_' . (int) $uid; $n = (int) get_transient($k); $cap = $op === 'ai' ? 40 : 12; if ($n >= $cap) { sdchq_out(array('ok' => false, 'err' => 'Slow down a little and try again soon.')); } set_transient($k, $n + 1, HOUR_IN_SECONDS);
    if ($op === 'ics') {
        $url = trim((string) (isset($b['url']) ? $b['url'] : '')); if (strpos($url, 'https://') !== 0 || !wp_http_validate_url($url)) { sdchq_out(array('ok' => false, 'err' => 'Use the https calendar address.')); }
        $r = wp_safe_remote_get($url, array('timeout' => 8, 'redirection' => 3, 'limit_response_size' => 1048576)); if (is_wp_error($r) || (int) wp_remote_retrieve_response_code($r) !== 200) { sdchq_out(array('ok' => false, 'err' => 'Could not fetch that calendar.')); }
        $t = (string) wp_remote_retrieve_body($r); if (strpos($t, 'BEGIN:VCALENDAR') === false) { sdchq_out(array('ok' => false, 'err' => 'That address is not a calendar feed.')); } sdchq_out(array('ok' => true, 'text' => $t));
    }
    $key = (string) get_option('sdchq_aikey', ''); $L = sdchq_license(); if ($key === '') { sdchq_out(array('ok' => false, 'err' => 'AI is not set up yet. The office owner adds a key in the AI notes panel.')); }
    if (!in_array('ai', (array) $L['addons'], true)) { sdchq_out(array('ok' => false, 'err' => 'AI is part of the Business plan and above.')); }
    $prompt = substr((string) (isset($b['prompt']) ? $b['prompt'] : ''), 0, 30000); if (trim($prompt) === '') { sdchq_out(array('ok' => false, 'err' => 'Nothing to answer.')); }
    $model = preg_replace('/[^A-Za-z0-9._-]/', '', (string) get_option('sdchq_aimodel', 'claude-haiku-5-5'));
    $r = wp_remote_post('https://api.anthropic.com/v1/messages', array('timeout' => 45, 'redirection' => 0, 'headers' => array('x-api-key' => $key, 'anthropic-version' => '2023-06-01', 'content-type' => 'application/json'), 'body' => wp_json_encode(array('model' => $model, 'max_tokens' => 1500, 'messages' => array(array('role' => 'user', 'content' => $prompt))))));
    if (is_wp_error($r)) { sdchq_out(array('ok' => false, 'err' => 'The AI service could not be reached.')); } $j = json_decode(wp_remote_retrieve_body($r), true);
    if (!$j || empty($j['content'][0]['text'])) { sdchq_out(array('ok' => false, 'err' => 'The AI service did not answer. Check the key.')); } sdchq_out(array('ok' => true, 'text' => (string) $j['content'][0]['text']));
}
function sdchq_ajax_admin() {
    global $wpdb; $b = sdchq_body(); $uid = sdchq_token_uid(isset($b['tok']) ? $b['tok'] : ''); $m = $uid ? sdchq_member($uid) : null;
    if ($m && $m['status'] === 'approved' && isset($b['op']) && $b['op'] === 'slackpost') { sdchq_slack_post($uid, $b); }
    if ($m && $m['status'] === 'approved' && isset($b['op']) && ($b['op'] === 'ai' || $b['op'] === 'ics')) { sdchq_member_op($uid, $b); }
    if (!$m || $m['status'] !== 'approved' || ($m['role'] !== 'owner' && $m['role'] !== 'admin')) { sdchq_out(array('ok' => false, 'err' => 'Admins only.'), 403); }
    $T = sdchq_t('members'); $op = isset($b['op']) ? (string) $b['op'] : ''; $target = isset($b['uid']) ? (int) preg_replace('/\D/', '', (string) $b['uid']) : 0;
    $tm = $target ? sdchq_member($target) : null;
    if ($op === 'list') { $rows = $wpdb->get_results("SELECT uid, status, role, name, email, created FROM $T ORDER BY created", ARRAY_A); foreach ($rows as &$r) { $r['user_id'] = 'u' . $r['uid']; } sdchq_out(array('ok' => true, 'list' => $rows)); }
    if ($op === 'status' && $tm && in_array($b['status'], array('approved', 'blocked', 'pending'), true)) { if ($tm['role'] === 'owner') { sdchq_out(array('ok' => false, 'err' => 'The owner cannot be blocked.')); } $wpdb->update($T, array('status' => $b['status']), array('uid' => $target)); if ($b['status'] === 'blocked') { $wpdb->delete(sdchq_t('pres'), array('uid' => $target)); } sdchq_out(array('ok' => true)); }
    if ($op === 'role' && $tm && in_array($b['role'], array('admin', 'member'), true)) { if ($tm['role'] === 'owner') { sdchq_out(array('ok' => false, 'err' => 'The owner stays the owner.')); } $wpdb->update($T, array('role' => $b['role']), array('uid' => $target)); sdchq_out(array('ok' => true)); }
    if ($op === 'resetpw' && $tm) { $u = get_user_by('id', $target); if (!$u || user_can($u, 'manage_options')) { sdchq_out(array('ok' => false, 'err' => 'Site administrators change their own password in WordPress.')); } $pw = wp_generate_password(12, false); wp_set_password($pw, $target); sdchq_out(array('ok' => true, 'password' => $pw)); }
    $inv = (array) get_option('sdchq_invites', array());
    if ($op === 'invites') { $out = array(); foreach ($inv as $e => $v) { $out[] = array('email' => $e, 'role' => $v['role'], 'used' => !empty($v['used'])); } sdchq_out(array('ok' => true, 'invites' => $out)); }
    if ($op === 'invite' && is_email($b['email'])) { $inv[strtolower($b['email'])] = array('role' => $b['role'] === 'admin' ? 'admin' : 'member'); update_option('sdchq_invites', $inv, false); $ex = get_user_by('email', $b['email']); if ($ex) { $em = sdchq_member($ex->ID); if ($em && $em['status'] === 'pending') { $wpdb->update($T, array('status' => 'approved'), array('uid' => $ex->ID)); } } sdchq_out(array('ok' => true)); }
    if ($op === 'uninvite') { unset($inv[strtolower((string) $b['email'])]); update_option('sdchq_invites', $inv, false); sdchq_out(array('ok' => true)); }
    if ($op === 'link') { $codes = (array) get_option('sdchq_codes', array()); foreach ($codes as $k => $v) { if ($v['exp'] < time()) { unset($codes[$k]); } } $code = wp_generate_password(20, false); $codes[$code] = array('role' => 'member', 'exp' => time() + 7 * 86400); update_option('sdchq_codes', $codes, false); sdchq_out(array('ok' => true, 'url' => add_query_arg('invite', $code, sdchq_url()), 'days' => 7)); }
    if ($op === 'slack') { $url = trim((string) (isset($b['url']) ? $b['url'] : '')); $ch = array(); foreach ((array) (isset($b['ch']) ? $b['ch'] : array()) as $c) { $c = preg_replace('/[^A-Za-z0-9_\\-]/', '', (string) $c); if ($c !== '') { $ch[] = substr($c, 0, 40); } } $o = (array) get_option('sdchq_slack', array());
        if ($url !== '') { if (!preg_match('#^https://hooks\\.slack\\.com/services/[A-Za-z0-9/_-]+$#', $url)) { sdchq_out(array('ok' => false, 'err' => 'That is not a Slack incoming webhook address.')); } $o['url'] = $url; } $o['ch'] = $ch; update_option('sdchq_slack', $o, false); sdchq_out(array('ok' => true)); }
    if ($op === 'claim' && $m['role'] === 'owner') { $buy = rtrim((string) get_option('sdchq_buyurl', 'https://portal.zuchera.com'), '/'); $r = wp_remote_get($buy . '/claim?site=' . rawurlencode(wp_parse_url(home_url(), PHP_URL_HOST)), array('timeout' => 8)); $j = is_wp_error($r) ? null : json_decode(wp_remote_retrieve_body($r), true);
        if (!$j || empty($j['ok']) || empty($j['key'])) { sdchq_out(array('ok' => false, 'err' => 'No payment found for this site yet. If you just paid, wait a minute and try again.')); } $old = get_option('sdchq_license', ''); update_option('sdchq_license', $j['key'], false); $L = sdchq_license(true); if (!$L['valid']) { update_option('sdchq_license', $old, false); sdchq_license(true); sdchq_out(array('ok' => false, 'err' => 'The licence returned was not valid for this site.')); } sdchq_out(array('ok' => true, 'tier' => $L['tier'])); }
    if ($op === 'license' && $m['role'] === 'owner') { $key = trim((string) (isset($b['key']) ? $b['key'] : '')); $old = get_option('sdchq_license', ''); update_option('sdchq_license', $key, false); $L = sdchq_license(true);
        if (!$L['valid']) { update_option('sdchq_license', $old, false); sdchq_license(true); sdchq_out(array('ok' => false, 'err' => $L['why'] ?: 'That key is not valid.')); } sdchq_out(array('ok' => true, 'tier' => $L['tier'])); }
    if ($op === 'aikey' && $m['role'] === 'owner') { $k2 = trim((string) (isset($b['key']) ? $b['key'] : '')); if ($k2 !== '' && !preg_match('/^sk-ant-[A-Za-z0-9_-]{20,200}$/', $k2)) { sdchq_out(array('ok' => false, 'err' => 'That does not look like an Anthropic API key.')); } update_option('sdchq_aikey', $k2, false); sdchq_out(array('ok' => true, 'set' => $k2 !== '')); }
    if ($op === 'aistate') { sdchq_out(array('ok' => true, 'set' => get_option('sdchq_aikey', '') !== '')); }
    sdchq_out(array('ok' => false, 'err' => 'Unknown request.'), 400);
}

/* ---------------- people pack: uploaded in small pieces from the settings screen, so the host's upload limit does not matter ---------------- */
add_action('wp_ajax_sdchq_pack', function () {
    if (!current_user_can('manage_options') || !check_ajax_referer('sdchq_pack', 'nonce', false)) { sdchq_out(array('ok' => false, 'err' => 'Not allowed.'), 403); }
    $u = wp_upload_dir(); $base = trailingslashit($u['basedir']); $tmp = $base . 'sdchq-people.part'; $i = isset($_POST['i']) ? (int) $_POST['i'] : 0; $n = isset($_POST['n']) ? (int) $_POST['n'] : 1;
    if (empty($_FILES['chunk']) || !empty($_FILES['chunk']['error'])) { sdchq_out(array('ok' => false, 'err' => 'A piece of the file did not arrive. Try again.')); }
    if ($i === 0) { @unlink($tmp); }
    if (@file_put_contents($tmp, file_get_contents($_FILES['chunk']['tmp_name']), FILE_APPEND) === false) { sdchq_out(array('ok' => false, 'err' => 'The uploads folder is not writable.')); }
    if ($i < $n - 1) { sdchq_out(array('ok' => true, 'next' => $i + 1)); }
    $dest = $base . 'sdchq-people/'; wp_mkdir_p($dest . 'models/thumbs'); $count = 0; $re = '#^(?:[^/]+/)?(models/(?:thumbs/)?[A-Za-z0-9_.-]+\.(?:json|webp|jpg|png|txt))$#';
    if (class_exists('ZipArchive')) {
        $z = new ZipArchive(); if ($z->open($tmp) !== true) { @unlink($tmp); sdchq_out(array('ok' => false, 'err' => 'That file is not a zip. Choose startdotcom-hq-people.zip.')); }
        for ($k = 0; $k < $z->numFiles; $k++) { $name = $z->getNameIndex($k); if (!preg_match($re, $name, $m)) { continue; } $data = $z->getFromIndex($k); if ($data !== false && file_put_contents($dest . $m[1], $data) !== false) { $count++; } }
        $z->close();
    } else {
        require_once ABSPATH . 'wp-admin/includes/class-pclzip.php'; $z = new PclZip($tmp); $list = $z->extract(PCLZIP_OPT_EXTRACT_AS_STRING);
        foreach ((array) $list as $f) { if (!empty($f['folder']) || !preg_match($re, $f['filename'], $m)) { continue; } if (file_put_contents($dest . $m[1], $f['content']) !== false) { $count++; } }
    }
    @unlink($tmp); @file_put_contents($dest . 'index.html', '');
    if (!is_file($dest . 'models/anim_f.json')) { sdchq_out(array('ok' => false, 'err' => 'That zip is not the people pack. Choose startdotcom-hq-people.zip.')); }
    sdchq_out(array('ok' => true, 'done' => true, 'files' => $count, 'looks' => count(sdchq_looks())));
});

/* ---------------- the office page ---------------- */
/* the realistic people ship inside the full plugin zip, or are added afterwards as a separate pack (for hosts with a small upload limit) */
function sdchq_models() {
    if (is_file(SDCHQ_DIR . 'app/models/anim_f.json')) { return array(SDCHQ_DIR . 'app/models/', plugins_url('app/models/', __FILE__)); }
    $u = wp_upload_dir(); $d = trailingslashit($u['basedir']) . 'sdchq-people/models/';
    if (is_file($d . 'anim_f.json')) { return array($d, set_url_scheme(trailingslashit($u['baseurl']) . 'sdchq-people/models/')); }
    return null;
}
function sdchq_looks() { $out = array(); $m = sdchq_models(); if (!$m) { return $out; } foreach ((array) glob($m[0] . '[fm]*.json') as $f) { $id = basename($f, '.json'); if (preg_match('/^[fm]\d+$/', $id)) { $out[] = $id; } } return $out; }
function sdchq_render() {
    $file = SDCHQ_DIR . 'app/index.html'; if (!is_file($file)) { wp_die('StartDotCom HQ: the app files are missing. Upload the plugin zip again.'); }
    nocache_headers(); header('Content-Type: text/html; charset=utf-8'); header('X-Frame-Options: SAMEORIGIN'); header('Referrer-Policy: same-origin');
    header("Permissions-Policy: camera=(self), microphone=(self), display-capture=(self)");
    header("X-Content-Type-Options: nosniff");
    header("Content-Security-Policy: default-src 'self' https: data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob: https: data:; connect-src 'self' blob: data: https: wss:; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.loom.com https://miro.com https://www.figma.com https://docs.google.com https://slides.google.com https://calendar.google.com https://open.spotify.com https://player.twitch.tv https://*.notion.site; object-src 'none'; base-uri 'self'; frame-ancestors 'self'");
    $s = sdchq_opt(); $ice = json_decode((string) $s['ice'], true); $app = plugins_url('app/', __FILE__); list(, $furl) = sdchq_files_dir(); $mdl = sdchq_models(); $furl = set_url_scheme($furl);
    $cfg = array('wp' => true, 'ver' => SDCHQ_VER, 'appName' => $s['name'], 'tagline' => $s['tagline'], 'allowSignup' => !empty($s['signup']), 'api' => plugins_url('api.php', __FILE__), 'ajax' => admin_url('admin-ajax.php'),
        'syncMs' => max(300, min(5000, (int) $s['sync'])), 'iceServers' => is_array($ice) && $ice ? $ice : null, 'files' => $furl . '/', 'looks' => sdchq_looks(), 'maxUpload' => (int) min(max(1, (int) $s['maxmb']) * 1048576, wp_max_upload_size()), 'home' => home_url('/'), 'self' => sdchq_url(), 'https' => is_ssl(),
        'lic' => sdchq_public_lic(), 'sw' => home_url('/?hq_sw=1'), 'swScope' => home_url('/'), 'invite' => isset($_GET['invite']) ? preg_replace('/[^A-Za-z0-9]/', '', (string) wp_unslash($_GET['invite'])) : '');
    if (is_user_logged_in()) { $u = wp_get_current_user(); $ses = sdchq_session($u, sdchq_code_role($cfg['invite'])); $cfg['token'] = $ses['token']; $cfg['me'] = $ses['me']; }
    $html = file_get_contents($file);
    $inject = '<link rel="manifest" href="' . esc_url(home_url('/?hq_manifest=1')) . '"><meta name="theme-color" content="#2456ff"><base href="' . esc_url($app) . '"><script>window.OFFICE_CONFIG=' . wp_json_encode($cfg, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_SLASHES) . ';window.OFFICE_ASSETS=' . wp_json_encode($mdl ? $mdl[1] : $app . 'models/', JSON_UNESCAPED_SLASHES) . ';</script>';
    $html = preg_replace('/<head>/i', '<head>' . $inject, $html, 1); $html = preg_replace('/<title>.*?<\/title>/is', '<title>' . esc_html($s['name']) . '</title>', $html, 1);
    echo $html; exit;
}
add_action('init', function () {
    if (isset($_GET['hq_sw'])) { nocache_headers(); header('Content-Type: application/javascript'); header('Service-Worker-Allowed: /');
        echo "const V='sdchq-" . SDCHQ_VER . "',K='/plugins/startdotcom-hq/app/';self.addEventListener('install',e=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',e=>{const r=e.request,u=r.url;if(r.method!=='GET')return;if(u.indexOf(K)>-1){e.respondWith(caches.open(V).then(c=>c.match(r).then(h=>h||fetch(r).then(n=>{if(n.ok)c.put(r,n.clone());return n;}))));}else if(r.mode==='navigate'&&(u.indexOf('hq')>-1)){e.respondWith(fetch(r).then(n=>{const cp=n.clone();caches.open(V).then(c=>c.put('/__shell',cp));return n;}).catch(()=>caches.open(V).then(c=>c.match('/__shell')).then(h=>h||new Response('Offline. Reconnect to open the office.',{status:503}))));}});"; exit; }
    if (isset($_GET['hq_manifest'])) { nocache_headers(); header('Content-Type: application/manifest+json'); $s = sdchq_opt();
        echo wp_json_encode(array('name' => $s['name'], 'short_name' => mb_substr($s['name'], 0, 12), 'start_url' => sdchq_url(), 'scope' => home_url('/'), 'display' => 'standalone', 'background_color' => '#14202e', 'theme_color' => '#2456ff', 'icons' => array(array('src' => plugins_url('app/models/icon.svg', __FILE__), 'sizes' => 'any', 'type' => 'image/svg+xml', 'purpose' => 'any maskable')))); exit; }
    if (is_admin() || (defined('DOING_AJAX') && DOING_AJAX) || (defined('REST_REQUEST') && REST_REQUEST)) { return; }
    $path = trim((string) parse_url(isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '', PHP_URL_PATH), '/'); $home = trim((string) parse_url(home_url(), PHP_URL_PATH), '/');
    if ($home !== '' && strpos($path, $home) === 0) { $path = trim(substr($path, strlen($home)), '/'); }
    if (strpos($path, 'index.php/') === 0) { $path = substr($path, 10); }
    if (isset($_GET['hq']) || $path === sdchq_opt('slug')) { sdchq_render(); }
}, 1);

/* ---------------- WordPress admin screen ---------------- */
add_action('admin_menu', function () { add_menu_page('Zuchera Virtual Office', 'Virtual Office', 'manage_options', 'sdchq', 'sdchq_admin_page', 'dashicons-building', 3); add_submenu_page('sdchq', 'Licence and plan', 'Licence and plan', 'manage_options', 'sdchq-lic', 'sdchq_lic_page'); });
function sdchq_lic_page() {
    if (!current_user_can('manage_options')) { return; }
    if (isset($_POST['sdchq_lic']) && check_admin_referer('sdchq_lic')) { update_option('sdchq_license', trim((string) wp_unslash($_POST['key'])), false); update_option('sdchq_buyurl', esc_url_raw(trim((string) wp_unslash($_POST['buy'])))); sdchq_license(true); echo '<div class="notice notice-success"><p>Saved.</p></div>'; }
    $L = sdchq_license(true); $used = sdchq_seats_used();
    echo '<div class="wrap"><h1>Licence and plan</h1><p><b>Plan:</b> ' . esc_html($L['label']) . ($L['org'] ? ' for ' . esc_html($L['org']) : '') . ' &middot; <b>Seats:</b> ' . (int) $used . ' of ' . ($L['seats'] > 0 ? (int) $L['seats'] : 'unlimited') . ' &middot; <b>Add-ons:</b> ' . esc_html($L['addons'] ? implode(', ', $L['addons']) : 'none') . ' &middot; ' . ($L['wm'] ? 'Zuchera watermark shown' : 'No watermark') . ($L['exp'] ? ' &middot; renews ' . esc_html(date_i18n(get_option('date_format'), $L['exp'])) : '') . '</p>';
    if ($L['why']) { echo '<div class="notice notice-warning inline"><p>' . esc_html($L['why']) . '</p></div>'; }
    echo '<form method="post">'; wp_nonce_field('sdchq_lic'); echo '<p><label><b>Licence key</b><br><textarea name="key" rows="4" style="width:100%;max-width:720px;font-family:monospace">' . esc_textarea((string) get_option('sdchq_license', '')) . '</textarea></label></p><p><label><b>Where people can upgrade (optional link)</b><br><input type="url" name="buy" style="width:100%;max-width:720px" value="' . esc_attr((string) get_option('sdchq_buyurl', '')) . '"></label></p><p><button class="button button-primary" name="sdchq_lic" value="1">Save</button></p></form></div>';
}
add_filter('plugin_action_links_' . plugin_basename(__FILE__), function ($l) { array_unshift($l, '<a href="' . esc_url(admin_url('admin.php?page=sdchq')) . '">Settings</a>', '<a href="' . esc_url(sdchq_url()) . '" target="_blank">Open the office</a>'); return $l; });
register_activation_hook(__FILE__, function () { set_transient('sdchq_welcome', 1, 60); });
add_action('admin_init', function () { if (get_transient('sdchq_welcome') && current_user_can('manage_options') && !isset($_GET['activate-multi'])) { delete_transient('sdchq_welcome'); wp_safe_redirect(admin_url('admin.php?page=sdchq')); exit; } });
function sdchq_admin_page() {
    if (!current_user_can('manage_options')) { return; } global $wpdb;
    if (isset($_POST['sdchq_save']) && check_admin_referer('sdchq_save')) {
        $p = wp_unslash($_POST); $slug = sanitize_title(isset($p['slug']) ? $p['slug'] : 'hq'); $ice = trim(isset($p['ice']) ? (string) $p['ice'] : ''); if ($ice !== '' && !is_array(json_decode($ice, true))) { $ice = ''; echo '<div class="notice notice-error"><p>The call relay setting was not valid JSON, so it was left empty.</p></div>'; }
        update_option('sdchq_settings', array('name' => sanitize_text_field($p['name']), 'tagline' => sanitize_text_field($p['tagline']), 'slug' => $slug ? $slug : 'hq', 'signup' => empty($p['signup']) ? 0 : 1, 'approval' => empty($p['approval']) ? 0 : 1,
            'domains' => sanitize_text_field($p['domains']), 'sync' => max(300, min(5000, (int) $p['sync'])), 'ice' => $ice, 'maxmb' => max(1, min(200, (int) $p['maxmb']))));
        echo '<div class="notice notice-success"><p>Saved.</p></div>';
    }
    $s = sdchq_opt(); $url = sdchq_url(); $n = (int) $wpdb->get_var('SELECT COUNT(*) FROM ' . sdchq_t('members')); $pend = (int) $wpdb->get_var('SELECT COUNT(*) FROM ' . sdchq_t('members') . " WHERE status = 'pending'"); $on = (int) $wpdb->get_var($wpdb->prepare('SELECT COUNT(DISTINCT uid) FROM ' . sdchq_t('pres') . ' WHERE t > %d', time() - 12));
    $lim = min(wp_max_upload_size(), 1 << 40); ?>
    <div class="wrap"><h1>StartDotCom HQ – Virtual Office</h1>
    <div style="background:#fff;border:1px solid #c3c4c7;border-left:4px solid #2456ff;padding:16px 20px;margin:16px 0;max-width:900px">
      <p style="font-size:15px;margin:0 0 8px"><strong>Your office is live at:</strong> <a href="<?php echo esc_url($url); ?>" target="_blank"><?php echo esc_html($url); ?></a></p>
      <p style="margin:0 0 12px">Send this link to your team. They create an account there (no email confirmation needed) and <?php echo $s['approval'] ? 'wait for you to approve them inside the office (Admin → Members), unless their email domain is allowed below' : 'walk straight in'; ?>. You are the owner.</p>
      <a class="button button-primary button-hero" href="<?php echo esc_url($url); ?>" target="_blank">Open the office</a>
      <span style="margin-left:14px;color:#50575e"><?php echo (int) $on; ?> in the office now · <?php echo (int) $n; ?> members<?php echo $pend ? ' · <strong>' . (int) $pend . ' waiting for approval</strong>' : ''; ?></span>
      <?php if (!is_ssl()) { ?><p style="color:#b32d2e;margin:12px 0 0"><strong>Turn on HTTPS (SSL) for this site.</strong> Browsers only allow microphones, cameras and screen sharing on secure https:// pages, so voice and video calls need it. Messages, mail, calendar and documents work either way.</p><?php } ?>
    </div>
    <div style="background:#fff;border:1px solid #c3c4c7;padding:14px 20px;margin:16px 0;max-width:900px"><h2 style="margin-top:0">Realistic people</h2>
      <?php $looks = count(sdchq_looks()); if ($looks) { ?><p><span class="dashicons dashicons-yes-alt" style="color:#1f9d6b"></span> Installed: <?php echo (int) $looks; ?> looks to choose from.</p><?php } else { ?>
      <p>Not installed yet, so people appear as simple figures. Choose <strong>startdotcom-hq-people.zip</strong> below. It uploads in small pieces, so your host's upload limit does not matter.</p><?php } ?>
      <p><input type="file" id="sdchq_pack" accept=".zip"> <button type="button" class="button" id="sdchq_pack_go"><?php echo $looks ? 'Replace the people pack' : 'Upload the people pack'; ?></button> <span id="sdchq_pack_msg" style="margin-left:8px"></span></p>
      <progress id="sdchq_pack_bar" max="1" value="0" style="width:100%;display:none"></progress>
      <script>(function(){var go=document.getElementById('sdchq_pack_go'),inp=document.getElementById('sdchq_pack'),msg=document.getElementById('sdchq_pack_msg'),bar=document.getElementById('sdchq_pack_bar');
        go.addEventListener('click',async function(){var f=inp.files[0];if(!f){msg.textContent='Choose the zip file first.';return;}var size=524288,n=Math.max(1,Math.ceil(f.size/size));go.disabled=true;bar.style.display='block';
          try{for(var i=0;i<n;i++){var fd=new FormData();fd.append('action','sdchq_pack');fd.append('nonce',<?php echo wp_json_encode(wp_create_nonce('sdchq_pack')); ?>);fd.append('i',i);fd.append('n',n);fd.append('chunk',f.slice(i*size,(i+1)*size),'part');
            var r=null;for(var t=0;t<3&&!r;t++){try{r=await fetch(ajaxurl,{method:'POST',credentials:'same-origin',body:fd}).then(function(x){return x.json();});}catch(e){r=null;}}
            if(!r||!r.ok)throw new Error(r&&r.err||'The upload was interrupted. Try again.');bar.value=(i+1)/n;msg.textContent='Uploading… '+Math.round((i+1)/n*100)+'%';
            if(r.done){msg.textContent='Done: '+r.looks+' looks installed. Reloading…';setTimeout(function(){location.reload();},900);}}}
          catch(e){msg.textContent=e.message;go.disabled=false;}});})();</script></div>
    <form method="post"><?php wp_nonce_field('sdchq_save'); ?><table class="form-table" role="presentation" style="max-width:900px">
      <tr><th><label for="sd_name">Office name</label></th><td><input id="sd_name" name="name" class="regular-text" value="<?php echo esc_attr($s['name']); ?>"></td></tr>
      <tr><th><label for="sd_tag">Line under the name</label></th><td><input id="sd_tag" name="tagline" class="regular-text" value="<?php echo esc_attr($s['tagline']); ?>"></td></tr>
      <tr><th><label for="sd_slug">Address</label></th><td><code><?php echo esc_html(home_url('/')); ?></code><input id="sd_slug" name="slug" style="width:120px" value="<?php echo esc_attr($s['slug']); ?>"><p class="description">Also always reachable at <code><?php echo esc_html(add_query_arg('hq', '1', home_url('/'))); ?></code></p></td></tr>
      <tr><th>Who can join</th><td><label><input type="checkbox" name="signup" value="1" <?php checked($s['signup']); ?>> Anyone with the link can create an account</label><br><label><input type="checkbox" name="approval" value="1" <?php checked($s['approval']); ?>> New accounts wait for an admin to approve them</label>
        <p><label for="sd_dom">Approve these email domains automatically</label><br><input id="sd_dom" name="domains" class="regular-text" placeholder="yourcompany.com, partner.com" value="<?php echo esc_attr($s['domains']); ?>"></p>
        <p class="description">With sign-ups off, people join only through invite links or email invitations you create inside the office (Admin → Members).</p></td></tr>
      <tr><th><label for="sd_sync">Live update speed</label></th><td><select id="sd_sync" name="sync"><?php foreach (array(500 => 'Smoothest (every 0.5s, more server load)', 800 => 'Balanced (every 0.8s)', 1500 => 'Light (every 1.5s, for busy shared hosting)', 2500 => 'Lightest (every 2.5s)') as $v => $l) { echo '<option value="' . (int) $v . '"' . selected((int) $s['sync'], $v, false) . '>' . esc_html($l) . '</option>'; } ?></select><p class="description">How often each open office checks for movement and messages. If your host complains about load, pick a lighter setting.</p></td></tr>
      <tr><th><label for="sd_max">Largest shared file</label></th><td><input id="sd_max" name="maxmb" type="number" min="1" max="200" style="width:80px" value="<?php echo (int) $s['maxmb']; ?>"> MB <span class="description">(this server accepts up to <?php echo esc_html(size_format($lim)); ?> per upload)</span></td></tr>
      <tr><th><label for="sd_ice">Call relay (optional)</label></th><td><textarea id="sd_ice" name="ice" rows="3" class="large-text code" placeholder='[{"urls":"stun:stun.l.google.com:19302"},{"urls":"turn:turn.example.com:443?transport=tcp","username":"user","credential":"pass"}]'><?php echo esc_textarea($s['ice']); ?></textarea><p class="description">Leave empty. Only add a TURN relay here if some people on strict company networks cannot hear each other on calls.</p></td></tr>
    </table><p><button class="button button-primary" name="sdchq_save" value="1">Save settings</button> <a class="button" href="<?php echo esc_url(wp_nonce_url(admin_url('admin-post.php?action=sdchq_backup'), 'sdchq_backup')); ?>">Download a backup (JSON)</a></p></form>
    <p class="description" style="max-width:900px">Everything lives in this WordPress site: accounts are WordPress users, messages and documents are in your database, files are in <code>wp-content/uploads/sdchq</code>. Calls go directly between your team's browsers and are not recorded. People in the office: Microsoft Rocketbox avatars (MIT licence).</p></div><?php
}
add_action('admin_post_sdchq_backup', function () {
    if (!current_user_can('manage_options') || !check_admin_referer('sdchq_backup')) { wp_die('Not allowed.'); } global $wpdb;
    $docs = array(); foreach ((array) $wpdb->get_results('SELECT path, data FROM ' . sdchq_t('docs') . ' WHERE del = 0', ARRAY_A) as $r) { $docs[$r['path']] = json_decode($r['data'], true); }
    nocache_headers(); header('Content-Type: application/json; charset=utf-8'); header('Content-Disposition: attachment; filename="startdotcom-hq-backup-' . gmdate('Y-m-d') . '.json"');
    echo wp_json_encode(array('exported' => gmdate('c'), 'site' => home_url('/'), 'members' => $wpdb->get_results('SELECT uid, status, role, name, email FROM ' . sdchq_t('members'), ARRAY_A), 'docs' => $docs)); exit;
});
