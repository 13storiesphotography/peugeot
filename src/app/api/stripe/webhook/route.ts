import { parseBillingInterval } from "@/lib/billing/catalog";
import {
  grantProFromStripe,
  setEntitlementStatusByCustomer,
} from "@/lib/billing/grant";
import { getStripe } from "@/lib/billing/stripe";
import { subscriptionPeriodEndIso } from "@/lib/billing/subscription";

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

  const stripe = getStripe();

  if (event.type === "checkout.session.completed") {
    const checkout = event.data.object;
    const userId =
      typeof checkout.metadata?.user_id === "string"
        ? checkout.metadata.user_id
        : null;
    if (
      userId &&
      (checkout.payment_status === "paid" || checkout.status === "complete")
    ) {
      const customerId =
        typeof checkout.customer === "string" ? checkout.customer : null;
      const interval = parseBillingInterval(
        checkout.metadata?.interval ?? "year",
      );
      let periodEnd: string | null = null;
      const subRef = checkout.subscription;
      const subId = typeof subRef === "string" ? subRef : subRef?.id;
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        periodEnd = subscriptionPeriodEndIso(sub);
      }
      await grantProFromStripe({
        userId,
        source: "stripe",
        stripeCustomerId: customerId,
        stripeCheckoutSessionId: checkout.id,
        interval,
        periodEnd,
      });
    }
  }

  if (
    event.type === "invoice.paid" ||
    event.type === "customer.subscription.updated"
  ) {
    const obj = event.data.object as {
      customer?: string | { id?: string };
      subscription?: string | { id?: string; current_period_end?: number };
      current_period_end?: number;
      status?: string;
    };
    const customerId =
      typeof obj.customer === "string" ? obj.customer : obj.customer?.id;
    const subId =
      typeof obj.subscription === "string"
        ? obj.subscription
        : obj.subscription?.id;
    let periodEnd: string | null = null;
    let status = obj.status;
    if (subId) {
      const sub = await stripe.subscriptions.retrieve(subId);
      periodEnd = subscriptionPeriodEndIso(sub);
      status = sub.status;
    } else if (typeof obj.current_period_end === "number") {
      periodEnd = new Date(obj.current_period_end * 1000).toISOString();
    }
    if (customerId && (status === "canceled" || status === "unpaid" || status === "incomplete_expired")) {
      await setEntitlementStatusByCustomer({
        stripeCustomerId: customerId,
        status: "canceled",
        periodEnd,
      });
    } else if (customerId && (status === "active" || status === "trialing" || event.type === "invoice.paid")) {
      await setEntitlementStatusByCustomer({
        stripeCustomerId: customerId,
        status: "active",
        periodEnd,
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as {
      customer?: string | { id?: string };
    };
    const customerId =
      typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
    if (customerId) {
      await setEntitlementStatusByCustomer({
        stripeCustomerId: customerId,
        status: "canceled",
      });
    }
  }

  return Response.json({ received: true });
}
