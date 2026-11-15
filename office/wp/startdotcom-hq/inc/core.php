<?php
/* StartDotCom HQ: shared server logic. Used by api.php (fast path) and by admin-ajax (fallback). Needs only $wpdb and get_option(). */
if (!defined('ABSPATH')) { exit; }

require_once __DIR__ . '/license.php';
function sdchq_t($n) { global $wpdb; return $wpdb->prefix . 'sdchq_' . $n; }
function sdchq_b64e($s) { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function sdchq_b64d($s) { return base64_decode(strtr($s, '-_', '+/')); }
function sdchq_secret() { return (string) get_option('sdchq_secret', ''); }
function sdchq_token_make($uid, $ttl = 43200) {
    $p = sdchq_b64e(json_encode(array('u' => (int) $uid, 'e' => time() + $ttl)));
    return $p . '.' . sdchq_b64e(hash_hmac('sha256', $p, sdchq_secret(), true));
}
function sdchq_token_uid($tok) {
    $sec = sdchq_secret(); if ($sec === '' || !is_string($tok) || strpos($tok, '.') === false) { return 0; }
    list($p, $sig) = explode('.', $tok, 2);
    if (!hash_equals(sdchq_b64e(hash_hmac('sha256', $p, $sec, true)), $sig)) { return 0; }
    $d = json_decode(sdchq_b64d($p), true);
    if (!is_array($d) || empty($d['u']) || empty($d['e']) || $d['e'] < time()) { return 0; }
    return (int) $d['u'];
}
function sdchq_member($uid) {
    global $wpdb;
    return $wpdb->get_row($wpdb->prepare('SELECT uid, status, role, name, email FROM ' . sdchq_t('members') . ' WHERE uid = %d', $uid), ARRAY_A);
}
function sdchq_out($a, $code = 200) {
    if (!headers_sent()) { http_response_code($code); header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store'); header('X-Content-Type-Options: nosniff'); }
    echo json_encode($a); exit;
}
function sdchq_body() {
    $raw = file_get_contents('php://input'); if (strlen($raw) > 3000000) { sdchq_out(array('ok' => false, 'err' => 'too_big'), 413); }
    $b = json_decode($raw, true); return is_array($b) ? $b : array();
}
/* who may see a document: mail goes to its sender and recipients, direct messages to the people in that conversation */
function sdchq_can_read($col, $data, $me, &$threads) {
    global $wpdb;
    if ($col === 'mail') { $to = isset($data['to']) && is_array($data['to']) ? $data['to'] : array(); return (isset($data['by']) && $data['by'] === $me) || in_array($me, $to, true) || in_array('*', $to, true); }
    if ($col === 'sops') { $v = isset($data['vis']) ? $data['vis'] : 'private'; if ($v === 'public') { return true; } $to = isset($data['to']) && is_array($data['to']) ? $data['to'] : array(); return (isset($data['by']) && $data['by'] === $me) || in_array($me, $to, true); }
    if ($col === 'dms') {
        if ($threads === null) { $threads = array(); foreach ((array) $wpdb->get_results("SELECT path, data FROM " . sdchq_t('docs') . " WHERE col = 'threads' AND del = 0", ARRAY_A) as $r) { $d = json_decode($r['data'], true); $threads[substr($r['path'], 8)] = isset($d['mem']) && is_array($d['mem']) ? $d['mem'] : array(); } }
        $th = isset($data['th']) ? (string) $data['th'] : ''; return isset($threads[$th]) && in_array($me, $threads[$th], true);
    }
    return true;
}
/* one round trip: my presence, my outgoing events and writes go up; everyone's presence, new events and changed documents come back */
function sdchq_sync($b) {
    global $wpdb;
    $uid = sdchq_token_uid(isset($b['tok']) ? $b['tok'] : ''); if (!$uid) { sdchq_out(array('ok' => false, 'err' => 'auth'), 401); }
    $m = sdchq_member($uid); if (!$m) { sdchq_out(array('ok' => false, 'err' => 'auth'), 401); }
    if ($m['status'] !== 'approved') { sdchq_out(array('ok' => false, 'err' => 'status', 'status' => $m['status'])); }
    if (!sdchq_seat_ok($uid)) { sdchq_out(array('ok' => false, 'err' => 'status', 'status' => 'full')); }
    $me = 'u' . $uid; $admin = ($m['role'] === 'owner' || $m['role'] === 'admin'); $now = time();
    $peer = isset($b['peer']) && is_string($b['peer']) && preg_match('/^u\d+:[a-z0-9]{4,12}$/', $b['peer']) && strpos($b['peer'], $me . ':') === 0 ? $b['peer'] : '';
    if ($peer === '') { sdchq_out(array('ok' => false, 'err' => 'peer'), 400); }
    $T = sdchq_t('docs'); $P = sdchq_t('pres'); $E = sdchq_t('ev');

    /* writes */
    $denied = array();
    if (!empty($b['w']) && is_array($b['w'])) {
        foreach (array_slice($b['w'], 0, 200) as $w) {
            $path = isset($w['path']) ? (string) $w['path'] : '';
            if (!preg_match('#^([a-z0-9_]{1,32})/([A-Za-z0-9_.~:-]{1,150})$#', $path, $mm)) { $denied[] = $path; continue; }
            $col = $mm[1]; $id = $mm[2];
            if ((in_array($col, array('office', 'grades', 'courses', 'breakout'), true) && !$admin) || ($col === 'people' && $id !== $me && !$admin)) { $denied[] = $path; continue; }
            if ($col === 'sops' && !$admin) { $dd = isset($w['data']) && is_array($w['data']) ? $w['data'] : null; if ($dd !== null && (!isset($dd['vis']) || $dd['vis'] !== 'private')) { $denied[] = $path; continue; } }
            /* a person's own marks (read state, replies to invitations, votes, reactions) can only be written by that person */
            if (in_array($col, array('mailst', 'rsvp', 'pv'), true) && substr($id, -strlen('~' . $me)) !== '~' . $me) { $denied[] = $path; continue; }
            if ($col === 'rx' && strpos($id, '~' . $me . '~') === false) { $denied[] = $path; continue; }
            /* a person's own lesson video/screen slot and race ranking can only be written by that person */
            if (!$admin && (($col === 'lesson' && preg_match('/^(v|sub|at|gs|nt|rd|rq)_/', $id) && substr($id, -strlen('_' . $me)) !== '_' . $me) || ($col === 'games' && strpos($id, 'rk_') === 0 && substr($id, -strlen('_' . $me)) !== '_' . $me))) { $denied[] = $path; continue; }
            /* messages, mail and calendar events can only be changed or deleted by their author or an admin */
            if (!$admin && in_array($col, array('chat', 'dms', 'mail', 'cal', 'sops'), true)) {
                $owner = $wpdb->get_var($wpdb->prepare("SELECT byuid FROM $T WHERE path = %s AND del = 0", $path));
                if ($owner !== null && (int) $owner !== $uid) { $denied[] = $path; continue; }
            }
            $del = !array_key_exists('data', $w) || $w['data'] === null;
            $json = $del ? 'null' : json_encode($w['data']);
            if ($json === false || strlen($json) > 600000) { $denied[] = $path; continue; }
            $by = $uid; if ($admin && !$del) { $o = $wpdb->get_var($wpdb->prepare("SELECT byuid FROM $T WHERE path = %s AND del = 0", $path)); if ($o) { $by = (int) $o; } }   // an admin's edit keeps the original author
            $wpdb->replace($T, array('path' => $path, 'col' => $col, 'data' => $json, 'del' => $del ? 1 : 0, 'byuid' => $by, 't' => $now), array('%s', '%s', '%s', '%d', '%d', '%d'));
        }
    }
    /* events (pings, call setup) */
    if (!empty($b['ev']) && is_array($b['ev'])) {
        foreach (array_slice($b['ev'], 0, 120) as $e) {
            $topic = isset($e['topic']) ? substr(preg_replace('/[^a-z0-9_]/', '', (string) $e['topic']), 0, 32) : ''; if ($topic === '') { continue; }
            $data = json_encode(isset($e['data']) ? $e['data'] : null); if ($data === false || strlen($data) > 60000) { continue; }
            $dest = isset($e['to']) && is_string($e['to']) && preg_match('/^u\d+:[a-z0-9]{4,12}$/', $e['to']) ? $e['to'] : '';
            $wpdb->insert($E, array('topic' => $topic, 'dest' => $dest, 'data' => $data, 'peer' => $peer, 't' => $now), array('%s', '%s', '%s', '%s', '%d'));
        }
    }
    if (!empty($b['bye'])) { $wpdb->delete($P, array('peer' => $peer)); sdchq_out(array('ok' => true)); }
    /* presence */
    $pj = json_encode(isset($b['p']) && is_array($b['p']) ? $b['p'] : new stdClass());
    if ($pj !== false && strlen($pj) < 20000) { $wpdb->replace($P, array('peer' => $peer, 'uid' => $uid, 'data' => $pj, 't' => $now), array('%s', '%d', '%s', '%d')); }
    $peers = array();
    foreach ((array) $wpdb->get_results($wpdb->prepare("SELECT peer, uid, data FROM $P WHERE t > %d", $now - 12), ARRAY_A) as $r) {
        if ($r['peer'] === $peer) { continue; } $d = json_decode($r['data'], true);
        $peers[] = array('peer' => $r['peer'], 'uid' => 'u' . $r['uid'], 'p' => is_array($d) && $d ? $d : new stdClass());
    }
    /* events for me */
    $ec = isset($b['ec']) ? (int) $b['ec'] : -1; $evs = array();
    if ($ec < 0) { $ec = (int) $wpdb->get_var("SELECT MAX(id) FROM $E"); }
    else {
        foreach ((array) $wpdb->get_results($wpdb->prepare("SELECT id, topic, data, peer FROM $E WHERE id > %d AND peer <> %s AND (dest = '' OR dest = %s) ORDER BY id LIMIT 300", $ec, $peer, $peer), ARRAY_A) as $r) {
            $by = 'u' . (int) substr($r['peer'], 1); $evs[] = array('topic' => $r['topic'], 'data' => json_decode($r['data'], true), 'peer' => $r['peer'], 'by' => $by);
        }
        $mx = (int) $wpdb->get_var("SELECT MAX(id) FROM $E"); if ($mx > $ec) { $ec = $mx; }
    }
    /* documents changed since my cursor (a small overlap covers writes that landed out of order) */
    $rc = isset($b['rc']) ? max(0, (int) $b['rc']) : 0; $docs = array(); $threads = null; $max = $rc;
    $rows = $rc === 0 ? $wpdb->get_results("SELECT rev, path, col, data, del FROM $T WHERE del = 0 ORDER BY rev LIMIT 20000", ARRAY_A)
                      : $wpdb->get_results($wpdb->prepare("SELECT rev, path, col, data, del FROM $T WHERE rev > %d ORDER BY rev LIMIT 4000", max(0, $rc - 25)), ARRAY_A);
    foreach ((array) $rows as $r) {
        $rev = (int) $r['rev']; if ($rev > $max) { $max = $rev; }
        if ((int) $r['del']) { $docs[] = array('path' => $r['path'], 'del' => 1); continue; }
        $d = json_decode($r['data'], true);
        if ($r['col'] === 'grades' && !$admin && $r['path'] !== 'grades/' . $me) { continue; }
        if (($r['col'] === 'mail' || $r['col'] === 'dms' || $r['col'] === 'sops') && !sdchq_can_read($r['col'], is_array($d) ? $d : array(), $me, $threads)) { continue; }
        $docs[] = array('path' => $r['path'], 'data' => $d);
    }
    if ($rc === 0) { $mx = (int) $wpdb->get_var("SELECT MAX(rev) FROM $T"); if ($mx > $max) { $max = $mx; } }
    /* housekeeping, now and then */
    if (mt_rand(1, 60) === 1) {
        $wpdb->query($wpdb->prepare("DELETE FROM $P WHERE t < %d", $now - 120));
        $wpdb->query($wpdb->prepare("DELETE FROM $E WHERE t < %d", $now - 90));
        $wpdb->query($wpdb->prepare("DELETE FROM $T WHERE del = 1 AND t < %d", $now - 172800));
    }
    sdchq_out(array('ok' => true, 'peers' => $peers, 'ev' => $evs, 'docs' => $docs, 'rc' => $max, 'ec' => $ec, 'role' => $m['role'], 'denied' => $denied, 'now' => $now));
}
