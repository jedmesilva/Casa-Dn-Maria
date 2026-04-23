import { Router, type IRouter, type Request, type Response } from "express";
import { MercadoPagoConfig, Payment } from "mercadopago";
import rateLimit from "express-rate-limit";
import crypto from "node:crypto";
import { z } from "zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const accessToken = process.env["MERCADOPAGO_ACCESS_TOKEN"];
const webhookSecret = process.env["MERCADOPAGO_WEBHOOK_SECRET"];

if (!accessToken) {
  logger.warn("MERCADOPAGO_ACCESS_TOKEN not set — checkout disabled");
}

const mpClient = accessToken
  ? new MercadoPagoConfig({
      accessToken,
      options: { timeout: 10000 },
    })
  : null;

const paymentClient = mpClient ? new Payment(mpClient) : null;

const SizeEnum = z.enum(["200g", "500g", "1kg"]);
const VersionEnum = z.enum(["com-sal", "sem-sal"]);

const PRICE_TABLE: Record<z.infer<typeof SizeEnum>, number> = {
  "200g": 14.9,
  "500g": 29.9,
  "1kg": 49.9,
};

const orderSchema = z.object({
  version: VersionEnum,
  size: SizeEnum,
  quantity: z.number().int().min(1).max(99),
});

const payerSchema = z.object({
  email: z.string().email().max(120),
  first_name: z.string().min(1).max(60).optional(),
  last_name: z.string().min(1).max(60).optional(),
  identification: z
    .object({
      type: z.string().max(10),
      number: z.string().min(5).max(20),
    })
    .optional(),
  phone: z
    .object({
      area_code: z.string().max(4).optional(),
      number: z.string().max(20).optional(),
    })
    .optional(),
  address: z
    .object({
      zip_code: z.string().max(12).optional(),
      street_name: z.string().max(120).optional(),
      street_number: z.string().max(12).optional(),
      neighborhood: z.string().max(80).optional(),
      city: z.string().max(80).optional(),
      federal_unit: z.string().max(2).optional(),
    })
    .optional(),
});

const shippingSchema = z
  .object({
    cep: z.string().max(12),
    street: z.string().max(120),
    number: z.string().max(12),
    complement: z.string().max(80).optional().default(""),
    neighborhood: z.string().max(80),
    city: z.string().max(80),
    state: z.string().max(2),
  })
  .optional();

const cardSchema = z.object({
  order: orderSchema,
  token: z.string().min(8).max(200),
  installments: z.number().int().min(1).max(12).optional(),
  payment_method_id: z.string().min(2).max(40),
  issuer_id: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v: string | number | undefined) =>
      v === undefined ? undefined : Number(v),
    ),
  payer: payerSchema,
  shipping: shippingSchema,
  idempotency_key: z.string().min(8).max(80).optional(),
});

const pixSchema = z.object({
  order: orderSchema,
  payer: payerSchema,
  shipping: shippingSchema,
  idempotency_key: z.string().min(8).max(80).optional(),
});

function buildItemDescription(
  version: z.infer<typeof VersionEnum>,
  size: z.infer<typeof SizeEnum>,
  qty: number,
) {
  const versionLabel = version === "com-sal" ? "com Sal" : "sem Sal";
  return `DN. Maria — Alho Triturado ${versionLabel} ${size} (x${qty})`;
}

function computeTotal(order: z.infer<typeof orderSchema>) {
  return Number((PRICE_TABLE[order.size] * order.quantity).toFixed(2));
}

function safeError(err: unknown, fallback: string) {
  const e = err as {
    message?: string;
    cause?: Array<{ code?: string; description?: string }> | unknown;
  };
  const causeArr = Array.isArray(e.cause) ? e.cause : [];
  const code = causeArr[0]?.code;
  const description = causeArr[0]?.description;
  return code ?? description ?? e.message ?? fallback;
}

const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Aguarde um instante." },
});

const statusLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/checkout/config", (_req, res) => {
  res.json({
    publicKey: process.env["MERCADOPAGO_PUBLIC_KEY"] ?? null,
    enabled: Boolean(paymentClient),
    whatsappNumber: process.env["WHATSAPP_SUPPORT_NUMBER"] ?? null,
  });
});

