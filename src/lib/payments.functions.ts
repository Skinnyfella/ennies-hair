import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Public config — safe to expose (publishable/public keys only)
export const getPublicConfig = createServerFn({ method: "GET" }).handler(async () => {
  return {
    paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY ?? "",
    emailjs: {
      serviceId: process.env.EMAILJS_SERVICE_ID ?? "",
      templateId: process.env.EMAILJS_TEMPLATE_ID ?? "",
      publicKey: process.env.EMAILJS_PUBLIC_KEY ?? "",
    },
  };
});

const OrderItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1).max(255),
  price: z.number().min(0),
  qty: z.number().int().min(1).max(100),
  image: z.string().max(2000),
});

const VerifySchema = z.object({
  reference: z.string().min(3).max(128),
  customerName: z.string().min(1).max(255),
  customerEmail: z.string().email(),
  phone: z.string().min(1).max(50),
  address: z.string().min(1).max(500),
  total: z.number().min(1),
  items: z.array(OrderItemSchema).min(1).max(50),
});

export const verifyPaystackAndCreateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => VerifySchema.parse(input))
  .handler(async ({ data, context }) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Paystack is not configured (missing PAYSTACK_SECRET_KEY)");

    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } },
    );
    if (!res.ok) throw new Error(`Paystack verify failed (${res.status})`);
    const body = (await res.json()) as any;

    const tx = body?.data;
    if (!body?.status || tx?.status !== "success") {
      throw new Error("Payment was not successful");
    }
    const { supabase, userId } = context;

    // SECURITY: Re-fetch authoritative prices from DB; never trust client prices/total.
    const ids = Array.from(new Set(data.items.map((i) => i.productId)));
    const { data: dbProducts, error: prodErr } = await supabase
      .from("products")
      .select("id, price, stock, name")
      .in("id", ids);
    if (prodErr) throw new Error("Could not verify product prices");
    if (!dbProducts || dbProducts.length !== ids.length) {
      throw new Error("One or more products no longer exist");
    }
    const priceMap = new Map<string, number>(
      dbProducts.map((p: any) => [p.id as string, Number(p.price)]),
    );
    const stockMap = new Map<string, number>(
      dbProducts.map((p: any) => [p.id as string, Number(p.stock)]),
    );

    let serverTotal = 0;
    const verifiedItems = data.items.map((it) => {
      const dbPrice = priceMap.get(it.productId);
      const dbStock = stockMap.get(it.productId) ?? 0;
      if (dbPrice === undefined) throw new Error("Invalid product in order");
      if (it.qty > dbStock) throw new Error(`Insufficient stock for ${it.name}`);
      serverTotal += dbPrice * it.qty;
      return { ...it, price: dbPrice };
    });

    const expectedKobo = Math.round(serverTotal * 100);
    if (Number(tx.amount) !== expectedKobo) {
      throw new Error("Payment amount mismatch");
    }
    if (tx.currency && tx.currency !== "NGN") {
      throw new Error(`Unexpected currency: ${tx.currency}`);
    }

    const { data: inserted, error } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        customer_name: data.customerName,
        customer_email: data.customerEmail,
        phone: data.phone,
        address: data.address,
        items: verifiedItems as any,
        total: serverTotal,
        status: "Paid",
      } as any)
      .select()
      .single();
    if (error || !inserted) throw new Error(error?.message ?? "Could not save order");

    // Best-effort stock decrement
    for (const it of data.items) {
      const { data: p } = await supabase
        .from("products")
        .select("stock")
        .eq("id", it.productId)
        .maybeSingle();
      if (p) {
        await supabase
          .from("products")
          .update({ stock: Math.max(0, (p as any).stock - it.qty) })
          .eq("id", it.productId);
      }
    }

    return {
      id: inserted.id,
      createdAt: inserted.created_at,
      status: inserted.status,
    };
  });
