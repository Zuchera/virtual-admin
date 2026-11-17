import Stripe from "npm:stripe@23.1.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const key = Deno.env.get("ZUCHERA_STRIPE_TEST_KEY") ?? "";
const signingSecret = Deno.env.get("ZUCHERA_STRIPE_WEBHOOK_SECRET") ?? "";
const priceId = Deno.env.get("ZUCHERA_STRIPE_TEST_PRICE") ?? "";
const seatLimit = Number(Deno.env.get("ZUCHERA_STRIPE_TEST_SEATS"));
const returnUrl = Deno.env.get("ZUCHERA_STAGING_RETURN_URL") ?? "";
const flow = "zuchera-hosted-staging-v1";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (!/^(sk|rk)_test_/.test(key) || !signingSecret.startsWith("whsec_") ||
    !/^price_[A-Za-z0-9]+$/.test(priceId) ||
    !Number.isSafeInteger(seatLimit) || seatLimit < 1 || seatLimit > 2147483647 ||
    new URL(returnUrl).protocol !== "https:") {
  throw new Error("Configure the Zuchera staging Stripe settings");
}

const stripe = new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function startCheckout(request: Request): Promise<Response> {
  const token = request.headers.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return Response.json({ error: "Sign in to Zuchera staging" }, { status: 401 });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user?.email || !user.email_confirmed_at) {
    return Response.json({ error: "A verified staging account is required" }, { status: 401 });
  }

  const attempt = request.headers.get("Idempotency-Key") ?? "";
  if (!uuid.test(attempt)) {
    return Response.json({ error: "Supply a UUID in Idempotency-Key" }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: { zuchera_flow: flow },
    subscription_data: { metadata: { zuchera_flow: flow, zuchera_owner_id: user.id } },
    success_url: returnUrl,
    cancel_url: returnUrl,
  }, { idempotencyKey: `zuchera:${user.id}:${attempt}` });

  if (!session.url) throw new Error("Stripe did not return a Checkout URL");
  return Response.json({ url: session.url });
}

async function receiveWebhook(request: Request, signature: string): Promise<Response> {
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await request.text(), signature, signingSecret, undefined, cryptoProvider,
    );
  } catch {
    return Response.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  if (event.livemode) return Response.json({ error: "Only Stripe test events are allowed" }, { status: 400 });
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return Response.json({ received: true });
  }

  const session = await stripe.checkout.sessions.retrieve(event.data.object.id);
  if (session.metadata?.zuchera_flow !== flow) return Response.json({ received: true });
  if (session.livemode || session.mode !== "subscription" || session.status !== "complete" ||
      typeof session.subscription !== "string" ||
      (session.payment_status !== "paid" && session.payment_status !== "no_payment_required")) {
    return Response.json({ received: true });
  }

  const subscription = await stripe.subscriptions.retrieve(session.subscription);
  const owner = subscription.metadata.zuchera_owner_id ?? "";
  const item = subscription.items.data[0];
  if (subscription.livemode || subscription.metadata.zuchera_flow !== flow ||
      !uuid.test(owner) || owner !== session.client_reference_id ||
      subscription.items.has_more || subscription.items.data.length !== 1 ||
      item?.price.id !== priceId || item.quantity !== 1) {
    return Response.json({ error: "Invalid Zuchera test subscription" }, { status: 422 });
  }

  if (subscription.status !== "trialing" && subscription.status !== "active") {
    return Response.json({ received: true });
  }

  const { error } = await supabase.rpc("hosted_provision_workspace", {
    p_subscription: subscription.id,
    p_owner: owner,
    p_name: "My workspace",
    p_seat_limit: seatLimit,
    p_status: subscription.status,
  });
  if (error) {
    console.error("Workspace provisioning failed", { event: event.id, code: error.code });
    return Response.json({ error: "Workspace provisioning failed" }, { status: 500 });
  }

  return Response.json({ received: true });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST" } });

  try {
    const signature = request.headers.get("Stripe-Signature");
    return signature === null ? await startCheckout(request) : await receiveWebhook(request, signature);
  } catch {
    console.error("Zuchera staging Stripe request failed");
    return Response.json({ error: "Staging Stripe request failed" }, { status: 500 });
  }
});
