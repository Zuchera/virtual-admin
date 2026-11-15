ZUCHERA BILLING PORTAL (runs on Zuchera's own server, never on a customer's)
1. Create the three plans in Stripe is NOT needed: prices are created per checkout in GBP (Starter £10, Teams £30, Business £50 monthly).
2. Set env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, PORTAL_URL (public https address), LICENSE_KEY_FILE.
3. node server.js (Node 18+). Point a Stripe webhook at PORTAL_URL/webhook for: checkout.session.completed, customer.subscription.deleted.
4. In each office: WordPress > Virtual Office > Licence shows "Upgrade" buttons that open PORTAL_URL/checkout. After payment the office calls /claim?site= and activates itself.
5. Licences issued here last 35 days and renew on the next claim while the subscription is paid. Enterprise is issued by hand with tools/issue-license.js.
