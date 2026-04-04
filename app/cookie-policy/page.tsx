import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { getSiteLegalDetails } from "@/lib/legal/site-details";

export const metadata = {
  title: "Cookie Policy | PaperChai",
};

export default function CookiePolicyPage() {
  const legal = getSiteLegalDetails();
  return (
    <LegalPageShell eyebrow="Cookies" title="Cookie Policy" updatedAt="March 27, 2026">
      <h2>What are cookies?</h2>
      <p>
        Cookies are small text files that websites place on your device as you browse. They are
        processed and stored by your web browser. In and of themselves, cookies are harmless and
        serve crucial functions for websites.
      </p>

      <h2>How we use cookies</h2>
      <p>
        We use cookies to understand how you interact with our site, to save your preferences, and
        to provide you with a more personalized experience. We use both first-party and third-party
        cookies for these purposes.
      </p>

      <h2>Types of cookies we use</h2>
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Essential Cookies</h3>
          <p className="text-sm text-muted-foreground mt-1">
            These are necessary for the website to function. They allow you to log in, navigate the
            site, and use its features securely.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Analytics Cookies</h3>
          <p className="text-sm text-muted-foreground mt-1">
            We use these to collect information about how visitors use our site. This helps us
            improve the user experience by identifying errors or seeing which pages are most
            popular.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Preference Cookies</h3>
          <p className="text-sm text-muted-foreground mt-1">
            These remember choices you&apos;ve made, such as your language preference or workspace
            settings, to provide a more tailored experience.
          </p>
        </div>
      </div>

      <h2>Your choices</h2>
      <p>
        Most web browsers allow you to control cookies through their settings. You can set your
        browser to block cookies, although this may affect your ability to use certain features of
        PaperChai.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy from time to time to reflect changes in our practices or for other
        operational, legal, or regulatory reasons.
      </p>

      <h2>Contact</h2>
      <p>
        If you have any questions about our use of cookies, please contact us at{" "}
        <a href={`mailto:${legal.supportEmail}`}>{legal.supportEmail}</a>.
      </p>
    </LegalPageShell>
  );
}
