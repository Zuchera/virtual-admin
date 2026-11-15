ZUCHERA LICENSING TOOLS  (keep private: this folder can create licences)

1. Issue a licence key:
   node issue-license.js --org "Acme Ltd" --tier team --seats 30 --days 365 --site acme.com
   Tiers: starter (5 seats, watermark) | team (30, build) | business (100, build+ai+media+record) | enterprise (unlimited, all)
   Options: --addons ai,media,record,build,multi   --nowm (remove watermark)   --site (lock to one website)   --days (expiry; omit = never)
2. Customer pastes the key in WordPress > Virtual Office > Licence and plan.
3. Never share zuchera-private-key.pem. Back it up offline. If lost you cannot issue new keys; if leaked, rotate: make a new keypair and ship a new plugin build.
Note: the plugin is self-hosted PHP, so a determined customer could edit it to remove the watermark or limits. Keys stop casual copying; for hard enforcement, host offices for customers on your own server.

DEMO KEYS (walkthrough as a paying customer; paste at Plans > Have a licence key, or WordPress > Virtual Office > Licence)
 internal   : Zuchera staff, unlimited, no watermark  -> keys in zuchera-demo-keys.txt
 business   : 100 seats, all advanced features
 enterprise : unlimited, multi-floor, white label
