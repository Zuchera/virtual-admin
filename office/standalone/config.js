/* Your office settings. This is the only file you need to edit. */
window.OFFICE_CONFIG = {
  appName: 'StartDotCom HQ',                 // shown on the sign-in screen
  tagline: 'Sign in to walk into the office.',
  supabaseUrl: '',                           // Supabase > Project Settings > API > Project URL, e.g. https://abcd1234.supabase.co
  supabaseAnonKey: '',                       // Supabase > Project Settings > API > anon public key
  workspace: 'startdotcom',                  // one name per company (letters, numbers, dashes). Another company = another name.
  allowSignup: true,                         // false = invitation only
  microsoft: false,                          // true once "Azure" sign-in is set up in Supabase (see README)
  presenceMs: 250,                           // how often movement is sent; raise to 400 on the free Supabase plan with 30+ people
  iceServers: null                           // calls: leave null to use Google's free STUN servers. For people behind strict company
                                             // firewalls add a TURN server, e.g. [{ urls: 'stun:stun.l.google.com:19302' },
                                             // { urls: 'turn:YOUR.TURN.HOST:443?transport=tcp', username: '...', credential: '...' }]
};