router.post("/checkout/card", checkoutLimiter, async (req: Request, res: Response) => {
  if (!paymentClient) {
    return res.status(503).json({ error: "Checkout indisponível no momento" });
  }

  const parsed = cardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Dados inválidos" });
  }
  const data = parsed.data;
  const total = computeTotal(data.order);
  const description = buildItemDescription(
    data.order.version,
    data.order.size,
    data.order.quantity,
  );

  const idempotencyKey =
    data.idempotency_key ?? crypto.randomBytes(16).toString("hex");

  try {
    const payment = await paymentClient.create({
      body: {
        transaction_amount: total,
        token: data.token,
        description,
        installments: data.installments ?? 1,
        payment_method_id: data.payment_method_id,
        issuer_id: data.issuer_id,
        payer: data.payer,
        statement_descriptor: "DN MARIA",
        metadata: {
          version: data.order.version,
          size: data.order.size,
          quantity: data.order.quantity,
          shipping: data.shipping,
        },
      },
      requestOptions: { idempotencyKey },
    });

    return res.json({
      id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
      transaction_amount: payment.transaction_amount,
    });
  } catch (err: unknown) {
    logger.error({ err }, "Card payment error");
    return res.status(400).json({ error: safeError(err, "Falha ao processar pagamento") });
  }
});

router.post("/checkout/pix", checkoutLimiter, async (req: Request, res: Response) => {
  if (!paymentClient) {
    return res.status(503).json({ error: "Checkout indisponível no momento" });
  }

  const parsed = pixSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Dados inválidos" });
  }
  const data = parsed.data;
  const total = computeTotal(data.order);
  const description = buildItemDescription(
    data.order.version,
    data.order.size,
    data.order.quantity,
  );

  const idempotencyKey =
    data.idempotency_key ?? crypto.randomBytes(16).toString("hex");

  try {
    const payment = await paymentClient.create({
      body: {
        transaction_amount: total,
        description,
        payment_method_id: "pix",
        payer: {
          email: data.payer.email,
          first_name: data.payer.first_name,
          last_name: data.payer.last_name,
          identification: data.payer.identification,
        },
        metadata: {
          version: data.order.version,
          size: data.order.size,
          quantity: data.order.quantity,
          shipping: data.shipping,
        },
      },
      requestOptions: { idempotencyKey },
    });

    const tx = payment.point_of_interaction?.transaction_data;
    return res.json({
      id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
      transaction_amount: payment.transaction_amount,
      qr_code: tx?.qr_code,
      qr_code_base64: tx?.qr_code_base64,
      ticket_url: tx?.ticket_url,
    });
  } catch (err: unknown) {
    logger.error({ err }, "Pix payment error");
    return res.status(400).json({ error: safeError(err, "Falha ao gerar Pix") });
  }
});

router.get(
  "/checkout/status/:id",
  statusLimiter,
  async (req: Request, res: Response) => {
    if (!paymentClient) {
      return res.status(503).json({ error: "Checkout indisponível no momento" });
    }
    const id = String(req.params["id"] ?? "");
    if (!/^\d{1,30}$/.test(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    try {
      const payment = await paymentClient.get({ id });
      return res.json({
        id: payment.id,
        status: payment.status,
        status_detail: payment.status_detail,
      });
    } catch (err: unknown) {
      logger.error({ err }, "Status check error");
      return res.status(404).json({ error: "Não encontrado" });
    }
  },
);

function verifyMpSignature(req: Request, rawBody: Buffer): boolean {
  if (!webhookSecret) return false;
  const sigHeader = String(req.headers["x-signature"] ?? "");
  const requestId = String(req.headers["x-request-id"] ?? "");
  if (!sigHeader || !requestId) return false;

  const parts = Object.fromEntries(
    sigHeader.split(",").map((p) => {
      const [k, v] = p.trim().split("=");
      return [k, v];
    }),
  ) as Record<string, string>;

  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const dataId =
    String(req.query["data.id"] ?? "") ||
    (() => {
      try {
        const body = JSON.parse(rawBody.toString("utf8"));
        return String(body?.data?.id ?? "");
      } catch {
        return "";
      }
    })();

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hmac = crypto
    .createHmac("sha256", webhookSecret)
    .update(manifest)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(v1));
  } catch {
    return false;
  }
}

router.post("/checkout/webhook", async (req: Request, res: Response) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");

  if (!webhookSecret) {
    logger.warn("Webhook received but MERCADOPAGO_WEBHOOK_SECRET not set");
    return res.status(503).json({ error: "Webhook not configured" });
  }

  if (!verifyMpSignature(req, rawBody)) {
    logger.warn({ headers: req.headers }, "Invalid webhook signature");
    return res.status(401).json({ error: "Invalid signature" });
  }

  let event: { type?: string; action?: string; data?: { id?: string } } = {};
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const paymentId = event?.data?.id;
  if (event?.type === "payment" && paymentId && paymentClient) {
    try {
      const payment = await paymentClient.get({ id: paymentId });
      logger.info(
        {
          paymentId: payment.id,
          status: payment.status,
          amount: payment.transaction_amount,
        },
        "Mercado Pago webhook processed",
      );
      // TODO: persist order/payment in DB once schema is added
    } catch (err) {
      logger.error({ err, paymentId }, "Failed to fetch payment from webhook");
    }
  }

  return res.status(200).json({ received: true });
});

export default router;
