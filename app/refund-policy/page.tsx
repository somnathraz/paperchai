import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { getSiteLegalDetails } from "@/lib/legal/site-details";

export const metadata = {
  title: "Refund Policy | PaperChai",
};

export default function RefundPolicyPage() {
  const legal = getSiteLegalDetails();
  return (
    <LegalPageShell eyebrow="Refunds" title="Refund Policy" updatedAt="March 27, 2026">
      <h2>Subscription cancellation</h2>
      <p>
        Customers can cancel their subscription at any time from the product or by contacting our
        support team.
      </p>

      <h2>How charges are handled</h2>
      <p>
        When a subscription is cancelled, we charge only for the service used up to the cancellation
        date. If you have prepaid for a longer billing period, the remaining unused amount will be
        refunded after deduction of charges for the period already used.
      </p>

      <h2>Refund timeline</h2>
      <p>
        Approved refunds are generally processed back to the original payment method within 5 to 10
        business days. Actual settlement time depends on your payment provider or bank.
      </p>

      <h2>Non-refundable items</h2>
      <p>
        Fees already consumed for completed service periods, third-party charges, taxes, and
        payments blocked due to abuse, fraud, or policy violations are not refundable.
      </p>

      <h2>Billing disputes</h2>
      <p>
        If you think you were charged incorrectly, contact us with your workspace name, invoice or
        payment reference, and the date of payment so we can review it quickly.
      </p>

      <h2>Contact</h2>
      <p>
        For refund questions, contact{" "}
        <a href={`mailto:${legal.supportEmail}`}>{legal.supportEmail}</a>.
      </p>
    </LegalPageShell>
  );
}
