import {
  ShoppingCart,
  Shield,
  Lock,
  Heart,
  ShieldCheck,
  Leaf,
  CheckCircle2,
  Refrigerator,
  Calendar,
  Weight,
} from "lucide-react";
import heroImage from "@/assets/hero.png";
import steakImage from "@/assets/steak.jpg";
import dishCarnes from "@/assets/carnes.png";
import dishArroz from "@/assets/arroz.png";
import dishMolhos from "@/assets/molhos.png";
import dishRefogados from "@/assets/refogados.png";
import logoImage from "@/assets/logo.png";
import productImage from "@/assets/product.png";

function Logo({ className = "h-24 w-auto" }: { className?: string }) {
  return (
    <img
      src={logoImage}
      alt="DN. Maria"
      className={`${className} drop-shadow-[0_0_18px_rgba(212,175,90,0.25)]`}
    />
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
      {/* Background scene */}
      <div
        className="absolute inset-0 bg-no-repeat opacity-60 hidden md:block"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: "auto 110%",
          backgroundPosition: "right center",
        }}
      />
      {/* Product photo overlay (right side) */}
      <div className="absolute inset-y-0 right-0 hidden md:flex items-center pr-6 lg:pr-12 z-[1]">
        <img
          src={productImage}
          alt="Pote DN. Maria Alho Triturado com Sal"
          className="h-[78%] w-auto object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
        />
      </div>
      {/* Mobile product */}
      <div className="absolute inset-x-0 bottom-0 md:hidden flex justify-center pointer-events-none opacity-90">
        <img
          src={productImage}
          alt=""
          className="h-[42vh] w-auto object-contain"
        />
      </div>
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

function BenefitItem({
  icon,
  bold,
  rest,
}: {
  icon: React.ReactNode;
  bold: string;
  rest: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-5 sm:gap-6">
      <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-[#d4af5a]/40 flex items-center justify-center text-[#b8902f] bg-white shadow-[0_4px_12px_rgba(180,140,40,0.08)]">
        {icon}
      </div>
      <p className="text-[#3a2a1a] text-base sm:text-lg leading-snug">
        <span className="block">{rest}</span>
        <span className="block font-bold">{bold}</span>
      </p>
    </div>
  );
}

function BigGarlicIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
      <path
        d="M24 6 C18 10 14 16 14 24 C14 33 18 40 24 42 C30 40 34 33 34 24 C34 16 30 10 24 6 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M24 6 L24 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 18 C18 24 19 34 22 41" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <path d="M29 18 C30 24 29 34 26 41" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <path d="M24 12 L24 41" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
    </svg>
  );
}

function BigSpoonIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
      <ellipse cx="24" cy="16" rx="11" ry="9" fill="currentColor" />
      <path d="M24 25 L24 44" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function FlavorSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-2 items-stretch">
        <div className="aspect-[4/3] md:aspect-auto md:min-h-[420px] overflow-hidden">
          <img
            src={steakImage}
            alt="Prato com carne suculenta e batatas temperadas"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col justify-center px-8 sm:px-12 py-12 md:py-16">
          <h2 className="text-[#1a1a1a] text-3xl sm:text-4xl lg:text-5xl font-semibold leading-tight">
            Menos tempo
            <br />
            na cozinha.
          </h2>
          <h3 className="mt-3 text-[hsl(var(--primary))] text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
            Mais sabor
            <br />
            no prato.
          </h3>
          <p className="mt-6 text-[#5a5a5a] text-base sm:text-lg leading-relaxed max-w-md">
            Ideal para quem busca praticidade sem abrir mão do sabor caseiro
            em todas as receitas.
          </p>
        </div>
      </div>
    </section>
  );
}

