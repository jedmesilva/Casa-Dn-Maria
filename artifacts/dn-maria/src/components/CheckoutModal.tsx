import { useEffect, useRef, useState } from "react";
import { X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

declare global {
  interface Window {
    MercadoPago?: new (
      publicKey: string,
      options?: { locale?: string },
    ) => MercadoPagoInstance;
  }
}

interface MercadoPagoInstance {
  bricks(): {
    create(
      type: string,
      containerId: string,
      settings: PaymentBrickSettings,
    ): Promise<PaymentBrickController>;
  };
}

interface PaymentBrickController {
  unmount(): void;
}

interface PaymentBrickSettings {
  initialization: {
    amount: number;
    payer?: { email?: string };
  };
  customization: {
    paymentMethods: {
      creditCard?: string;
      debitCard?: string;
      bankTransfer?: string[];
      maxInstallments?: number;
    };
    visual?: {
      style?: { theme?: string };
    };
  };
  callbacks: {
    onReady: () => void;
    onSubmit: (param: { formData: Record<string, unknown> }) => Promise<void>;
    onError: (error: unknown) => void;
  };
}

const SDK_URL = "https://sdk.mercadopago.com/js/v2";
const BASE_URL = (import.meta.env.BASE_URL || "/").replace(/\/$/, "") + "/";
const API_BASE = "/api";

type Status =
  | { kind: "loading" }
  | { kind: "config-error"; message: string }
  | { kind: "ready" }
  | { kind: "processing" }
  | { kind: "success"; paymentId: string }
  | { kind: "pending-pix"; qrBase64: string; qrCode: string; paymentId: string }
  | { kind: "error"; message: string };

interface Props {
  open: boolean;
  onClose: () => void;
  order: {
    version: "com-sal" | "sem-sal";
    size: "200g" | "500g" | "1kg";
    quantity: number;
    total: number;
  };
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if ((existing as HTMLScriptElement).dataset.loaded === "true") {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("SDK load failed")));
      }
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("SDK load failed"));
    document.head.appendChild(script);
  });
}

