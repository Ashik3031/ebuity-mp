import React from "react";
import type { Metadata } from "next";
import { PolicyLayout } from "../../components/legal/PolicyLayout";

export const metadata: Metadata = {
  title: "Privacy Policy | Rose Essence Dubai",
  description:
    "Learn how Rose Essence collects, uses, protects, and handles your personal information when booking luxury at-home beauty and wellness services across Dubai, UAE.",
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout
      title="Privacy Policy"
      subtitle="How Rose Essence protects and manages your personal information across Dubai, UAE."
      lastUpdated="November 19, 2026"
    >
      {/* Intro */}
      <div className="pb-8 space-y-4">
        <p className="text-base text-[#292525] font-serif leading-relaxed">
          At <strong className="font-semibold">Rose Essence</strong>, we respect your privacy and are committed to protecting the personal information you share with us. This Privacy Policy explains how we collect, use, store, and protect your information when you visit our website, enquire about our services, or book an at-home beauty and wellness appointment.
        </p>
        <p>
          Rose Essence provides at-home beauty services across Dubai, UAE. We collect and process certain personal information to manage appointments, coordinate service professionals, and deliver services at your requested location.
        </p>
        <p className="text-xs text-[#746D69] italic">
          By using our website or booking our services, you acknowledge that you have read and understood this Privacy Policy.
        </p>
      </div>

      {/* Section 1 */}
      <div className="py-8 space-y-4">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          1. Information We Collect
        </h2>
        <p>
          We may collect the following categories of personal information when you interact with Rose Essence:
        </p>

        <div className="space-y-4 pl-1 sm:pl-4">
          <div>
            <h3 className="font-semibold text-[#292525] text-base">1.1 Personal Information</h3>
            <p className="text-[#746D69] pt-1">This may include:</p>
            <ul className="list-disc pl-5 pt-1.5 space-y-1 text-[#4A4543]">
              <li>Full name</li>
              <li>Contact phone number (mobile / WhatsApp)</li>
              <li>Email address</li>
              <li>Other details you voluntarily provide when contacting our concierge or customer support</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-[#292525] text-base">1.2 Booking Information</h3>
            <p className="text-[#746D69] pt-1">When you request or confirm an appointment, we may collect:</p>
            <ul className="list-disc pl-5 pt-1.5 space-y-1 text-[#4A4543]">
              <li>Selected beauty or wellness service(s) and treatments</li>
              <li>Preferred appointment date and time slot</li>
              <li>Number of individuals receiving the service, where applicable</li>
              <li>Booking reference number and appointment history</li>
              <li>Special requests, beauty preferences, or custom requirements</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-[#292525] text-base">1.3 Location Information</h3>
            <p className="text-[#4A4543] pt-1">
              As Rose Essence operates through an at-home service model, we collect your service address, building name, apartment or villa details, community or area, and any specific access directions necessary to arrange your appointment.
            </p>
            <p className="text-[#746D69] text-xs pt-1">
              This information is used strictly to verify service availability and coordinate the visit of the assigned service professional.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[#292525] text-base">1.4 Payment Information</h3>
            <p className="text-[#4A4543] pt-1">
              We may collect payment-related information, including payment status, gateway transaction references, payment method, and billing details where necessary.
            </p>
            <p className="text-[#4A4543] pt-1">
              Online card payments are processed securely through authorised third-party payment service providers (including Noon Payments). Rose Essence does not store complete payment card details, CVV codes, or banking credentials on its servers.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[#292525] text-base">1.5 Technical Information</h3>
            <p className="text-[#746D69] pt-1">
              When you browse our website, certain technical information may be collected automatically, including:
            </p>
            <ul className="list-disc pl-5 pt-1.5 space-y-1 text-[#4A4543]">
              <li>IP address and approximate geographic location</li>
              <li>Browser type, language, and operating system</li>
              <li>Device information and screen resolution</li>
              <li>Pages visited, time spent, and website interaction data</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Section 2 */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          2. How We Use Your Information
        </h2>
        <p>
          We collect and use personal information for legitimate business and service-related purposes, including:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-[#4A4543]">
          <li>Processing, managing, and confirming your at-home beauty bookings.</li>
          <li>Checking whether your requested location falls within our operational Dubai service coverage zones.</li>
          <li>Coordinating appointments and dispatching qualified, background-verified beauty professionals.</li>
          <li>Communicating booking confirmations, reminders, appointment updates, and staff arrival notices.</li>
          <li>Processing and verifying payments and reconciling financial transactions.</li>
          <li>Responding promptly to customer enquiries, feedback, complaints, and concierge support requests.</li>
          <li>Improving our website performance, service quality, and overall customer experience.</li>
          <li>Maintaining accurate booking, billing, and accounting records.</li>
          <li>Preventing fraudulent transactions and protecting our customers and business integrity.</li>
          <li>Complying with applicable UAE legal, tax, and regulatory requirements.</li>
        </ul>
        <p className="text-xs text-[#746D69] pt-1">
          We will not use your personal information for purposes unrelated to those described in this policy without an appropriate legal basis.
        </p>
      </div>

      {/* Section 3 */}
      <div className="py-8 space-y-4">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          3. Sharing Your Information
        </h2>
        <p>
          Rose Essence may share relevant personal information with selected third parties solely when necessary to operate our business and provide our services:
        </p>

        <div className="space-y-3 pl-1 sm:pl-4">
          <div>
            <h3 className="font-semibold text-[#292525]">3.1 Assigned Service Professionals</h3>
            <p className="text-[#4A4543]">
              Your name, contact number, service selection, scheduled appointment time, and service address are shared with the beauty professional assigned to your booking. This information is shared only to the extent reasonably necessary to coordinate travel, arrive punctually, and complete your at-home appointment.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[#292525]">3.2 Payment Service Providers</h3>
            <p className="text-[#4A4543]">
              Where you make an online payment, relevant transaction information is transmitted through encrypted protocols to our authorised payment gateway providers (such as Noon Payments) to authorise and process the payment securely.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[#292525]">3.3 Technology and Website Providers</h3>
            <p className="text-[#4A4543]">
              We work with secure cloud hosting providers, appointment scheduling systems, analytics services, SMS/email communication gateways, and IT infrastructure partners who support our operations under strict confidentiality agreements.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[#292525]">3.4 Legal and Regulatory Authorities</h3>
            <p className="text-[#4A4543]">
              We may disclose information where required by applicable UAE laws, regulatory mandates, court orders, or lawful requests from competent government authorities.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-stone-50 border border-[#E8D8C8] text-xs font-medium text-[#292525]">
          ✓ We never sell, rent, or trade our customers' personal information to third parties for commercial or marketing purposes.
        </div>
      </div>

      {/* Section 4 */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          4. How We Protect Your Information
        </h2>
        <p>
          We employ robust technical and organizational security measures to protect personal information against unauthorized access, disclosure, alteration, misuse, or loss. These measures include:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-[#4A4543]">
          <li>SSL/TLS encryption for all data transmitted across our website and payment gateways.</li>
          <li>Role-based access controls limiting staff access to customer data on a strict need-to-know basis.</li>
          <li>Encrypted database storage and secure credential management.</li>
          <li>Continuous monitoring and regular security audits.</li>
        </ul>
        <p className="text-xs text-[#746D69]">
          While we implement industry-standard safeguards, no internet-based transmission or electronic storage system can be guaranteed to be 100% immune from external risks.
        </p>
      </div>

      {/* Section 5 */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          5. Data Retention
        </h2>
        <p>
          We retain personal information only for as long as reasonably necessary to fulfil the purposes for which it was collected, including appointment management, customer support, accounting, legal compliance, and dispute resolution.
        </p>
        <p>
          When information is no longer required, we take appropriate steps to securely delete, anonymise, or dispose of it in accordance with applicable UAE legal retention requirements.
        </p>
      </div>

      {/* Section 6 */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          6. Cookies and Website Analytics
        </h2>
        <p>
          Our website may use cookies and similar technologies to improve website functionality and understand how visitors interact with our pages. Cookies help us:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-[#4A4543]">
          <li>Remember your session and booking preferences.</li>
          <li>Improve website loading speed and performance.</li>
          <li>Understand visitor navigation and appointment conversion rates.</li>
          <li>Analyse aggregate web traffic to enhance our service offering.</li>
        </ul>
        <p className="text-xs text-[#746D69]">
          You can manage or disable cookies through your browser settings. Disabling certain cookies may affect some interactive features of our booking platform. Where required, we obtain consent before using non-essential cookies.
        </p>
      </div>

      {/* Section 7 */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          7. Marketing Communications
        </h2>
        <p>
          Rose Essence may send service-related communications, such as booking confirmations, appointment reminders, and important operational updates, which are essential to service delivery.
        </p>
        <p>
          Promotional communications (such as seasonal offers, new treatment releases, and wellness advice) will be sent only where permitted by applicable law and, where required, with your explicit consent.
        </p>
        <p className="text-xs text-[#746D69]">
          You may opt out of promotional communications at any time by following the unsubscribe link in our emails or by contacting our concierge. Opting out of marketing does not affect essential booking or transactional notifications.
        </p>
      </div>

      {/* Section 8 */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          8. Your Privacy Rights
        </h2>
        <p>
          Subject to applicable UAE data protection laws (including Federal Decree-Law No. 45 of 2021 regarding Personal Data Protection), you may have the right to:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-[#4A4543]">
          <li>Request access to the personal data we hold about you.</li>
          <li>Request correction of inaccurate, outdated, or incomplete information.</li>
          <li>Request erasure or deletion of personal data where legally applicable.</li>
          <li>Withdraw previously given consent for specific processing activities.</li>
          <li>Request restriction or cessation of certain data processing activities.</li>
          <li>Raise concerns regarding how your personal information is handled.</li>
        </ul>
        <p className="text-xs text-[#746D69]">
          To exercise any of these rights, please contact our privacy concierge at <strong className="text-[#292525]">support@roseessence.ae</strong>. Requests will be evaluated and fulfilled in accordance with applicable UAE legal requirements.
        </p>
      </div>

      {/* Section 9 */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          9. Third-Party Websites
        </h2>
        <p>
          Our website may contain links to external websites, social media platforms, or third-party services. Rose Essence does not control and is not responsible for the privacy practices or content of these external platforms. We encourage you to review their respective privacy policies before sharing personal information with them.
        </p>
      </div>

      {/* Section 10 */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          10. Children's Privacy
        </h2>
        <p>
          Our website and booking services are not intended for unsupervised use by children under 18 years of age. Where a beauty or wellness service is requested for a minor, a parent or legal guardian must create the booking and provide required consent.
        </p>
        <p className="text-xs text-[#746D69]">
          We do not knowingly collect personal data from minors without appropriate parental or guardian involvement.
        </p>
      </div>

      {/* Section 11 */}
      <div className="pt-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          11. Changes to This Privacy Policy
        </h2>
        <p>
          Rose Essence may update this Privacy Policy from time to time to reflect changes in our business operations, website features, or applicable legal and regulatory standards in the UAE.
        </p>
        <p>
          Any revisions will be published on this page with an updated <strong className="text-[#292525]">Last Updated</strong> date. We encourage customers to review this page periodically to stay informed.
        </p>
      </div>
    </PolicyLayout>
  );
}
