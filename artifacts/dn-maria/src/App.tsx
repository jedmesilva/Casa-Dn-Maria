import { ShoppingCart, Shield, Lock } from "lucide-react";
import heroImage from "@/assets/hero.png";

function Logo() {
  return (
    <div className="flex flex-col items-center text-[hsl(var(--accent))]">
      <svg
        width="58"
        height="64"
        viewBox="0 0 58 64"
        fill="none"
        className="drop-shadow-[0_0_12px_rgba(212,175,90,0.25)]"
      >
        <path
          d="M4 60 L4 22 C4 10 14 2 29 2 C44 2 54 10 54 22 L54 60"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M29 14 c-3 0 -5 2 -5 5 c0 3 5 7 5 7 c0 0 5 -4 5 -7 c0 -3 -2 -5 -5 -5 z"
          fill="currentColor"
        />
        <text
          x="29"
          y="48"
          textAnchor="middle"
          fontFamily="serif"
          fontSize="14"
          fontWeight="600"
          fill="currentColor"
          letterSpacing="1"
        >
          DN
        </text>
      </svg>
      <div className="mt-2 font-serif italic tracking-[0.3em] text-sm">
        DN. MARIA
      </div>
    </div>
  );
}

function FeatureIcon({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-full border border-[hsl(var(--accent))]/60 flex items-center justify-center text-[hsl(var(--accent))]">
        {children}
      </div>
      <p className="mt-3 text-xs leading-tight text-[hsl(var(--muted-foreground))] max-w-[110px]">
        {label}
      </p>
    </div>
  );
}

function GarlicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3 C10 5 8 5 8 9 C8 14 9 19 12 21 C15 19 16 14 16 9 C16 5 14 5 12 3 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 7 L12 20"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.6"
      />
      <path
        d="M9 10 C10 13 10 17 9.5 19"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.6"
      />
      <path
        d="M15 10 C14 13 14 17 14.5 19"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.6"
      />
    </svg>
  );
}

function SpoonIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <ellipse
        cx="12"
        cy="7"
        rx="5"
        ry="4"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M12 11 L12 21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GarlicBulbIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 4 C9 6 7 9 7 13 C7 17 9 20 12 20 C15 20 17 17 17 13 C17 9 15 6 12 4 Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M12 4 L12 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 13 C10 16 11 19 12 20" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <path d="M14 13 C14 16 13 19 12 20" stroke="currentColor" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

function Hero() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-[hsl(var(--background))]">
      {/* Background image — positioned to the right so only product/garlic show */}
      <div
        className="absolute inset-0 bg-no-repeat hidden md:block"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: "auto 110%",
          backgroundPosition: "right center",
        }}
      />
      {/* Mobile fallback — show full image cropped */}
      <div
        className="absolute inset-0 bg-cover bg-center md:hidden opacity-30"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      {/* Dark gradient overlay — fully cover left half to hide original text */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, hsl(18 22% 8%) 0%, hsl(18 22% 8%) 42%, rgba(20,14,10,0.72) 55%, rgba(20,14,10,0.15) 72%, rgba(20,14,10,0) 88%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-10 lg:px-16 py-8 lg:py-10 min-h-screen flex flex-col">
        {/* Top logo */}
        <div className="flex justify-start lg:max-w-[520px]">
          <Logo />
        </div>

        {/* Main copy */}
        <div className="mt-6 lg:mt-8 max-w-xl">
          <h1 className="font-display text-[hsl(var(--foreground))] leading-[0.95] tracking-tight">
            <span className="block text-6xl sm:text-7xl lg:text-[88px]">
              ALHO
            </span>
            <span className="block text-6xl sm:text-7xl lg:text-[88px]">
              TRITURADO
            </span>
          </h1>

          <div className="mt-4 flex items-center gap-3 text-[hsl(var(--accent))]">
            <span className="h-px w-6 bg-[hsl(var(--primary))]" />
            <span className="font-serif italic text-3xl sm:text-4xl">
              Com Sal
            </span>
            <span className="h-px w-6 bg-[hsl(var(--primary))]" />
          </div>

          <p className="mt-6 text-lg sm:text-xl text-[hsl(var(--foreground))]/90 leading-relaxed max-w-md">
            Mais{" "}
            <span className="text-[hsl(var(--accent))] font-semibold">
              sabor
            </span>{" "}
            e{" "}
            <span className="text-[hsl(var(--accent))] font-semibold">
              praticidade
            </span>
            <br />
            para o seu dia a dia.
          </p>

          {/* Divider */}
          <div className="mt-8 h-px w-full max-w-md bg-gradient-to-r from-[hsl(var(--accent))]/40 via-[hsl(var(--accent))]/20 to-transparent" />

          {/* Features */}
          <div className="mt-8 flex items-start gap-8 sm:gap-12">
            <FeatureIcon label="Já vem com sal na medida">
              <GarlicIcon />
            </FeatureIcon>
            <div className="h-16 w-px bg-[hsl(var(--accent))]/20" />
            <FeatureIcon label="Pronto para usar">
              <SpoonIcon />
            </FeatureIcon>
            <div className="h-16 w-px bg-[hsl(var(--accent))]/20" />
            <FeatureIcon label="Feito com alho selecionado">
              <GarlicBulbIcon />
            </FeatureIcon>
          </div>

          {/* CTA */}
          <button
            className="mt-10 group inline-flex items-center justify-center gap-3 rounded-md bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 active:scale-[0.99] transition-all text-[hsl(var(--primary-foreground))] font-bold tracking-wide px-10 py-4 text-base sm:text-lg shadow-[0_10px_30px_-10px_rgba(220,40,40,0.6)] w-full max-w-md"
            data-testid="button-buy"
          >
            <ShoppingCart className="h-5 w-5" />
            COMPRAR AGORA
          </button>

          {/* Trust */}
          <div className="mt-6 flex items-center gap-6 text-sm text-[hsl(var(--muted-foreground))]">
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[hsl(var(--accent))]" />
              Compra segura
            </span>
            <span className="h-4 w-px bg-[hsl(var(--muted-foreground))]/30" />
            <span className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-[hsl(var(--accent))]" />
              Privacidade protegida
            </span>
          </div>
        </div>

        <div className="flex-1" />
      </div>
    </section>
  );
}

function App() {
  return <Hero />;
}

export default App;
