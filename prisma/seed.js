const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const templates = [
  { slug: "minimal-light", name: "Minimal Light", isPro: false, tags: "free,light,clean", accent: "from-slate-100 to-white", category: "Free" },
  { slug: "studio-bold", name: "Studio Bold", isPro: false, tags: "free,bold,light", accent: "from-amber-50 to-white", category: "Free" },
  { slug: "neat-receipt", name: "Neat Receipt", isPro: false, tags: "free,receipt,mono", accent: "from-emerald-50 to-white", category: "Free" },
  { slug: "duo-card", name: "Duo Card", isPro: false, tags: "free,split,qr", accent: "from-slate-50 to-white", category: "Free" },
  { slug: "classic-gray", name: "Classic Gray", isPro: false, tags: "free,corporate,gray", accent: "from-slate-100 to-white", category: "Free" },
  { slug: "soft-pastel", name: "Soft Pastel", isPro: false, tags: "free,pastel,rounded", accent: "from-rose-50 to-emerald-50", category: "Free" },
  { slug: "invoice-compact", name: "Invoice Compact", isPro: false, tags: "free,compact,mobile", accent: "from-slate-50 to-white", category: "Free" },
  { slug: "gradient-aura", name: "Gradient Aura", isPro: true, tags: "pro,gradient,light", accent: "from-emerald-100 via-primary/40 to-white", category: "Pro" },
  { slug: "neo-dark", name: "Neo Dark", isPro: true, tags: "pro,dark,fintech", accent: "from-slate-900 via-slate-900 to-slate-800", category: "Pro" },
  { slug: "folio-modern", name: "Folio Modern", isPro: true, tags: "pro,magazine,hero", accent: "from-rose-50 to-white", category: "Pro" },
  { slug: "luxe-gold", name: "Luxe Gold", isPro: true, tags: "pro,gold,premium", accent: "from-amber-50 to-amber-100", category: "Pro" },
  { slug: "edge-minimal-pro", name: "Edge Minimal Pro", isPro: true, tags: "pro,minimal,geometric", accent: "from-slate-50 to-white", category: "Pro" },
  { slug: "split-hero", name: "Split Hero", isPro: true, tags: "pro,hero,visual", accent: "from-slate-50 to-white", category: "Pro" },
  { slug: "essential-pro", name: "Essential Pro", isPro: true, tags: "pro,corporate,tax", accent: "from-slate-50 to-white", category: "Pro" },
  { slug: "multi-brand-dynamic", name: "Multi-Brand Dynamic", isPro: true, tags: "pro,dynamic,brand", accent: "from-primary/20 via-emerald-50 to-white", category: "Pro" },
];

async function main() {
  await Promise.all(
    templates.map((template) =>
      prisma.invoiceTemplate.upsert({
        where: { slug: template.slug },
        update: { ...template },
        create: { ...template },
      })
    )
  );
  console.log("Seeded invoice templates");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
