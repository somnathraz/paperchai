import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { getSiteLegalDetails } from "@/lib/legal/site-details";

export const metadata = {
  title: "Contact Us | PaperChai",
};

export default function ContactUsPage() {
  const legal = getSiteLegalDetails();
  return (
    <LegalPageShell eyebrow="Support" title="Contact Us" updatedAt="March 27, 2026">
      <h2>General support</h2>
      <p>
        For product help, billing questions, refunds, or account issues, email us at{" "}
        <a href={`mailto:${legal.supportEmail}`}>{legal.supportEmail}</a>.
      </p>

      <h2>What to include</h2>
      <p>
        To help us resolve issues faster, include your workspace name, registered email address,
        invoice number or payment reference if relevant, and a short description of the issue.
      </p>

      <h2>Business and partnership inquiries</h2>
      <p>
        For partnerships or business discussions, contact{" "}
        <a href={`mailto:${legal.businessEmail}`}>{legal.businessEmail}</a>.
      </p>

      <h2>Business details</h2>
      <p>{legal.companyName}</p>
      <p>{legal.businessAddress}</p>
      {legal.contactPhone ? <p>Phone: {legal.contactPhone}</p> : null}

      <h2>Response time</h2>
      <p>
        We usually respond within 1 to 2 business days. Payment and access issues are prioritized.
      </p>
    </LegalPageShell>
  );
}
