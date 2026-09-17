import type { BillingInterval } from "@/lib/billing/catalog";
import { amountForInterval } from "@/lib/billing/catalog";
import { getStripe } from "@/lib/billing/stripe";

const LOOKUP: Record<BillingInterval, string> = {
  month: "peugeot_control_pro_month",
  year: "peugeot_control_pro_year",
};

const ENV_PRICE_KEYS: Record<BillingInterval, string> = {
  month: "STRIPE_PRICE_PRO_MONTH",
  year: "STRIPE_PRICE_PRO_YEAR",
};

/** Stripe Tax: Software as a service — required when Tax is enabled. */
export const PRO_TAX_CODE = "txcd_10103001";

const PRO_PRODUCT_NAME = "Peugeot Control Pro";
const PRO_PRODUCT_DESCRIPTION =
  "Vorklima, Schloss, Finden und 80%-Ladelimit — digitales Abo für Peugeot Control.";

async function ensureProductInvoiceFields(productId: string): Promise<void> {
  const stripe = getStripe();
  const product = await stripe.products.retrieve(productId);
  const patch: {
    tax_code?: string;
    name?: string;
    description?: string;
  } = {};
  if (!product.tax_code) patch.tax_code = PRO_TAX_CODE;
  if (!product.name?.trim()) patch.name = PRO_PRODUCT_NAME;
  if (!product.description?.trim()) patch.description = PRO_PRODUCT_DESCRIPTION;
  if (Object.keys(patch).length === 0) return;
  await stripe.products.update(productId, patch);
}

async function productIdFromPrice(
  price: { product: string | { id: string } },
): Promise<string> {
  return typeof price.product === "string" ? price.product : price.product.id;
}

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
      const productId = await productIdFromPrice(price);
      await ensureProductInvoiceFields(productId);
      return productId;
    }
  }
  const product = await stripe.products.create({
    name: PRO_PRODUCT_NAME,
    description: PRO_PRODUCT_DESCRIPTION,
    tax_code: PRO_TAX_CODE,
    metadata: { app: "peugeot-control" },
  });
  return product.id;
}

export async function getProPriceId(interval: BillingInterval): Promise<string> {
  const stripe = getStripe();
  const fromEnv = process.env[ENV_PRICE_KEYS[interval]]?.trim();
  if (fromEnv) {
    const price = await stripe.prices.retrieve(fromEnv);
    await ensureProductInvoiceFields(await productIdFromPrice(price));
    return fromEnv;
  }

  const lookup = LOOKUP[interval];
  const listed = await stripe.prices.list({
    lookup_keys: [lookup],
    active: true,
    limit: 1,
  });
  if (listed.data[0]) {
    await ensureProductInvoiceFields(await productIdFromPrice(listed.data[0]));
    return listed.data[0].id;
  }

  const productId = await getOrCreateProductId();
  try {
    const price = await stripe.prices.create({
      product: productId,
      currency: "eur",
      unit_amount: amountForInterval(interval),
      recurring: { interval },
      lookup_key: lookup,
      transfer_lookup_key: true,
    });
    return price.id;
  } catch (error) {
    // Race / existing lookup key — re-read instead of crashing checkout.
    const again = await stripe.prices.list({
      lookup_keys: [lookup],
      active: true,
      limit: 1,
    });
    if (again.data[0]) {
      await ensureProductInvoiceFields(await productIdFromPrice(again.data[0]));
      return again.data[0].id;
    }
    throw error;
  }
}
