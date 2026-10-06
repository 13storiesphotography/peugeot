import type { BillingInterval } from "@/lib/billing/catalog";
import { amountForInterval } from "@/lib/billing/catalog";
import { getStripe } from "@/lib/billing/stripe";
import type Stripe from "stripe";

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

/** Catalog amounts are brutto (VAT included). */
function isCatalogGrossPrice(
  price: Stripe.Price,
  interval: BillingInterval,
): boolean {
  return (
    price.active === true &&
    price.currency === "eur" &&
    price.unit_amount === amountForInterval(interval) &&
    price.tax_behavior === "inclusive" &&
    price.recurring?.interval === interval
  );
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

async function createInclusivePrice(
  interval: BillingInterval,
  productId: string,
): Promise<string> {
  const stripe = getStripe();
  const lookup = LOOKUP[interval];
  try {
    const price = await stripe.prices.create({
      product: productId,
      currency: "eur",
      unit_amount: amountForInterval(interval),
      tax_behavior: "inclusive",
      recurring: { interval },
      lookup_key: lookup,
      transfer_lookup_key: true,
      metadata: { app: "peugeot-control", tax: "inclusive" },
    });
    return price.id;
  } catch (error) {
    // Race / existing lookup key — re-read instead of crashing checkout.
    const again = await stripe.prices.list({
      lookup_keys: [lookup],
      active: true,
      limit: 1,
    });
    if (again.data[0] && isCatalogGrossPrice(again.data[0], interval)) {
      await ensureProductInvoiceFields(await productIdFromPrice(again.data[0]));
      return again.data[0].id;
    }
    throw error;
  }
}

export async function getProPriceId(interval: BillingInterval): Promise<string> {
  const stripe = getStripe();
  const fromEnv = process.env[ENV_PRICE_KEYS[interval]]?.trim();
  if (fromEnv) {
    const price = await stripe.prices.retrieve(fromEnv);
    if (isCatalogGrossPrice(price, interval)) {
      await ensureProductInvoiceFields(await productIdFromPrice(price));
      return fromEnv;
    }
    // Env still points at an exclusive/legacy price — ignore and recreate.
    console.warn(
      `billing: ${ENV_PRICE_KEYS[interval]} is not tax-inclusive catalog price; creating replacement`,
    );
  }

  const lookup = LOOKUP[interval];
  const listed = await stripe.prices.list({
    lookup_keys: [lookup],
    active: true,
    limit: 1,
  });
  const existing = listed.data[0];
  if (existing && isCatalogGrossPrice(existing, interval)) {
    await ensureProductInvoiceFields(await productIdFromPrice(existing));
    return existing.id;
  }

  const productId = existing
    ? await productIdFromPrice(existing)
    : await getOrCreateProductId();
  await ensureProductInvoiceFields(productId);

  const createdId = await createInclusivePrice(interval, productId);

  if (existing && existing.id !== createdId) {
    try {
      await stripe.prices.update(existing.id, { active: false });
    } catch (error) {
      console.warn("billing: could not archive legacy price", existing.id, error);
    }
  }

  return createdId;
}
