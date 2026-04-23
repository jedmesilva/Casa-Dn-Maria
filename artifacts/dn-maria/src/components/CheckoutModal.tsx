import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Lock,
  ShieldCheck,
} from "lucide-react";
import logo from "@/assets/logo.png";
import productImage from "@/assets/product-nobg.png";
import productSemSalImage from "@/assets/product-semsal-nobg.png";

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
    payer?: { email?: string; firstName?: string; lastName?: string };
  };
  customization: {
    paymentMethods: {
      creditCard?: string;
      debitCard?: string;
      bankTransfer?: string[];
      maxInstallments?: number;
    };
    visual?: { style?: { theme?: string } };
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

type Step = "payer" | "payment";

type Status =
  | { kind: "idle" }
  | { kind: "loading-config" }
  | { kind: "config-error"; message: string }
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
        existing.addEventListener("error", () =>
          reject(new Error("SDK load failed")),
        );
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
    invalid_users_involved:
      "Em modo teste, use um e-mail diferente do dono da conta MP.",
  };
  for (const [code, msg] of Object.entries(map)) {
    if (raw.includes(code)) return msg;
  }
  return raw;
}

function formatCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export default function CheckoutModal({ open, onClose, order }: Props) {
  const [step, setStep] = useState<Step>("payer");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [payer, setPayer] = useState<Payer>({
    firstName: "",
    lastName: "",
    email: "",
    cpf: "",
  });
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const brickRef = useRef<PaymentBrickController | null>(null);
  const containerId = "mp-payment-brick-container";

  // Reset state when entering checkout
  useEffect(() => {
    if (!open) return;
    setStep("payer");
    setStatus({ kind: "loading-config" });
    setPublicKey(null);
    let cancelled = false;
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
        setStatus({ kind: "idle" });
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

  // Mount Brick when reaching the payment step
  useEffect(() => {
    if (!open || step !== "payment" || !publicKey) return;
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
        brickRef.current = await bricksBuilder.create("payment", containerId, {
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
              /* mounted */
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
        });
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
  }, [open, step, publicKey, order, payer]);

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
  const productImg =
    order.version === "com-sal" ? productImage : productSemSalImage;
  const totalFmt = order.total.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const payerValid =
    payer.firstName.trim().length > 1 &&
    payer.lastName.trim().length > 1 &&
    /\S+@\S+\.\S+/.test(payer.email) &&
    payer.cpf.replace(/\D/g, "").length === 11;

  const inputClass =
    "mt-1 w-full px-3 py-2.5 bg-white text-[#1a1a1a] placeholder:text-[#9a9a9a] border border-[#cfcfcf] rounded-md focus:outline-none focus:border-[#b8902f] focus:ring-2 focus:ring-[#b8902f]/20";

  return (
    <div className="fixed inset-0 z-50 bg-[#fbf7f0] overflow-y-auto">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#e8e2d4]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={onClose}
            data-testid="button-back-checkout"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#5a5a5a] hover:text-[#1a1a1a] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar à loja
          </button>
          <img src={logo} alt="DN. Maria" className="h-9 w-auto" />
          <div className="flex items-center gap-2 text-xs text-[#5a5a5a]">
            <Lock className="w-3.5 h-3.5 text-[#2f7a3a]" />
            Compra segura
          </div>
        </div>
      </header>

      {/* Stepper */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-6">
        <div className="flex items-center gap-3 text-xs sm:text-sm">
          <StepDot active={step === "payer"} done={step === "payment"}>
            1. Seus dados
          </StepDot>
          <div className="flex-1 h-px bg-[#e8e2d4]" />
          <StepDot
            active={step === "payment"}
            done={
              status.kind === "success" || status.kind === "pending-pix"
            }
          >
            2. Pagamento
          </StepDot>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        {/* Left: form / status */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#eee] p-6 sm:p-8">
          {status.kind === "loading-config" && (
            <div className="flex flex-col items-center text-center py-16">
              <Loader2 className="w-10 h-10 text-[#b8902f] animate-spin mb-3" />
              <p className="text-[#5a5a5a]">Carregando checkout seguro...</p>
            </div>
          )}

          {status.kind === "config-error" && (
            <div className="flex flex-col items-center text-center py-12">
              <AlertCircle className="w-12 h-12 text-[hsl(var(--primary))] mb-3" />
              <p className="text-[#1a1a1a] font-semibold">{status.message}</p>
            </div>
          )}

          {status.kind === "idle" && step === "payer" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-[#1a1a1a]">
                  Seus dados
                </h2>
                <p className="text-sm text-[#5a5a5a] mt-1">
                  Precisamos dessas informações para emitir a nota e processar
                  o pagamento.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    className={inputClass}
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
                    className={inputClass}
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-semibold text-[#5a5a5a] uppercase tracking-wider">
                  E-mail
                </span>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  data-testid="input-email"
                  value={payer.email}
                  onChange={(e) =>
                    setPayer({ ...payer, email: e.target.value })
                  }
                  className={inputClass}
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
                  onChange={(e) =>
                    setPayer({ ...payer, cpf: formatCpf(e.target.value) })
                  }
                  className={inputClass}
                />
              </label>
              <button
                disabled={!payerValid}
                data-testid="button-continue-payment"
                onClick={() => setStep("payment")}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3.5 transition-colors"
              >
                Continuar para pagamento
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="flex items-center justify-center gap-2 text-xs text-[#7a7a7a] pt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2f7a3a]" />
                Seus dados são protegidos e usados apenas para esta compra.
              </div>
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
              <h3 className="text-2xl font-bold text-[#1a1a1a]">
                Pagamento aprovado!
              </h3>
              <p className="mt-2 text-[#5a5a5a] max-w-md">
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
                Voltar à loja
              </button>
            </div>
          )}

          {status.kind === "pending-pix" && (
            <div className="flex flex-col items-center text-center py-4">
              <h3 className="text-xl font-bold text-[#1a1a1a]">
                Escaneie o QR Code para pagar
              </h3>
              <p className="text-sm text-[#5a5a5a] mt-1">
                Aguardando confirmação do pagamento...
              </p>
              <img
                src={`data:image/png;base64,${status.qrBase64}`}
                alt="QR Code Pix"
                className="mt-5 w-60 h-60 border-4 border-[#fbf7f0] rounded-xl"
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
                    className="flex-1 px-3 py-2 text-xs border border-[#cfcfcf] rounded-md bg-white text-[#1a1a1a] font-mono"
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
              <h3 className="text-lg font-bold text-[#1a1a1a]">
                Não foi possível concluir
              </h3>
              <p className="mt-1 text-[#5a5a5a] max-w-md">{status.message}</p>
              <button
                onClick={() => {
                  setStatus({ kind: "idle" });
                  setStep("payment");
                }}
                data-testid="button-retry-checkout"
                className="mt-5 px-6 py-3 rounded-md bg-[hsl(var(--primary))] text-white font-bold hover:bg-[hsl(var(--primary))]/90"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {/* Brick container — only visible during payment step in idle/processing */}
          {step === "payment" && (
            <div
              className={
                status.kind === "idle" || status.kind === "processing"
                  ? "block"
                  : "hidden"
              }
            >
              {status.kind === "idle" && (
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-[#1a1a1a]">
                    Pagamento
                  </h2>
                  <p className="text-sm text-[#5a5a5a] mt-1">
                    Escolha cartão de crédito, débito ou Pix.
                  </p>
                </div>
              )}
              <div id={containerId} />
            </div>
          )}
        </div>

        {/* Right: order summary */}
        <aside className="bg-white rounded-2xl shadow-sm border border-[#eee] p-6 h-max sticky top-24">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#b8902f]">
            Resumo do pedido
          </h3>
          <div className="mt-4 flex gap-4 items-center">
            <div className="w-20 h-20 rounded-lg bg-[#fbf7f0] flex items-center justify-center overflow-hidden">
              <img src={productImg} alt="" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[#1a1a1a]">
                Alho Triturado
              </p>
              <p className="text-xs text-[#5a5a5a]">
                {versionLabel} · {order.size}
              </p>
              <p className="text-xs text-[#5a5a5a] mt-0.5">
                Quantidade: {order.quantity}
              </p>
            </div>
          </div>
          <div className="mt-5 pt-5 border-t border-[#eee] space-y-2 text-sm">
            <div className="flex justify-between text-[#5a5a5a]">
              <span>Subtotal</span>
              <span>{totalFmt}</span>
            </div>
            <div className="flex justify-between text-[#5a5a5a]">
              <span>Frete</span>
              <span className="text-[#2f7a3a] font-semibold">Grátis</span>
            </div>
            <div className="flex justify-between text-base font-bold text-[#1a1a1a] pt-2 border-t border-[#eee]">
              <span>Total</span>
              <span className="text-[hsl(var(--primary))]">{totalFmt}</span>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function StepDot({
  active,
  done,
  children,
}: {
  active: boolean;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 font-semibold ${
        active
          ? "text-[#1a1a1a]"
          : done
            ? "text-[#2f7a3a]"
            : "text-[#9a9a9a]"
      }`}
    >
      <span
        className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs ${
          active
            ? "bg-[hsl(var(--primary))] text-white"
            : done
              ? "bg-[#2f7a3a] text-white"
              : "bg-[#e8e2d4] text-[#9a9a9a]"
        }`}
      >
        {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
      </span>
      {children}
    </div>
  );
}
