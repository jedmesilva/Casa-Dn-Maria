import { useEffect, useRef, useState } from "react";
import { X, Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

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
    payer?: {
      email?: string;
      firstName?: string;
      lastName?: string;
    };
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
    onSubmit: (param: {
      selectedPaymentMethod?: string;
      formData: Record<string, unknown>;
    }) => Promise<void>;
    onError: (error: unknown) => void;
  };
}

const SDK_URL = "https://sdk.mercadopago.com/js/v2";
const API_BASE = "/api";

type Status =
  | { kind: "loading" }
  | { kind: "config-error"; message: string }
  | { kind: "collect-payer" }
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

interface Payer {
  firstName: string;
  lastName: string;
  email: string;
  cpf: string;
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

function friendlyMpError(raw: string | undefined): string {
  if (!raw) return "Não foi possível concluir o pagamento.";
  const map: Record<string, string> = {
    bin_not_found:
      "Cartão não reconhecido. Confira o número ou tente outro cartão.",
    cc_rejected_bad_filled_card_number: "Número do cartão inválido.",
    cc_rejected_bad_filled_date: "Data de validade inválida.",
    cc_rejected_bad_filled_security_code: "Código de segurança inválido.",
    cc_rejected_bad_filled_other: "Verifique os dados do cartão.",
    cc_rejected_insufficient_amount: "Cartão sem saldo suficiente.",
    cc_rejected_high_risk: "Pagamento recusado por análise de risco.",
    cc_rejected_call_for_authorize:
      "Você precisa autorizar o pagamento com o seu banco.",
    cc_rejected_card_disabled: "Cartão inativo. Ligue para o seu banco.",
    cc_rejected_duplicated_payment: "Pagamento duplicado.",
    cc_rejected_other_reason: "Pagamento recusado pelo banco emissor.",
    invalid_payer_email: "E-mail do comprador inválido.",
    invalid_users_involved: "Não é possível pagar para si mesmo no modo teste.",
  };
  for (const [code, msg] of Object.entries(map)) {
    if (raw.includes(code)) return msg;
  }
  return raw;
}

export default function CheckoutModal({ open, onClose, order }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [payer, setPayer] = useState<Payer>({
    firstName: "",
    lastName: "",
    email: "",
    cpf: "",
  });
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const brickRef = useRef<PaymentBrickController | null>(null);
  const containerId = "mp-payment-brick-container";

  // Load config when modal opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStatus({ kind: "loading" });
    setPublicKey(null);
    (async () => {
      try {
        const cfgRes = await fetch(`${API_BASE}/checkout/config`);
        const cfg = await cfgRes.json();
        if (cancelled) return;
        if (!cfg.enabled || !cfg.publicKey) {
          setStatus({
            kind: "config-error",
            message: "Checkout não configurado. Tente novamente mais tarde.",
          });
          return;
        }
        setPublicKey(cfg.publicKey);
        setStatus({ kind: "collect-payer" });
      } catch {
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
  }, [open]);

  // Mount Brick once payer is collected
  useEffect(() => {
    if (status.kind !== "ready" || !publicKey) return;
    let cancelled = false;

    (async () => {
      try {
        await loadScript(SDK_URL);
        if (cancelled || !window.MercadoPago) return;

        const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
        const bricksBuilder = mp.bricks();

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
              payer: {
                email: payer.email,
                firstName: payer.firstName,
                lastName: payer.lastName,
              },
            },
            customization: {
              paymentMethods: {
                creditCard: "all",
                debitCard: "all",
                bankTransfer: ["pix"],
                maxInstallments: 3,
              },
              visual: { style: { theme: "default" } },
            },
            callbacks: {
              onReady: () => {
                /* brick is mounted */
              },
              onSubmit: ({ selectedPaymentMethod, formData }) => {
                return new Promise<void>((resolve, reject) => {
                  setStatus({ kind: "processing" });
                  const isPix =
                    selectedPaymentMethod === "bank_transfer" ||
                    (formData as { payment_method_id?: string })
                      .payment_method_id === "pix";
                  const endpoint = isPix
                    ? `${API_BASE}/checkout/pix`
                    : `${API_BASE}/checkout/card`;
                  const fullPayer = {
                    ...((formData as Record<string, unknown>)["payer"] as
                      | Record<string, unknown>
                      | undefined),
                    email: payer.email,
                    first_name: payer.firstName,
                    last_name: payer.lastName,
                    identification: {
                      type: "CPF",
                      number: payer.cpf.replace(/\D/g, ""),
                    },
                  };
                  fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      ...formData,
                      payer: fullPayer,
                      order,
                    }),
                  })
                    .then(async (res) => {
                      const data = await res.json();
                      if (!res.ok) {
                        setStatus({
                          kind: "error",
                          message: friendlyMpError(data.error),
                        });
                        reject(new Error(data.error || "payment_error"));
                        return;
                      }
                      if (isPix && data.qr_code_base64) {
                        setStatus({
                          kind: "pending-pix",
                          qrBase64: data.qr_code_base64,
                          qrCode: data.qr_code,
                          paymentId: String(data.id),
                        });
                        resolve();
                      } else if (
                        data.status === "approved" ||
                        data.status === "in_process"
                      ) {
                        setStatus({
                          kind: "success",
                          paymentId: String(data.id),
                        });
                        resolve();
                      } else {
                        setStatus({
                          kind: "error",
                          message: friendlyMpError(
                            data.status_detail || data.status,
                          ),
                        });
                        reject(new Error(data.status_detail || "rejected"));
                      }
                    })
                    .catch((err) => {
                      setStatus({
                        kind: "error",
                        message: "Falha de rede ao processar pagamento.",
                      });
                      reject(err);
                    });
                });
              },
              onError: (err) => {
                console.error("Brick error", err);
                const msg =
                  (err as { message?: string })?.message ||
                  "Verifique os dados e tente novamente.";
                setStatus({ kind: "error", message: friendlyMpError(msg) });
              },
            },
          },
        );
      } catch (err) {
        console.error("Mount error", err);
        if (!cancelled)
          setStatus({
            kind: "config-error",
            message: "Não foi possível carregar o formulário de pagamento.",
          });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status.kind, publicKey, order, payer]);

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

  const payerValid =
    payer.firstName.trim().length > 1 &&
    payer.lastName.trim().length > 1 &&
    /\S+@\S+\.\S+/.test(payer.email) &&
    payer.cpf.replace(/\D/g, "").length === 11;

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

          {status.kind === "collect-payer" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-base font-bold text-[#1a1a1a]">
                  Seus dados
                </h4>
                <p className="text-sm text-[#5a5a5a] mt-1">
                  Precisamos dessas informações para emitir a nota e processar o
                  pagamento.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-[#5a5a5a] uppercase tracking-wider">
                    Nome
                  </span>
                  <input
                    type="text"
                    data-testid="input-firstname"
                    value={payer.firstName}
                    onChange={(e) =>
                      setPayer({ ...payer, firstName: e.target.value })
                    }
                    className="mt-1 w-full px-3 py-2 border border-[#e2e2e2] rounded-md focus:outline-none focus:border-[#b8902f]"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-[#5a5a5a] uppercase tracking-wider">
                    Sobrenome
                  </span>
                  <input
                    type="text"
                    data-testid="input-lastname"
                    value={payer.lastName}
                    onChange={(e) =>
                      setPayer({ ...payer, lastName: e.target.value })
                    }
                    className="mt-1 w-full px-3 py-2 border border-[#e2e2e2] rounded-md focus:outline-none focus:border-[#b8902f]"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-semibold text-[#5a5a5a] uppercase tracking-wider">
                  E-mail
                </span>
                <input
                  type="email"
                  data-testid="input-email"
                  value={payer.email}
                  onChange={(e) =>
                    setPayer({ ...payer, email: e.target.value })
                  }
                  className="mt-1 w-full px-3 py-2 border border-[#e2e2e2] rounded-md focus:outline-none focus:border-[#b8902f]"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[#5a5a5a] uppercase tracking-wider">
                  CPF
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  data-testid="input-cpf"
                  value={payer.cpf}
                  onChange={(e) => setPayer({ ...payer, cpf: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-[#e2e2e2] rounded-md focus:outline-none focus:border-[#b8902f]"
                />
              </label>
              <button
                disabled={!payerValid}
                data-testid="button-continue-payment"
                onClick={() => setStatus({ kind: "ready" })}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 transition-colors"
              >
                Continuar para pagamento
                <ArrowRight className="w-4 h-4" />
              </button>
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
                Recebemos seu pedido. Em breve você receberá um e-mail com a
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
                onClick={() => setStatus({ kind: "collect-payer" })}
                data-testid="button-retry-checkout"
                className="mt-5 px-6 py-3 rounded-md bg-[hsl(var(--primary))] text-white font-bold hover:bg-[hsl(var(--primary))]/90"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {/* Brick container */}
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
