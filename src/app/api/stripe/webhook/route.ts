import { grantProFromStripe } from "@/lib/billing/grant";
import { getStripe } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return Response.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  const raw = await request.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const checkout = event.data.object;
    const userId =
      typeof checkout.metadata?.user_id === "string"
        ? checkout.metadata.user_id
        : null;
    if (userId && (checkout.payment_status === "paid" || checkout.status === "complete")) {
      const customerId =
        typeof checkout.customer === "string" ? checkout.customer : null;
      await grantProFromStripe({
        userId,
        source: "stripe",
        stripeCustomerId: customerId,
        stripeCheckoutSessionId: checkout.id,
      });
    }
  }

  return Response.json({ received: true });
}
