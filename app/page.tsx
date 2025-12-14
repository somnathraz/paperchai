import { Features } from "@/components/features";
import { BeforeAfter } from "@/components/before-after";
import { ReminderPreview } from "@/components/reminder-preview";
import { ReliabilityCard } from "@/components/reliability-card";
import { AutomationReel } from "@/components/automation-reel";
import { RecapCard } from "@/components/recap-card";
import { Testimonials } from "@/components/testimonials";
import { Pricing } from "@/components/pricing";
import { FAQ } from "@/components/faq";
import { FinalCTA } from "@/components/final-cta";
import { Footer } from "@/components/footer";
import Header from "@/components/header";
import Hero from "@/components/hero";
import { generateMetadata } from "@/lib/seo-config";
import {
  generateOrganizationSchema,
  generateSoftwareApplicationSchema,
  generateWebSiteSchema,
} from "@/lib/schema-generators";

export const metadata = generateMetadata({
  title: "PaperChai - Invoice Generator for Freelancers & Small Companies",
  description:
    "Professional invoice generator for freelancers and small businesses. Create invoices, track client payments, send automated WhatsApp & email reminders, and monitor client reliability scores. Start free today.",
  path: "/",
});

export default function Page() {
  // Generate schema.org structured data
  const organizationSchema = generateOrganizationSchema();
  const softwareSchema = generateSoftwareApplicationSchema();
  const websiteSchema = generateWebSiteSchema();
  return (
    <>
      {/* Schema.org structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />

      <main className="relative min-h-screen overflow-hidden">
        <Header />

        {/* Background gradient orbs */}
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute left-[-10%] top-[-12%] h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.16),transparent_50%)] blur-3xl" />
          <div className="absolute right-[-8%] top-[10%] h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.22),transparent_55%)] blur-3xl" />
          <div className="absolute bottom-[-12%] left-[20%] h-96 w-96 rounded-full bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.18),transparent_52%)] blur-[120px]" />
        </div>

        <div className="relative shell flex flex-col gap-16 pb-20 pt-4 sm:gap-20 sm:pb-24 sm:pt-6">
          <Hero />

          <div className="h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />

          <div id="features" className="space-y-16">
            <Features />
            <BeforeAfter />
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />

          <ReminderPreview />
          <ReliabilityCard />
          <AutomationReel />
          <RecapCard />
          <Testimonials />

          <div className="h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />

          <div id="pricing" className="scroll-mt-16">
            <Pricing />
          </div>
          <div id="faq" className="scroll-mt-16">
            <FAQ />
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />

          <FinalCTA />
          <Footer />
        </div>
      </main>
    </>
  );
}
