<?php
/* Removing the plugin keeps your office data by default, so a re-install picks up where you left off.
   To wipe everything, add  define('SDCHQ_DELETE_DATA', true);  to wp-config.php before deleting the plugin. */
if (!defined('WP_UNINSTALL_PLUGIN')) { exit; }
if (defined('SDCHQ_DELETE_DATA') && SDCHQ_DELETE_DATA) {
    global $wpdb; foreach (array('docs', 'pres', 'ev', 'members') as $t) { $wpdb->query('DROP TABLE IF EXISTS ' . $wpdb->prefix . 'sdchq_' . $t); }
    foreach (array('sdchq_secret', 'sdchq_settings', 'sdchq_invites', 'sdchq_codes', 'sdchq_dbver') as $o) { delete_option($o); }
}
