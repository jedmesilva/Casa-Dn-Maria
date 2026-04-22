import { Router, type IRouter } from "express";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const accessToken = process.env["MERCADOPAGO_ACCESS_TOKEN"];

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

type SizeId = "200g" | "500g" | "1kg";
type VersionId = "com-sal" | "sem-sal";

const PRICE_TABLE: Record<SizeId, number> = {
  "200g": 14.9,
  "500g": 29.9,
  "1kg": 49.9,
};

function buildItemDescription(version: VersionId, size: SizeId, qty: number) {
  const versionLabel = version === "com-sal" ? "com Sal" : "sem Sal";
  return `DN. Maria — Alho Triturado ${versionLabel} ${size} (x${qty})`;
}

function validateOrder(body: unknown):
  | {
      version: VersionId;
      size: SizeId;
      quantity: number;
      total: number;
      description: string;
    }
  | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid body" };
  const b = body as Record<string, unknown>;
  const version = b["version"] as VersionId;
  const size = b["size"] as SizeId;
  const quantity = Number(b["quantity"]);
  if (version !== "com-sal" && version !== "sem-sal") {
    return { error: "Invalid version" };
  }
  if (!(size in PRICE_TABLE)) {
    return { error: "Invalid size" };
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return { error: "Invalid quantity" };
  }
  const unit = PRICE_TABLE[size];
  const total = Number((unit * quantity).toFixed(2));
  return {
    version,
    size,
    quantity,
    total,
    description: buildItemDescription(version, size, quantity),
  };
}

router.get("/checkout/config", (_req, res) => {
  res.json({
    publicKey: process.env["MERCADOPAGO_PUBLIC_KEY"] ?? null,
    enabled: Boolean(paymentClient),
    whatsappNumber: process.env["WHATSAPP_SUPPORT_NUMBER"] ?? null,
  });
});

router.post("/checkout/card", async (req, res) => {
  if (!paymentClient) {
    return res.status(503).json({ error: "Checkout indisponível no momento" });
  }
  const order = validateOrder(req.body?.order);
  if ("error" in order) return res.status(400).json({ error: order.error });

  const { token, installments, payment_method_id, issuer_id, payer } =
    req.body ?? {};

  if (!token || !payment_method_id || !payer?.email) {
    return res.status(400).json({ error: "Dados de pagamento incompletos" });
  }

  try {
    const payment = await paymentClient.create({
      body: {
        transaction_amount: order.total,
        token,
        description: order.description,
        installments: Number(installments) || 1,
        payment_method_id,
        issuer_id: issuer_id ? Number(issuer_id) : undefined,
        payer: {
          email: payer.email,
          first_name: payer.first_name,
          last_name: payer.last_name,
          identification: payer.identification,
        },
        statement_descriptor: "DN MARIA",
        metadata: {
          version: order.version,
          size: order.size,
          quantity: order.quantity,
        },
      },
      requestOptions: {
        idempotencyKey: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
    });

    return res.json({
      id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
      transaction_amount: payment.transaction_amount,
    });
  } catch (err: unknown) {
    const error = err as { message?: string; cause?: unknown };
    logger.error({ err }, "Card payment error");
    return res.status(400).json({
      error: error.message ?? "Falha ao processar pagamento",
      cause: error.cause,
    });
  }
});

router.post("/checkout/pix", async (req, res) => {
  if (!paymentClient) {
    return res.status(503).json({ error: "Checkout indisponível no momento" });
  }
  const order = validateOrder(req.body?.order);
  if ("error" in order) return res.status(400).json({ error: order.error });

  const { payer } = req.body ?? {};
  if (!payer?.email) {
    return res.status(400).json({ error: "Email é obrigatório para Pix" });
  }

  try {
    const payment = await paymentClient.create({
      body: {
        transaction_amount: order.total,
        description: order.description,
        payment_method_id: "pix",
        payer: {
          email: payer.email,
          first_name: payer.first_name,
          last_name: payer.last_name,
          identification: payer.identification,
        },
        metadata: {
          version: order.version,
          size: order.size,
          quantity: order.quantity,
        },
      },
      requestOptions: {
        idempotencyKey: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
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
    const error = err as { message?: string; cause?: unknown };
    logger.error({ err }, "Pix payment error");
    return res.status(400).json({
      error: error.message ?? "Falha ao gerar Pix",
      cause: error.cause,
    });
  }
});

router.get("/checkout/status/:id", async (req, res) => {
  if (!paymentClient) {
    return res.status(503).json({ error: "Checkout indisponível no momento" });
  }
  try {
    const payment = await paymentClient.get({ id: req.params.id });
    return res.json({
      id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    logger.error({ err }, "Status check error");
    return res.status(404).json({ error: error.message ?? "Não encontrado" });
  }
});

export default router;
