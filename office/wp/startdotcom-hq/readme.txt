=== StartDotCom HQ – Virtual Office ===
Requires at least: 5.6
Tested up to: 6.8
Requires PHP: 7.2
Stable tag: 8.0.0
License: GPLv2 or later

A 3D virtual office for your team that runs entirely inside your own WordPress site.

== Install (2 minutes, no FTP, no other services) ==

1. In WordPress admin go to Plugins > Add New > Upload Plugin.
2. Choose startdotcom-hq.zip, click Install Now, then Activate.
3. You land on the "Virtual Office" screen. Click "Open the office". You are the owner.
4. Send the office link to your team. They create an account on that page and you approve them
   inside the office (Admin > Members), or you send them an invite link.

If the upload says the file is too large: your host limits upload size. Either raise
"upload_max_filesize" and "post_max_size" to 16M (cPanel > MultiPHP INI Editor, or ask your host),
or upload startdotcom-hq-lite.zip instead (same office, 8 avatar looks instead of 20).

== What is inside ==

* Talk: channels, direct and group chats, files, polls, voice notes, reactions, @mentions, search
* Workspace: HQ Mail, Calendar with invitations and reminders, shared Documents, Continuity centre
* Voice and video: nearby voice, calls with screen sharing, meeting-room calls (needs HTTPS)
* 3D office: desks, private offices, meeting rooms, boards, games, realistic people

== Good to know ==

* Accounts are WordPress users (role: Subscriber). No confirmation emails are sent or needed.
* Admins reset passwords inside the office. WordPress administrators are office admins automatically.
* Data: your WordPress database (tables wp_sdchq_*). Files: wp-content/uploads/sdchq.
* Calls go directly between browsers and are not recorded. On strict company networks add a TURN
  relay under Virtual Office > Call relay.
* Voice, video and screen sharing need the site to use HTTPS.
* If your host limits server load, choose a lighter "Live update speed" in the settings.
* Deleting the plugin keeps your data. To erase it too, add define('SDCHQ_DELETE_DATA', true);
  to wp-config.php before deleting.
* Avatars: Microsoft Rocketbox (MIT licence). 3D engine: three.js (MIT licence).
