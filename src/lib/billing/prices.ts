import type { BillingInterval } from "@/lib/billing/catalog";
import { amountForInterval } from "@/lib/billing/catalog";
import { getStripe } from "@/lib/billing/stripe";

const LOOKUP: Record<BillingInterval, string> = {
  month: "peugeot_control_pro_month",
  year: "peugeot_control_pro_year",
};

async function getOrCreateProductId(): Promise<string> {
  const stripe = getStripe();
  for (const interval of ["year", "month"] as const) {
    const listed = await stripe.prices.list({
      lookup_keys: [LOOKUP[interval]],
      active: true,
      limit: 1,
    });
    const price = listed.data[0];
    if (price) {
      return typeof price.product === "string" ? price.product : price.product.id;
    }
  }
  const product = await stripe.products.create({
    name: "Peugeot Control Pro",
    metadata: { app: "peugeot-control" },
  });
  return product.id;
}

export async function getProPriceId(interval: BillingInterval): Promise<string> {
  const stripe = getStripe();
  const lookup = LOOKUP[interval];
  const listed = await stripe.prices.list({
    lookup_keys: [lookup],
    active: true,
    limit: 1,
  });
  if (listed.data[0]) return listed.data[0].id;

  const productId = await getOrCreateProductId();
  const price = await stripe.prices.create({
    product: productId,
    currency: "eur",
    unit_amount: amountForInterval(interval),
    recurring: { interval },
    lookup_key: lookup,
    transfer_lookup_key: true,
  });
  return price.id;
}