export default function CheckoutModal({ open, onClose, order }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const brickRef = useRef<PaymentBrickController | null>(null);
  const containerId = "mp-payment-brick-container";

  // Mount brick when open
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStatus({ kind: "loading" });

    (async () => {
      try {
        const cfgRes = await fetch(`${API_BASE}/checkout/config`);
        const cfg = await cfgRes.json();
        if (!cfg.enabled || !cfg.publicKey) {
          if (!cancelled)
            setStatus({
              kind: "config-error",
              message: "Checkout não configurado. Tente novamente mais tarde.",
            });
          return;
        }

        await loadScript(SDK_URL);
        if (cancelled) return;
        if (!window.MercadoPago) {
          setStatus({ kind: "config-error", message: "Falha ao carregar SDK." });
          return;
        }

        const mp = new window.MercadoPago(cfg.publicKey, { locale: "pt-BR" });
        const bricksBuilder = mp.bricks();

        // Wait for the container to exist in the DOM
        await new Promise((r) => requestAnimationFrame(() => r(null)));

        if (brickRef.current) {
          brickRef.current.unmount();
          brickRef.current = null;
        }

        brickRef.current = await bricksBuilder.create(
          "payment",
          containerId,
          {
            initialization: {
              amount: order.total,
            },
            customization: {
              paymentMethods: {
                creditCard: "all",
                debitCard: "all",
                bankTransfer: ["pix"],
                maxInstallments: 3,
              },
              visual: {
                style: { theme: "default" },
              },
            },
            callbacks: {
              onReady: () => {
                if (!cancelled) setStatus({ kind: "ready" });
              },
              onSubmit: async ({ formData }) => {
                setStatus({ kind: "processing" });
                try {
                  const isPix =
                    (formData as { payment_method_id?: string })
                      .payment_method_id === "pix";
                  const endpoint = isPix
                    ? `${API_BASE}/checkout/pix`
                    : `${API_BASE}/checkout/card`;
                  const res = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...formData, order }),
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    setStatus({
                      kind: "error",
                      message: data.error || "Pagamento recusado",
                    });
                    return;
                  }
                  if (isPix && data.qr_code_base64) {
                    setStatus({
                      kind: "pending-pix",
                      qrBase64: data.qr_code_base64,
                      qrCode: data.qr_code,
                      paymentId: String(data.id),
                    });
                  } else if (
                    data.status === "approved" ||
                    data.status === "in_process"
                  ) {
                    setStatus({
                      kind: "success",
                      paymentId: String(data.id),
                    });
                  } else {
                    setStatus({
                      kind: "error",
                      message: `Pagamento ${data.status_detail || data.status}`,
                    });
                  }
                } catch (err) {
                  setStatus({
                    kind: "error",
                    message: "Falha de rede ao processar pagamento",
                  });
                }
              },
              onError: (err) => {
                console.error("Brick error", err);
              },
            },
          },
        );
      } catch (err) {
        if (!cancelled)
          setStatus({
            kind: "config-error",
            message: "Não foi possível iniciar o checkout.",
          });
      }
    })();

    return () => {
      cancelled = true;
      if (brickRef.current) {
        brickRef.current.unmount();
        brickRef.current = null;
      }
    };
  }, [open, order.total, order.version, order.size, order.quantity]);

  // Poll Pix status
  useEffect(() => {
    if (status.kind !== "pending-pix") return;
    const id = status.paymentId;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/checkout/status/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "approved") {
          setStatus({ kind: "success", paymentId: id });
        }
      } catch {
        /* keep polling */
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [status]);

  if (!open) return null;

  const versionLabel = order.version === "com-sal" ? "Com sal" : "Sem sal";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
      onClick={onClose}
      data-testid="checkout-modal-backdrop"
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-8 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#eee]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#b8902f]">
              Finalizar compra
            </p>
            <h3 className="mt-1 text-xl font-bold text-[#1a1a1a]">
              DN. Maria — Alho Triturado
            </h3>
            <p className="mt-0.5 text-sm text-[#5a5a5a]">
              {versionLabel} · {order.size} · Quantidade {order.quantity}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#5a5a5a]">Total</p>
            <p className="text-2xl font-bold text-[hsl(var(--primary))]">
              {order.total.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            data-testid="button-close-checkout"
            className="ml-2 p-2 text-[#5a5a5a] hover:text-[#1a1a1a] hover:bg-[#fbf7f0] rounded-lg transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {status.kind === "config-error" && (
            <div className="flex flex-col items-center text-center py-12">
              <AlertCircle className="w-12 h-12 text-[hsl(var(--primary))] mb-3" />
              <p className="text-[#1a1a1a] font-semibold">{status.message}</p>
            </div>
          )}

          {status.kind === "loading" && (
            <div className="flex flex-col items-center text-center py-16">
              <Loader2 className="w-10 h-10 text-[#b8902f] animate-spin mb-3" />
              <p className="text-[#5a5a5a]">Carregando checkout seguro...</p>
            </div>
          )}

          {status.kind === "processing" && (
            <div className="flex flex-col items-center text-center py-16">
              <Loader2 className="w-10 h-10 text-[#b8902f] animate-spin mb-3" />
              <p className="text-[#1a1a1a] font-semibold">
                Processando pagamento...
              </p>
              <p className="text-sm text-[#5a5a5a] mt-1">
                Isso pode levar alguns segundos.
              </p>
            </div>
          )}

          {status.kind === "success" && (
            <div className="flex flex-col items-center text-center py-12">
              <div className="w-16 h-16 rounded-full bg-[#e9f4eb] flex items-center justify-center mb-4">
                <CheckCircle2 className="w-9 h-9 text-[#2f7a3a]" />
              </div>
              <h4 className="text-2xl font-bold text-[#1a1a1a]">
                Pagamento aprovado!
              </h4>
              <p className="mt-2 text-[#5a5a5a] max-w-sm">
                Recebemos seu pedido. Em breve você receberá um email com a
                confirmação e o código de rastreamento.
              </p>
              <p className="mt-4 text-xs text-[#9a9a9a]">
                Pedido #{status.paymentId}
              </p>
              <button
                onClick={onClose}
                data-testid="button-close-success"
                className="mt-6 px-6 py-3 rounded-md bg-[hsl(var(--primary))] text-white font-bold hover:bg-[hsl(var(--primary))]/90"
              >
                Fechar
              </button>
            </div>
          )}

          {status.kind === "pending-pix" && (
            <div className="flex flex-col items-center text-center py-6">
              <h4 className="text-lg font-bold text-[#1a1a1a]">
                Escaneie o QR Code para pagar
              </h4>
              <p className="text-sm text-[#5a5a5a] mt-1">
                Aguardando confirmação do pagamento...
              </p>
              <img
                src={`data:image/png;base64,${status.qrBase64}`}
                alt="QR Code Pix"
                className="mt-5 w-56 h-56 border-4 border-[#fbf7f0] rounded-xl"
              />
              <div className="mt-5 w-full max-w-md">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#5a5a5a]">
                  Ou copie o código Pix
                </p>
                <div className="mt-2 flex gap-2">
                  <input
                    readOnly
                    value={status.qrCode}
                    data-testid="input-pix-code"
                    className="flex-1 px-3 py-2 text-xs border border-[#e2e2e2] rounded-md bg-[#fbf7f0] font-mono"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(status.qrCode)}
                    data-testid="button-copy-pix"
                    className="px-4 py-2 rounded-md bg-[hsl(var(--primary))] text-white font-bold text-sm whitespace-nowrap"
                  >
                    Copiar
                  </button>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2 text-sm text-[#5a5a5a]">
                <Loader2 className="w-4 h-4 animate-spin text-[#b8902f]" />
                Aguardando pagamento...
              </div>
            </div>
          )}

          {status.kind === "error" && (
            <div className="flex flex-col items-center text-center py-10">
              <AlertCircle className="w-12 h-12 text-[hsl(var(--primary))] mb-3" />
              <h4 className="text-lg font-bold text-[#1a1a1a]">
                Não foi possível concluir
              </h4>
              <p className="mt-1 text-[#5a5a5a] max-w-sm">{status.message}</p>
              <button
                onClick={() => setStatus({ kind: "ready" })}
                data-testid="button-retry-checkout"
                className="mt-5 px-6 py-3 rounded-md bg-[hsl(var(--primary))] text-white font-bold hover:bg-[hsl(var(--primary))]/90"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {/* Brick container — kept mounted while ready/processing/etc that allow form */}
          <div
            id={containerId}
            className={
              status.kind === "ready" || status.kind === "processing"
                ? ""
                : "hidden"
            }
          />
        </div>
      </div>
    </div>
  );
}