function DishCircle({ src, label }: { src: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden ring-2 ring-[#d4af5a] ring-offset-4 ring-offset-[#fbf7f0] shadow-[0_8px_24px_rgba(180,140,40,0.15)]">
        <img src={src} alt={label} className="w-full h-full object-cover" />
      </div>
      <p className="mt-5 text-[#2a1d12] text-base sm:text-lg">{label}</p>
    </div>
  );
}

function DishesSection() {
  return (
    <section className="bg-[#fbf7f0] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-6 sm:px-10 text-center">
        <h2 className="text-[#1a1a1a] text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
          Ideal para
          <br className="sm:hidden" />
          <span className="sm:ml-2">diversos pratos</span>
        </h2>
        <div className="mx-auto mt-5 h-1 w-16 rounded-full bg-[#d4af5a]" />

        <div className="mt-12 sm:mt-16 grid grid-cols-2 md:grid-cols-4 gap-10 sm:gap-8 justify-items-center">
          <DishCircle src={dishCarnes} label="Carnes" />
          <DishCircle src={dishArroz} label="Arroz e feijão" />
          <DishCircle src={dishMolhos} label="Molhos" />
          <DishCircle src={dishRefogados} label="Refogados" />
        </div>
      </div>
    </section>
  );
}

function WhyItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center px-2">
      <div className="text-[#b8902f]">{icon}</div>
      <h3 className="mt-5 text-[#1a1a1a] text-lg sm:text-xl font-bold leading-tight">
        {title}
      </h3>
      <p className="mt-3 text-[#5a5a5a] text-sm sm:text-base leading-relaxed max-w-[200px]">
        {description}
      </p>
    </div>
  );
}

function WhySection() {
  return (
    <section className="bg-[#fbf7f0] py-16 sm:py-24 border-t border-[#2a1d12]/10">
      <div className="mx-auto max-w-6xl px-6 sm:px-10 text-center">
        <h2 className="text-[#1a1a1a] text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
          Por que escolher
          <br />
          DN. Maria?
        </h2>
        <div className="mx-auto mt-5 h-1 w-16 rounded-full bg-[#d4af5a]" />

        <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 sm:gap-8">
          <WhyItem
            icon={<Heart className="w-12 h-12" strokeWidth={1.5} />}
            title={<>Sabor<br />equilibrado</>}
            description="Sal na medida certa para realçar suas receitas."
          />
          <WhyItem
            icon={<ShieldCheck className="w-12 h-12" strokeWidth={1.5} />}
            title={<>Qualidade<br />premium</>}
            description="Alhos selecionados e processo cuidadoso."
          />
          <WhyItem
            icon={<Leaf className="w-12 h-12" strokeWidth={1.5} />}
            title={<>Sem<br />conservantes</>}
            description="Produto natural, sem aditivos químicos."
          />
          <WhyItem
            icon={<CheckCircle2 className="w-12 h-12" strokeWidth={1.5} />}
            title={<>Consistência<br />ideal</>}
            description="Textura perfeita para facilitar sua rotina na cozinha."
          />
        </div>
      </div>
    </section>
  );
}

function GarlicSmallIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3 C9 6 7 9 7 14 C7 19 9 21 12 21 C15 21 17 19 17 14 C17 9 15 6 12 3 Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M12 3 L12 1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12 8 L12 21" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
      <path d="M9.5 14 C9.5 17 10.5 19.5 12 21" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
      <path d="M14.5 14 C14.5 17 13.5 19.5 12 21" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
    </svg>
  );
}

function ProductInfoRow({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-[#2a1d12]/10 last:border-b-0">
      <div className="shrink-0 w-11 h-11 rounded-md bg-[#fbf7f0] flex items-center justify-center text-[#b8902f]">
        {icon}
      </div>
      <div className="flex-1 pt-0.5">
        <p className="text-[#1a1a1a] font-bold text-base sm:text-lg">{title}</p>
        <p className="mt-1 text-[#5a5a5a] text-sm sm:text-base leading-relaxed">
          {children}
        </p>
      </div>
    </div>
  );
}

function ProductInfoSection() {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-6 sm:px-10 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
        <div className="flex justify-center">
          <div className="w-full max-w-[360px] aspect-square rounded-2xl bg-gradient-to-br from-[#f5efe4] to-[#ece2cf] flex items-center justify-center p-6">
            <img
              src={productImage}
              alt="Pote DN. Maria Alho Triturado com Sal"
              className="w-full h-full object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.18)]"
            />
          </div>
        </div>

        <div>
          <h2 className="text-[#1a1a1a] text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
            Informações do produto
          </h2>
          <div className="mt-5 h-1 w-16 rounded-full bg-[#d4af5a]" />

          <div className="mt-8 rounded-xl border border-[#2a1d12]/10 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)] px-5 sm:px-6">
            <ProductInfoRow
              icon={<GarlicSmallIcon className="w-6 h-6" />}
              title="Ingredientes:"
            >
              Alho, sal e estabilizante (INS 330).
            </ProductInfoRow>
            <ProductInfoRow
              icon={<Refrigerator className="w-6 h-6" strokeWidth={1.7} />}
              title="Armazenamento:"
            >
              Manter em local seco e fresco.
              <br />
              Após aberto, manter refrigerado.
            </ProductInfoRow>
            <ProductInfoRow
              icon={<Calendar className="w-6 h-6" strokeWidth={1.7} />}
              title="Validade:"
            >
              6 meses a partir da data de fabricação.
            </ProductInfoRow>
            <ProductInfoRow
              icon={<Weight className="w-6 h-6" strokeWidth={1.7} />}
              title="Peso líquido:"
            >
              1 kg
            </ProductInfoRow>
          </div>
        </div>
      </div>
    </section>
  );
}

