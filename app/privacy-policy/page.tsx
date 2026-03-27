import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { getSiteLegalDetails } from "@/lib/legal/site-details";

export const metadata = {
  title: "Privacy Policy | PaperChai",
};

export default function PrivacyPolicyPage() {
  const legal = getSiteLegalDetails();
  return (
    <LegalPageShell eyebrow="Privacy" title="Privacy Policy" updatedAt="March 27, 2026">
      <h2>What we collect</h2>
      <p>
        We collect the information needed to provide PaperChai, such as your name, email, workspace
        details, invoice data, client data, project data, and payment-related records.
      </p>

      <h2>How we use it</h2>
      <p>
        We use this information to operate the product, generate invoices, send reminders, support
        integrations, improve reliability, and provide customer support.
      </p>

      <h2>Payment data</h2>
      <p>
        If you use payment providers such as Razorpay, payment processing is handled by that
        provider. We store only the payment information needed for invoice reconciliation, such as
        payment status, amount received, reference ID, and payment date.
      </p>

      <h2>Sharing</h2>
      <p>
        We do not sell your personal data. We may share limited information with service providers
        that help us operate the platform, such as email, hosting, storage, analytics, and payment
        providers.
      </p>

      <h2>Security</h2>
      <p>
        We use reasonable technical and operational measures to protect your data. No system is
        perfectly secure, so you should also protect your account credentials and connected
        integrations.
      </p>

      <h2>Data retention</h2>
      <p>
        We keep your data for as long as your account is active or as needed to provide the service,
        comply with legal obligations, resolve disputes, and enforce agreements.
      </p>

      <h2>Your choices</h2>
      <p>
        You can update your account data, workspace data, and billing details inside the product.
        You can also request account-related help by contacting us.
      </p>

      <h2>Contact</h2>
      <p>
        For privacy questions, contact us at{" "}
        <a href={`mailto:${legal.supportEmail}`}>{legal.supportEmail}</a>.
      </p>
    </LegalPageShell>
  );
}
