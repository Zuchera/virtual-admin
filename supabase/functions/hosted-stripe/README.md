# Test a hosted workspace purchase

Use only Zuchera Staging (project ref `csrccgwdixgctzabzghd`) and a Stripe test sandbox. The hosted workspace migration has already been applied to that project through SQL Editor. Do not rerun it there.

## Set up the staging endpoint

1. In Stripe test mode, create a product with a recurring Price. Copy its `price_…` ID. Use quantity one for the whole plan. Pick a seat allowance such as 2 (owner plus one teammate).
2. In Supabase Staging, go to **Edge Functions → Secrets**. Add `ZUCHERA_STRIPE_TEST_KEY` (a test Stripe key with permission to create/read Checkout Sessions and read subscriptions), `ZUCHERA_STRIPE_TEST_PRICE`, `ZUCHERA_STRIPE_TEST_SEATS`, and `ZUCHERA_STAGING_RETURN_URL` (a staging HTTPS page). Add the webhook signing secret in step 4.
3. From this PR branch, deploy the function with the Supabase CLI:
   
   ```sh
   supabase functions deploy hosted-stripe --project-ref csrccgwdixgctzabzghd --no-verify-jwt
   ```
   
   Stripe must be able to reach the function without a Supabase JWT. The function verifies Stripe webhook signatures itself and requires a verified Supabase user token to create a Checkout Session.
4. Add a test webhook destination in Stripe for `https://csrccgwdixgctzabzghd.supabase.co/functions/v1/hosted-stripe`. Subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Save that destination's `whsec_…` value as `ZUCHERA_STRIPE_WEBHOOK_SECRET` in Supabase Staging. Enter secrets directly in the dashboard.

## Run a test purchase

1. Sign in as a verified staging Supabase Auth user. Obtain that user's access token through the staging test client and set it as `ZUCHERA_STAGING_USER_TOKEN` in your shell.
2. Generate a fresh UUID for this checkout attempt and set it as `ZUCHERA_CHECKOUT_ATTEMPT`. Reuse it only when retrying the same attempt.
3. Request the Checkout URL:

   ```sh
   curl --fail-with-body -X POST \
     -H "Authorization: Bearer $ZUCHERA_STAGING_USER_TOKEN" \
     -H "Idempotency-Key: $ZUCHERA_CHECKOUT_ATTEMPT" \
     https://csrccgwdixgctzabzghd.supabase.co/functions/v1/hosted-stripe
   ```

4. Open the returned URL and complete Stripe test Checkout. Confirm the event delivery shows HTTP 200. In Supabase, verify the Stripe subscription ID has one subscription and one workspace, the signed-in user's UUID is the owner, and the seat limit matches the setting. Resend the same event in Stripe and verify the workspace count for that subscription stays at one.

This test uses a single configured recurring Price and the app-side Supabase identity. WordPress checkout wiring, the hosted account screens, and subscription changes after checkout (including cancellation and seat changes) still need implementation before live use.
