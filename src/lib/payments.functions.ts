import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Public config — safe to expose (publishable/public keys only)
export const getPublicConfig = createServerFn({ method: "GET" }).handler(async () => {
  return {
    paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY ?? "",
  };
});

function formatNairaSrv(n: number) {
  return `NGN ${Number(n).toLocaleString("en-NG")}`;
}

async function sendAdminEmailResend(args: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  phone: string;
  address: string;
  total: number;
  items: { name: string; qty: number; price: number }[];
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!apiKey || !from || !to) {
    console.warn("Resend not fully configured — skipping admin email");
    return;
  }
  const itemsHtml = args.items
    .map(
      (it) =>
        `<li>${it.name} &times; ${it.qty} — ${formatNairaSrv(it.price * it.qty)}</li>`,
    )
    .join("");
  const html = `
    <h2>Hi Enny,</h2>
    <p><strong>${args.customerName}</strong> just placed a new order.</p>
    <h3>Order #${args.orderId}</h3>
    <ul>${itemsHtml}</ul>
    <p><strong>Total:</strong> ${formatNairaSrv(args.total)}</p>
    <p><strong>Address:</strong> ${args.address}<br/>
       <strong>Phone:</strong> ${args.phone}<br/>
       <strong>Email:</strong> ${args.customerEmail}</p>
  `;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `New Ennies Hair order #${args.orderId} — ${args.customerName}`,
        html,
      }),
    });
    if (!res.ok) {
      console.error("Resend send failed", res.status, await res.text());
    }
  } catch (e) {
    console.error("Resend send error", e);
  }
}

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
    const expectedKobo = Math.round(data.total * 100);
    if (Number(tx.amount) !== expectedKobo) {
      throw new Error("Payment amount mismatch");
    }
    if (tx.currency && tx.currency !== "NGN") {
      throw new Error(`Unexpected currency: ${tx.currency}`);
    }

    const { supabase, userId } = context;
    const { data: inserted, error } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        customer_name: data.customerName,
        customer_email: data.customerEmail,
        phone: data.phone,
        address: data.address,
        items: data.items as any,
        total: data.total,
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

    // Best-effort admin notification via Resend
    await sendAdminEmailResend({
      orderId: inserted.id,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      phone: data.phone,
      address: data.address,
      total: data.total,
      items: data.items,
    });

    return {
      id: inserted.id,
      createdAt: inserted.created_at,
      status: inserted.status,
    };
  });