function FooterCTA() {
  return (
    <section className="relative overflow-hidden bg-[hsl(18_22%_8%)]">
      <div
        className="absolute inset-0 bg-no-repeat bg-cover opacity-50"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundPosition: "right center",
        }}
      />
      <div className="absolute inset-y-0 right-0 hidden md:flex items-center pr-8 z-[1]">
        <img
          src={productImage}
          alt=""
          className="h-[85%] w-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
        />
      </div>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, hsl(18 22% 8%) 0%, hsl(18 22% 8%) 35%, rgba(20,14,10,0.78) 50%, rgba(20,14,10,0.2) 70%, rgba(20,14,10,0) 88%)",
        }}
      />
      <div className="relative z-10 mx-auto max-w-6xl px-6 sm:px-10 py-14 sm:py-20">
        <div className="max-w-xl">
          <h2 className="text-white text-3xl sm:text-4xl lg:text-5xl font-semibold leading-tight">
            Tenha mais praticidade
            <br />
            <span className="text-[hsl(var(--accent))] font-bold">
              na sua cozinha hoje.
            </span>
          </h2>

          <button
            className="mt-8 group inline-flex items-center justify-center gap-3 rounded-md bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 active:scale-[0.99] transition-all text-[hsl(var(--primary-foreground))] font-bold tracking-wide px-10 py-4 text-base sm:text-lg shadow-[0_10px_30px_-10px_rgba(220,40,40,0.6)] w-full max-w-md"
            data-testid="button-buy-footer"
          >
            <ShoppingCart className="h-5 w-5" />
            COMPRAR AGORA
          </button>

          <div className="mt-6 flex items-center gap-6 text-sm text-white/75">
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[hsl(var(--accent))]" />
              Compra segura
            </span>
            <span className="h-4 w-px bg-white/25" />
            <span className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-[hsl(var(--accent))]" />
              Privacidade protegida
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#0f0a06] text-white/70 py-10 border-t border-white/10">
      <div className="mx-auto max-w-6xl px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
        <img src={logoImage} alt="DN. Maria" className="h-14 w-auto" />
        <p className="text-white/50">
          © {new Date().getFullYear()} DN. Maria — Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}

function App() {
  return (
    <>
      <Hero />
      <BenefitsRow />
      <FlavorSection />
      <DishesSection />
      <WhySection />
      <ProductInfoSection />
      <FooterCTA />
      <Footer />
    </>
  );
}

function BenefitsRow() {
  return (
    <section className="bg-[#fbf7f0] py-14 sm:py-20 border-t-2 border-[#2a1d12]">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12 md:gap-6">
          <BenefitItem
            icon={<BigGarlicIcon />}
            rest={<>Já vem com</>}
            bold={"sal na medida certa"}
          />
          <div className="hidden md:block w-px h-20 bg-[#2a1d12]/15" />
          <BenefitItem
            icon={<BigSpoonIcon />}
            rest={<>Pronto</>}
            bold={"para usar"}
          />
          <div className="hidden md:block w-px h-20 bg-[#2a1d12]/15" />
          <BenefitItem
            icon={<BigGarlicIcon />}
            rest={<>Feito com</>}
            bold={"alho selecionado"}
          />
        </div>
      </div>
    </section>
  );
}

export default App;
