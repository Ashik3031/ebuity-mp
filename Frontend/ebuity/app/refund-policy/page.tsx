import React from "react";
import type { Metadata } from "next";
import { PolicyLayout } from "../../components/legal/PolicyLayout";

export const metadata: Metadata = {
  title: "Refund & Return Policy | Rose Essence Dubai",
  description:
    "Review the official Refund & Return Policy for Rose Essence at-home beauty and wellness services across Dubai, UAE.",
};

export default function RefundPolicyPage() {
  return (
    <PolicyLayout
      title="Refund & Return Policy"
      subtitle="Clear, fair guidelines on refund eligibility, service corrections, and payment reconciliation in Dubai."
      lastUpdated="November 19, 2026"
    >
      {/* Intro */}
      <div className="pb-8 space-y-4">
        <p className="text-base text-[#292525] font-serif leading-relaxed">
          At <strong className="font-semibold">Rose Essence</strong>, customer satisfaction is an essential part of our commitment to delivering a luxurious, professional, and comfortable at-home beauty experience. We aim to ensure that every client receives the services they have booked with utmost care, quality, and attention to detail.
        </p>
        <p>
          This Refund &amp; Return Policy explains the conditions under which customers may request a refund, report a service-related concern, or seek an appropriate resolution for an appointment booked through Rose Essence.
        </p>
        <div className="p-3.5 rounded-2xl bg-stone-50 border border-[#E8D8C8] text-xs text-[#292525]">
          <strong>Service Scope:</strong> Rose Essence exclusively provides at-home beauty and wellness services across Dubai, UAE. We do not sell physical products through our website. Therefore, this policy applies to service bookings and payments rather than physical product returns.
        </div>
      </div>

      {/* 1. Scope of This Policy */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          1. Scope of This Policy
        </h2>
        <p>
          This policy applies to all beauty and wellness services booked through the Rose Essence website or official communication channels. It covers:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-[#4A4543]">
          <li>Cancellation of confirmed appointments.</li>
          <li>Services cancelled or unavailable due to Rose Essence operational reasons.</li>
          <li>Incomplete or improperly performed treatments.</li>
          <li>Customer dissatisfaction with a completed service.</li>
          <li>Duplicate, incorrect, or unsuccessful payment transactions.</li>
          <li>Refund requests relating to service interruptions.</li>
          <li>Other valid service-related complaints and refund requests.</li>
        </ul>
        <p className="text-xs text-[#746D69]">
          All refund requests are reviewed individually based on booking records, the nature of the concern, the service delivered, and applicable UAE consumer protection regulations.
        </p>
      </div>

      {/* 2. Refund Eligibility */}
      <div className="py-8 space-y-4">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          2. Refund Eligibility
        </h2>
        <p>Customers may be eligible for a full or partial refund in the following situations:</p>

        <div className="space-y-4 pl-1 sm:pl-4">
          <div>
            <h3 className="font-semibold text-[#292525]">2.1 Cancellation by Rose Essence</h3>
            <p className="text-[#4A4543]">
              If Rose Essence cancels a confirmed appointment due to professional unavailability, operational issues, or circumstances within our control, we will offer an alternative appointment time. If the customer declines the alternative or we are unable to provide the service, the full amount paid for the affected service will be promptly refunded.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[#292525]">2.2 Unavailable Services</h3>
            <p className="text-[#4A4543]">
              If a customer has paid for a particular beauty service that Rose Essence cannot deliver, the amount paid for that specific service will be refunded. If a multi-service booking is partially unavailable, the refund will be calculated proportionally.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[#292525]">2.3 Incomplete Services</h3>
            <p className="text-[#4A4543]">
              If a service is interrupted or not completed due to circumstances attributable to Rose Essence or the assigned professional, we will arrange:
            </p>
            <ul className="list-disc pl-5 pt-1 space-y-0.5 text-xs text-[#4A4543]">
              <li>Completion of the remaining service at a mutually agreed appointment, or</li>
              <li>Re-performance of the affected treatment without extra charges, or</li>
              <li>A proportionate partial refund for the uncompleted portion, or</li>
              <li>A full refund where the service cannot reasonably be completed.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-[#292525]">2.4 Improperly Performed Services</h3>
            <p className="text-[#4A4543]">
              If a treatment is not performed in accordance with the agreed service description or professional hygiene/beauty standards, customers are encouraged to contact us promptly. Solutions may include a complimentary service correction, re-performance, or an appropriate refund.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[#292525]">2.5 Duplicate or Incorrect Payments</h3>
            <p className="text-[#4A4543]">
              If a customer is charged twice for the same booking or an incorrect total is collected, we will verify the gateway transaction. Once verified, the duplicate or excess amount will be refunded immediately.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[#292525]">2.6 Payment Without Service Confirmation</h3>
            <p className="text-[#4A4543]">
              If an online payment is captured but the appointment cannot be confirmed due to slot unavailability or area coverage, a full refund will be processed promptly.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Refunds for Unsatisfactory Services */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          3. Refunds for Unsatisfactory Services
        </h2>
        <p>
          If you are dissatisfied with a completed treatment, please contact our concierge as soon as reasonably possible, preferably within <strong className="text-[#292525]">24 hours</strong> of the appointment.
        </p>
        <p className="text-[#746D69] text-xs">Please provide:</p>
        <ul className="list-disc pl-5 space-y-1 text-xs text-[#4A4543]">
          <li>Your booking reference number (e.g. RB-XXXXXXXX).</li>
          <li>Name of the service received.</li>
          <li>Appointment date, time, and service location.</li>
          <li>A clear description of the concern.</li>
          <li>Relevant photographs where appropriate and voluntarily provided.</li>
        </ul>
        <p>
          Depending on the evaluation, we may offer:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-[#4A4543]">
          <li><strong>Service Correction:</strong> Complimentary touch-up or re-performance by a senior aesthetician.</li>
          <li><strong>Partial Refund:</strong> If only part of a package or treatment was unsatisfactory.</li>
          <li><strong>Full Refund:</strong> Where the service materially failed to meet basic agreed requirements.</li>
        </ul>
        <p className="text-xs text-[#746D69]">
          The 24-hour reporting window helps us investigate promptly and does not restrict mandatory statutory consumer rights under UAE law.
        </p>
      </div>

      {/* 4. Refunds for Customer Cancellations */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          4. Refunds for Customer Cancellations
        </h2>
        <p>
          Refunds for appointments cancelled by the customer are assessed under our <strong className="text-[#292525]">Cancellation &amp; At-Home Service Delivery Policy</strong>. The refundable amount depends on the notice period provided prior to the scheduled start time and whether the therapist had already been dispatched.
        </p>
      </div>

      {/* 5. Circumstances Where a Refund May Not Apply */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          5. Circumstances Where a Refund May Not Apply
        </h2>
        <p>A refund may not be granted in the following situations, subject to agreed booking terms and UAE law:</p>
        <ul className="list-disc pl-5 space-y-1 text-[#4A4543]">
          <li>The customer cancels after the agreed cancellation cut-off window.</li>
          <li>The customer is unavailable at the confirmed service address and does not provide property access after reasonable contact attempts (no-show).</li>
          <li>The customer changes their mind after the service has been fully and properly performed.</li>
          <li>The service cannot proceed because the customer failed to disclose essential allergy/health information or failed to provide a safe working environment.</li>
        </ul>
      </div>

      {/* 6. Refunds for Home Service Appointments */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          6. Refunds for Home Service Appointments
        </h2>
        <div className="space-y-3 pl-1 sm:pl-4">
          <div>
            <h3 className="font-semibold text-[#292525]">6.1 Incorrect Service Address</h3>
            <p className="text-[#4A4543]">
              Customers are responsible for supplying accurate property and access details. If an incorrect address prevents our therapist from arriving, our team will attempt to coordinate alternative arrangements.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-[#292525]">6.2 Customer Unavailability</h3>
            <p className="text-[#4A4543]">
              If the client is absent or our team cannot enter the building after repeated contact attempts, the booking will be handled under our no-show terms.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-[#292525]">6.3 Unsuitable Service Environment</h3>
            <p className="text-[#4A4543]">
              If a location lacks basic essentials (e.g. electricity, running water) or presents genuine safety hazards, the therapist may pause the appointment for assessment.
            </p>
          </div>
        </div>
      </div>

      {/* 7. How to Submit a Refund Request */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          7. How to Submit a Refund Request
        </h2>
        <p>To request a refund, contact our concierge via email or WhatsApp with:</p>
        <ul className="list-disc pl-5 space-y-1 text-[#4A4543]">
          <li>Full name and registered contact number.</li>
          <li>Booking reference number (e.g. RB-XXXXXXXX).</li>
          <li>Date, time, and service booked.</li>
          <li>Payment method used (Noon Payments Card / Cash).</li>
          <li>Detailed reason for the refund request and supporting photos if applicable.</li>
        </ul>
        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
          <strong>Security Notice:</strong> Never send your full credit card number, PIN, OTP, or CVV code. We only require your booking reference to locate transactions.
        </div>
      </div>

      {/* 8. Refund Review and Approval Process */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          8. Refund Review and Approval Process
        </h2>
        <ol className="list-decimal pl-5 space-y-2 text-[#4A4543]">
          <li><strong>Request Submission:</strong> Client submits booking and payment details to our support team.</li>
          <li><strong>Verification:</strong> Our team checks transaction records, therapist reports, and scheduling timestamps.</li>
          <li><strong>Assessment:</strong> We evaluate service quality, completion degree, and customer feedback.</li>
          <li><strong>Resolution:</strong> We communicate our decision (correction, partial refund, or full refund).</li>
          <li><strong>Processing:</strong> Upon approval, the refund is initiated via the original payment gateway.</li>
        </ol>
      </div>

      {/* 9. Refund Processing Time */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          9. Refund Processing Time
        </h2>
        <p>
          Approved refunds will typically be initiated within <strong className="text-[#292525]">3 to 5 business days</strong> following our confirmation. The time required for funds to reflect in your bank account depends on your card issuer and payment gateway (typically 5 to 14 business days).
        </p>
      </div>

      {/* 10. Refund Methods */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          10. Refund Methods
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-[#4A4543]">
          <li>
            <strong>10.1 Online Card Payments (Noon Payments):</strong> Refunds are reversed directly to the original card used during checkout through our secure payment gateway.
          </li>
          <li>
            <strong>10.2 Cash Payments:</strong> Approved cash refunds are arranged via direct UAE bank transfer or official company voucher, as mutually agreed.
          </li>
          <li>
            <strong>10.3 Gateway Charges:</strong> No unauthorized deductions will be made where a customer is legally entitled to a full refund under UAE law.
          </li>
        </ul>
      </div>

      {/* 11. Partial Refunds */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          11. Partial Refunds
        </h2>
        <p>
          In cases of multi-service appointments where only one service could not be delivered, or where a service was partially completed, a proportionate partial refund will be calculated and clearly explained before being processed.
        </p>
      </div>

      {/* 12. No Physical Product Returns or Exchanges */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          12. No Physical Product Returns or Exchanges
        </h2>
        <p>
          Rose Essence operates as an at-home service provider and does not sell standalone physical retail products online. Consequently, standard retail return or exchange procedures do not apply. If physical product sales are introduced in the future, distinct retail return terms will be published.
        </p>
      </div>

      {/* 13. Customer Support and Complaints */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          13. Customer Support and Complaints
        </h2>
        <p>
          We encourage customers to contact our concierge first if any issue arises. We are committed to resolving concerns amicably and fairly. Customers always retain their statutory rights to approach the Dubai Department of Economy and Tourism (DET) Consumer Protection division.
        </p>
      </div>

      {/* 14. Changes to This Policy */}
      <div className="pt-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          14. Changes to This Policy
        </h2>
        <p>
          Rose Essence may update this Refund &amp; Return Policy to reflect evolving services, payment gateway enhancements, or UAE regulatory updates. Any changes will be posted on this page with an updated Last Updated date.
        </p>
      </div>
    </PolicyLayout>
  );
}
