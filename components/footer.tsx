// Footer is a Server Component - no client interactivity needed
import { cn } from "@/lib/utils";
import { Mail, Twitter, Instagram, Github } from "lucide-react";
import Link from "next/link";

export function Footer({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "mt-12 rounded-3xl border border-white/10 bg-gradient-to-br from-white/70 via-white/40 to-white/20 p-10 shadow-[0_20px_120px_-40px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:mt-16",
        className
      )}
    >
      {/* Top section */}
      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
        {/* Brand */}
        <div className="max-w-sm space-y-4">
          <div className="flex items-center gap-2 text-xl font-bold">
            <span className="text-primary">●</span> PaperChai
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Money Autopilot for freelancers who hate chasing. Trusted by 1,200+ creators, studios,
            and consultants.
          </p>
          {/* Socials */}
          <div className="flex items-center gap-4 pt-2">
            {[Twitter, Instagram, Github, Mail].map((Icon, idx) => (
              <a
                key={idx}
                href="#"
                className="rounded-full p-2 transition hover:bg-primary/10 hover:text-primary"
              >
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>

        {/* Links */}
        <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-4">
          <div className="space-y-3">
            <p className="font-semibold text-foreground/90">Product</p>
            <FooterLink label="Features" href="#features" />
            <FooterLink label="Pricing" href="#pricing" />
            <FooterLink label="Templates" />
            <FooterLink label="Integrations" />
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-foreground/90">Company</p>
            <FooterLink label="About" />
            <FooterLink label="Careers" />
            <FooterLink label="Press" />
            <FooterLink label="Roadmap" />
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-foreground/90">Support</p>
            <FooterLink label="Help Center" />
            <FooterLink label="Tutorials" />
            <FooterLink label="FAQ" href="#faq" />
            <FooterLink label="Contact" href="/contact-us" />
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-foreground/90">Legal</p>
            <FooterLink label="Privacy Policy" href="/privacy-policy" />
            <FooterLink label="Terms & Conditions" href="/terms-and-conditions" />
            <FooterLink label="Refund Policy" href="/refund-policy" />
            <FooterLink label="Cookie Policy" href="/cookie-policy" />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="my-10 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Bottom */}
      <div className="flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
        <p>© PaperChai 2025. All rights reserved.</p>
        <div className="flex items-center gap-4 text-[10px] opacity-60">
          <span>Reliable invoicing for the global creator economy.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  label,
  href = "#",
  small,
}: {
  label: string;
  href?: string;
  small?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "block text-muted-foreground transition hover:text-primary hover:underline decoration-primary/40",
        small && "text-[11px]"
      )}
    >
      {label}
    </Link>
  );
}
