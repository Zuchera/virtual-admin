# StartDotCom HQ: your virtual office

A 3D office in the browser for remote teams: realistic people, live presence, chat, meetings, boards, games and Teams links.
This folder is the complete website. There is nothing to build: upload it, add two settings, and it runs.

## What you need (about 20 minutes, once)
1. A free **Supabase** account (https://supabase.com). It provides sign-in, the live database and file storage.
2. Somewhere to host the folder: **Vercel** (free) or your **WordPress** hosting.

## Step 1: Set up Supabase
1. Create a new project in Supabase. Pick a region near your team (for the UK: London, eu-west-2).
2. Open **SQL Editor → New query**, paste everything from `schema.sql`, and click **Run**.
3. Open **Project Settings → API**. Copy the **Project URL** and the **anon public** key.
4. Open **Authentication → URL Configuration** and set **Site URL** to the address where the office will live
   (for example `https://office.startdotcom.co.uk`). Add the same address under **Redirect URLs**.
5. Optional, recommended: **Authentication → Sessions**: set an inactivity timeout (for example 8 hours) so people must sign in again each day.

## Step 2: Add your settings
Open `config.js` in any text editor and paste the Project URL and anon key. Set `workspace` to a short name for your company.
The anon key is designed to be public; your data is protected by the security rules in `schema.sql`.

## Step 3: Upload
**Vercel:** sign in at vercel.com → Add New → Project → drag this folder in (or `npx vercel deploy` inside it). Done.
**WordPress (cPanel or similar):** with File Manager or FTP, upload the whole folder to `public_html/office/`.
The office is then at `https://yourdomain.com/office/`. The included `.htaccess` sets the right file types.
To show it inside a WordPress page, add a Custom HTML block: `<iframe src="/office/" style="width:100%;height:85vh;border:0" allow="clipboard-write"></iframe>`

## Step 4: First sign-in
The **first person to create an account becomes the owner** and is let in straight away. Do this yourself first.
Everyone else waits in reception until an admin approves them, unless you invited their email
(Admin → Members and approvals → Invite by email) or their email domain is on your allowed list (Admin → Access and security).

## Microsoft sign-in (optional)
1. In the Azure portal, register an app (Microsoft Entra ID → App registrations → New). Redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`.
2. Create a client secret. In Supabase → Authentication → Providers → Azure, paste the Application (client) ID, the secret, and your tenant URL.
3. Set `microsoft: true` in `config.js`.

## Calls and messages without Microsoft

Everything people need to talk is built in, so the office keeps working when Microsoft 365 or Teams is down:

- **💬 Talk** (top bar, or Ctrl+K): channels (#general, #announcements, #random, #help-desk and any you create), direct and group chats, files, reactions, replies, pins, @mentions, search, and desktop notifications.
- **🎧 Voice**: talk to whoever is standing near you, like a real office. Volume fades with distance.
- **📞 Call / 🎥 Video call** on anyone's card: rings them and opens a voice or video call with screen sharing. You can add more people.
- **Room calls**: in a meeting room, open the wall screen and choose *Join room call*. A shared screen shows on the room's wall.
- **🎙 Talk** (hold, or hold T): speak a message to the people in your area.

Calls go browser to browser over WebRTC. The office only passes the connection setup through your Supabase realtime channel, so no audio or video is stored. To connect, browsers use Google's free STUN servers by default. Most home and office networks work with that. If people on strict company networks can't hear each other, add a TURN server in `config.js` under `iceServers`. Cloudflare Calls TURN, Twilio and Metered all offer TURN, and Metered has a free tier.

Calls are a mesh, so each person sends to everyone else. That works well for up to about 8 people in a call. For bigger all-hands meetings, use #announcements plus a room call per team.

When Microsoft is down, an admin can open **Admin → Communication → "Microsoft is down: switch everyone over"**. That hides the Teams buttons, shows a notice at the top of everyone's screen and posts in #announcements.

## Another company on the same setup
Copy this folder, change `workspace` in `config.js` to a new name, and upload it to a new address. Each workspace has its own people, owner and data.

## Good to know
- **Performance:** each person's 3D model (about 0.8 MB) loads only when someone chooses it, then stays cached. Graphics quality (Lite, Standard, High) is in Settings.
- **Live movement:** on the free Supabase plan, keep `presenceMs` at 400 for 30+ people online at once, or upgrade to Pro.
- **Voice and video** run through Microsoft Teams links (people, rooms and the team call link). The office has no microphone access.
- **Files** uploaded to the Team Drive are stored in Supabase Storage with unguessable addresses; don't upload highly confidential documents.
- **People models:** Microsoft Rocketbox Avatar Library, MIT licence (see `models/LICENSE-Rocketbox.txt`). Keep that notice when redistributing.
