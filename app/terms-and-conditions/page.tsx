import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { getSiteLegalDetails } from "@/lib/legal/site-details";

export const metadata = {
  title: "Terms and Conditions | PaperChai",
};

export default function TermsAndConditionsPage() {
  const legal = getSiteLegalDetails();
  return (
    <LegalPageShell eyebrow="Terms" title="Terms and Conditions" updatedAt="March 27, 2026">
      <h2>Use of the service</h2>
      <p>
        PaperChai is provided for freelancers, consultants, and small teams to create invoices,
        manage receivables, automate reminders, and operate related billing workflows.
      </p>

      <h2>Account responsibility</h2>
      <p>
        You are responsible for maintaining the security of your account, your workspace members,
        connected integrations, and the information you send through the platform.
      </p>

      <h2>Acceptable use</h2>
      <p>
        You may not use PaperChai for illegal activity, fraud, abusive messaging, unauthorized data
        access, or attempts to interfere with the platform or other users.
      </p>

      <h2>Billing and subscriptions</h2>
      <p>
        Paid plans are billed according to the selected billing cycle. You may upgrade, downgrade,
        or cancel your subscription subject to the billing and refund rules published on the site.
      </p>

      <h2>Cancellation and refunds</h2>
      <p>
        Customers can cancel their subscription at any time. We charge only for the service used up
        to the cancellation date, and the remaining unused prepaid amount will be refunded according
        to our refund policy.
      </p>

      <h2>Third-party services</h2>
      <p>
        Integrations such as email, Slack, Notion, payment providers, or storage providers are
        subject to their own terms and availability. We are not responsible for downtime or policy
        changes from those third parties.
      </p>

      <h2>Service availability</h2>
      <p>
        We aim to keep the service reliable, but we do not guarantee uninterrupted availability. We
        may update, change, suspend, or discontinue parts of the service as needed.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, PaperChai is not liable for indirect, incidental,
        special, or consequential damages arising from use of the platform.
      </p>

      <h2>Contact</h2>
      <p>
        For legal or account questions, contact{" "}
        <a href={`mailto:${legal.supportEmail}`}>{legal.supportEmail}</a>.
      </p>
    </LegalPageShell>
  );
}
