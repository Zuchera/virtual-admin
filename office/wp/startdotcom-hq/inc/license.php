<?php
/* Zuchera licensing: signed keys (Ed25519) set the plan, seat limit, add-ons and whether the Zuchera watermark shows. */
if (!defined('ABSPATH') && !defined('SHORTINIT')) { exit; }
define('SDCHQ_PUB', 'hE26P1ziIx/WWA50kTc6owcr9/FoBhqCaF0NR7Oailc=');
function sdchq_features() { return array('build', 'media', 'ai', 'record', 'apps', 'photo', 'multi', 'brand', 'suites'); }
function sdchq_tiers() {
    return array(
        'starter'    => array('label' => 'Starter', 'seats' => 5,  'addons' => array(), 'wm' => true, 'price' => 10),
        'team'       => array('label' => 'Team', 'seats' => 30, 'addons' => array('build', 'media'), 'wm' => false, 'price' => 30),
        'business'   => array('label' => 'Business', 'seats' => 100, 'addons' => array('build', 'media', 'ai', 'record', 'apps', 'photo', 'suites'), 'wm' => false, 'price' => 50),
        'enterprise' => array('label' => 'Enterprise', 'seats' => 0, 'addons' => sdchq_features(), 'wm' => false, 'price' => 0),
        'internal'   => array('label' => 'Zuchera (internal)', 'seats' => 0, 'addons' => sdchq_features(), 'wm' => false, 'price' => 0),
    );
}
function sdchq_b64u_dec($s) { return base64_decode(strtr($s, '-_', '+/')); }
function sdchq_license($fresh = false) {
    static $L = null; if ($L !== null && !$fresh) { return $L; }
    $T = sdchq_tiers(); $L = array('tier' => 'starter', 'label' => 'Starter', 'seats' => $T['starter']['seats'], 'addons' => array(), 'wm' => true, 'org' => '', 'valid' => false, 'why' => '', 'exp' => 0);
    $k = trim((string) get_option('sdchq_license', ''));
    if ($k === '') {   /* no key: a 14 day trial with every feature and the watermark, then Starter */
        $t0 = (int) get_option('sdchq_trial0', 0); if (!$t0) { $t0 = time(); update_option('sdchq_trial0', $t0, false); }
        $left = (int) ceil(($t0 + 14 * 86400 - time()) / 86400);
        if ($left > 0) { $L = array('tier' => 'trial', 'label' => 'Free trial', 'seats' => 100, 'addons' => sdchq_features(), 'wm' => true, 'org' => '', 'valid' => false, 'why' => '', 'exp' => $t0 + 14 * 86400, 'trial' => $left); }
        else { $L['why'] = 'Your 14 day trial has ended. Choose a plan to keep your features.'; }
        return $L;
    }
    $p = explode('.', $k); if (count($p) !== 2) { $L['why'] = 'Key not recognised.'; return $L; }
    if (!function_exists('sodium_crypto_sign_verify_detached')) { $L['why'] = 'This server cannot verify keys (PHP sodium missing).'; return $L; }
    $sig = sdchq_b64u_dec($p[1]);
    if (strlen($sig) !== SODIUM_CRYPTO_SIGN_BYTES || !sodium_crypto_sign_verify_detached($sig, $p[0], base64_decode(SDCHQ_PUB))) { $L['why'] = 'Key is not valid.'; return $L; }
    $d = json_decode(sdchq_b64u_dec($p[0]), true); if (!is_array($d) || !isset($T[$d['tier'] ?? ''])) { $L['why'] = 'Key is not valid.'; return $L; }
    if (!empty($d['exp']) && $d['exp'] < time()) { $L['why'] = 'This licence expired. Renew it to keep your plan.'; return $L; }
    if (!empty($d['site']) && strcasecmp($d['site'], preg_replace('/^www\./i', '', (string) parse_url((string) get_option('home'), PHP_URL_HOST))) !== 0) { $L['why'] = 'This key is for a different website.'; return $L; }
    $t = $T[$d['tier']]; $ad = array_values(array_unique(array_merge($t['addons'], array_map('strval', (array) ($d['addons'] ?? array())))));
    $L = array('tier' => $d['tier'], 'label' => $t['label'], 'seats' => isset($d['seats']) && (int) $d['seats'] > 0 ? (int) $d['seats'] : $t['seats'], 'addons' => $ad, 'wm' => array_key_exists('wm', $d) && $d['wm'] === false ? false : $t['wm'], 'org' => (string) ($d['org'] ?? ''), 'valid' => true, 'why' => '', 'exp' => (int) ($d['exp'] ?? 0));
    return $L;
}
/* seats: the owner and the earliest-approved people fill the plan; anyone beyond it waits with a clear message */
function sdchq_seat_ok($uid) {
    global $wpdb; $L = sdchq_license(); if ($L['seats'] <= 0) { return true; } $T = sdchq_t('members');
    $m = $wpdb->get_row($wpdb->prepare("SELECT role, created FROM $T WHERE uid = %d", $uid), ARRAY_A); if (!$m || $m['role'] === 'owner') { return true; }
    $rank = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $T WHERE status = 'approved' AND role <> 'owner' AND (created < %d OR (created = %d AND uid < %d))", $m['created'], $m['created'], $uid));
    return $rank + 1 < $L['seats'];
}
function sdchq_seats_used() { global $wpdb; $T = sdchq_t('members'); return (int) $wpdb->get_var("SELECT COUNT(*) FROM $T WHERE status = 'approved'"); }
