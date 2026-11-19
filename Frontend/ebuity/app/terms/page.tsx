import React from "react";
import type { Metadata } from "next";
import { PolicyLayout } from "../../components/legal/PolicyLayout";

export const metadata: Metadata = {
  title: "Terms & Conditions | Rose Essence Dubai",
  description:
    "Terms and Conditions governing access to and use of Rose Essence luxury at-home beauty and wellness services across Dubai, United Arab Emirates.",
};

export default function TermsAndConditionsPage() {
  return (
    <PolicyLayout
      title="Terms & Conditions"
      subtitle="Terms governing your booking and access to Rose Essence at-home beauty & wellness services in Dubai."
      lastUpdated="November 19, 2026"
    >
      {/* Intro */}
      <div className="pb-8 space-y-4">
        <p className="text-base text-[#292525] font-serif leading-relaxed">
          Welcome to <strong className="font-semibold">Rose Essence</strong>. These Terms &amp; Conditions govern your access to and use of our website and the at-home beauty and wellness services offered through Rose Essence across Dubai, United Arab Emirates.
        </p>
        <p>
          By accessing our website, submitting a booking request, or using our services, you agree to be bound by these Terms &amp; Conditions. Please read them carefully before making an appointment booking.
        </p>
      </div>

      {/* 1. About Rose Essence */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          1. About Rose Essence
        </h2>
        <p>
          Rose Essence provides at-home beauty and wellness services across Dubai, United Arab Emirates. Our service model is designed to bring selected beauty services directly to customers at their private residences, villas, apartments, or approved hotel suites within our service coverage zones.
        </p>
        <div className="p-3.5 rounded-2xl bg-stone-50 border border-[#E8D8C8] text-xs text-[#292525]">
          <strong>Notice:</strong> Rose Essence operates exclusively through an at-home service model. We do not operate a walk-in salon or provide appointments at a customer-facing salon location. All service requests are subject to location coverage, professional availability, and official booking confirmation.
        </div>
      </div>

      {/* 2. Services Offered */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          2. Services Offered
        </h2>
        <p>
          Rose Essence provides beauty and wellness services as displayed on its official website and booking channels. Available services may include hair styling, blow dries, botanical facials, nail care (manicure &amp; pedicure), scalp revitalization, bridal packages, and grooming treatments, depending on the active seasonal menu.
        </p>
        <p>
          Service descriptions, inclusions, estimated durations, and prices are provided for customer information. The actual service provided will be based on the selected treatment, confirmed booking details, and agreed client preferences.
        </p>
        <p className="text-xs text-[#746D69]">
          We reserve the right to update, modify, or discontinue specific treatments or packages from time to time, subject to existing confirmed bookings and applicable consumer protection laws.
        </p>
      </div>

      {/* 3. Service Locations and Availability */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          3. Service Locations and Availability
        </h2>
        <p>
          Rose Essence provides at-home services across Dubai, subject to operational coverage and professional availability. Customers must provide their complete and accurate service address when requesting an appointment.
        </p>
        <p>
          Although we aim to accommodate bookings throughout Dubai, an appointment is not automatically guaranteed solely because the address is located within the emirate. We reserve the right to review the requested community, travel arrangements, appointment schedule, and therapist availability before confirming a booking.
        </p>
        <p className="text-xs text-[#746D69]">
          If we cannot provide a service at the requested location, we will inform the customer promptly and discuss available alternative times or service areas.
        </p>
      </div>

      {/* 4. Booking and Appointment Confirmation */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          4. Booking and Appointment Confirmation
        </h2>
        <p>
          Customers may request appointments through the online booking system on our website or through official customer service channels. When making a booking, customers are required to provide:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-[#4A4543]">
          <li>Full name and primary contact number (mobile / WhatsApp).</li>
          <li>Selected service(s) or package.</li>
          <li>Preferred date and time slot.</li>
          <li>Complete service address (building, flat/villa number, community).</li>
          <li>Relevant service preferences, special requests, or access instructions.</li>
        </ul>
        <p>
          Submitting a booking request does not automatically guarantee an appointment. A booking is considered confirmed only after Rose Essence communicates its acceptance through an official confirmation message, email, or authorised booking status. Customers are responsible for reviewing their confirmed service details.
        </p>
      </div>

      {/* 5. Pricing and Payments */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          5. Pricing and Payments
        </h2>
        <p>
          All service prices are quoted in UAE Dirhams (AED) and communicated through the website, booking platform, or official customer quotation before the appointment is confirmed.
        </p>
        <p>Rose Essence accepts the following payment methods, subject to availability:</p>
        <ul className="list-disc pl-5 space-y-1 text-[#4A4543]">
          <li>Online card payment through authorised, secure payment gateways (including Noon Payments).</li>
          <li>Cash on service completion through accepted on-site methods.</li>
        </ul>
        <p>
          Customers must ensure that payment is completed using the agreed method. Any additional service requested during the appointment must be agreed upon before it is provided or charged. An official transaction receipt or invoice will be provided in accordance with applicable UAE requirements.
        </p>
      </div>

      {/* 6. Booking Changes and Additional Services */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          6. Booking Changes and Additional Services
        </h2>
        <p>
          Requests to modify an existing appointment—including changing the service, appointment time, or number of people receiving treatment—must be communicated to Rose Essence in advance and are subject to availability and confirmation.
        </p>
        <p>
          Additional services requested during an appointment may be provided only where the assigned professional has the necessary equipment, time buffer, and approval. Any additional cost must be communicated to and accepted by the customer before the extra service begins.
        </p>
      </div>

      {/* 7. Customer Responsibilities */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          7. Customer Responsibilities
        </h2>
        <p>To ensure a smooth, luxurious, and comfortable at-home experience, customers are expected to:</p>
        <ul className="list-disc pl-5 space-y-1 text-[#4A4543]">
          <li>Provide accurate contact, location, and property access information.</li>
          <li>Ensure an adult is present and available at the confirmed address.</li>
          <li>Be ready at the agreed appointment start time.</li>
          <li>Provide a suitable, clean, and safe space for the selected beauty treatment.</li>
          <li>Ensure reasonable access, parking, or security gate clearance for the therapist.</li>
          <li>Inform Rose Essence of any allergies, skin sensitivities, or health conditions prior to treatment.</li>
          <li>Follow reasonable therapist preparation and aftercare guidance.</li>
          <li>Treat assigned service professionals with dignity, courtesy, and respect.</li>
        </ul>
      </div>

      {/* 8. Home Service Requirements */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          8. Home Service Requirements
        </h2>
        <p>
          As treatments are performed in your private space, customers must provide a suitable environment. Depending on the service, this may include adequate lighting, ventilation, comfortable seating, access to clean running water, and a standard electrical outlet.
        </p>
        <p>
          If the environment is unsuitable or poses an objective health or safety hazard, the assigned professional may pause the appointment and contact Rose Essence. Where a service cannot safely proceed, the appointment may be rescheduled or cancelled in accordance with our Cancellation Policy.
        </p>
      </div>

      {/* 9. Health, Allergies and Service Precautions */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          9. Health, Allergies and Service Precautions
        </h2>
        <p>
          Customers must disclose any relevant allergies, sensitive skin conditions, recent cosmetic procedures, known reactions to botanical or beauty products, or medical conditions that could affect treatment safety.
        </p>
        <p>
          Certain treatments may not be suitable for everyone. Customers should discontinue a treatment immediately if they experience discomfort or an unexpected reaction. Our services are for aesthetic and wellness purposes and are not intended to diagnose, treat, or cure medical conditions.
        </p>
      </div>

      {/* 10. Service Professionals and Conduct */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          10. Service Professionals and Conduct
        </h2>
        <p>
          Rose Essence expects all assigned professionals to maintain the highest standards of hygiene, punctuality, and professional decorum.
        </p>
        <p>
          Customers are likewise required to maintain respectful and lawful conduct. Rose Essence maintains a zero-tolerance policy for abusive, threatening, discriminatory, harassing, or unsafe behavior. We reserve the absolute right to discontinue a service immediately where safety or dignity is compromised.
        </p>
      </div>

      {/* 11. Appointment Delays and Unforeseen Circumstances */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          11. Appointment Delays and Unforeseen Circumstances
        </h2>
        <p>
          Rose Essence makes reasonable efforts to ensure that professionals arrive within the confirmed appointment window. However, delays may occasionally arise due to traffic conditions, severe weather, building access delays, or unforeseen operational hurdles.
        </p>
        <p>
          If a delay occurs, we will notify the customer as early as possible with an updated estimated arrival time.
        </p>
      </div>

      {/* 12. Cancellation and Refunds */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          12. Cancellation and Refunds
        </h2>
        <p>
          Appointment cancellations and rescheduling requests are governed by our separate <strong className="text-[#292525]">Cancellation &amp; At-Home Service Delivery Policy</strong>. Refund requests relating to cancelled, unavailable, or unsatisfactory treatments are processed under our <strong className="text-[#292525]">Refund &amp; Return Policy</strong>, subject to mandatory UAE consumer protection laws.
        </p>
      </div>

      {/* 13. Website Content and Accuracy */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          13. Website Content and Accuracy
        </h2>
        <p>
          We make reasonable efforts to ensure all content on our website is accurate and current. Photographs, illustrations, and treatment descriptions are provided for general illustrative purposes; individual treatment results may naturally vary depending on skin type, hair condition, and personal preferences.
        </p>
      </div>

      {/* 14. Intellectual Property */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          14. Intellectual Property
        </h2>
        <p>
          All content published on the Rose Essence website—including brand names, logos, text, imagery, graphics, designs, audio-visual assets, and software code—is the property of or licensed to Rose Essence. Reproduction, modification, distribution, or commercial exploitation without prior written consent is strictly prohibited.
        </p>
      </div>

      {/* 15. Website Use and Security */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          15. Website Use and Security
        </h2>
        <p>Customers must use the website lawfully. You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1 text-[#4A4543]">
          <li>Attempt to gain unauthorised access to our systems, databases, or user accounts.</li>
          <li>Interfere with website functionality, security measures, or payment processing.</li>
          <li>Submit false, fraudulent, or deceptive booking information.</li>
          <li>Introduce malware, viruses, or harmful scripts.</li>
        </ul>
      </div>

      {/* 16. Limitation of Liability */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          16. Limitation of Liability
        </h2>
        <p>
          Rose Essence takes reasonable steps to deliver services as confirmed. Nothing in these Terms &amp; Conditions excludes or limits liability where such exclusion or limitation is prohibited by UAE law.
        </p>
        <p className="text-xs text-[#746D69]">
          To the extent permitted by law, Rose Essence will not be responsible for indirect losses arising from circumstances outside its reasonable control, customer failure to disclose relevant medical/allergy conditions, or inaccurate information supplied by the customer.
        </p>
      </div>

      {/* 17. Force Majeure */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          17. Force Majeure
        </h2>
        <p>
          Rose Essence will not be held in breach of its obligations where performance is prevented or materially delayed by circumstances beyond its reasonable control, including extreme weather events, road closures, government restrictions, natural disasters, or public emergencies. In such cases, we will contact affected customers to arrange free rescheduling.
        </p>
      </div>

      {/* 18. Privacy and Personal Information */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          18. Privacy and Personal Information
        </h2>
        <p>
          Personal information collected during your interaction with Rose Essence is handled strictly in accordance with our <strong className="text-[#292525]">Privacy Policy</strong> and applicable UAE data protection laws.
        </p>
      </div>

      {/* 19. Changes to These Terms */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          19. Changes to These Terms
        </h2>
        <p>
          Rose Essence may update these Terms &amp; Conditions to reflect operational, commercial, or regulatory changes. Updated terms will be published on this website with a revised Last Updated date. Existing confirmed bookings remain subject to the terms agreed upon at the time of confirmation.
        </p>
      </div>

      {/* 20. Governing Law and Jurisdiction */}
      <div className="pt-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          20. Governing Law and Jurisdiction
        </h2>
        <p>
          These Terms &amp; Conditions are governed by and construed in accordance with the laws of the United Arab Emirates. Any dispute arising in connection with these terms or services provided by Rose Essence shall be subject to the exclusive jurisdiction of the competent courts in Dubai, UAE.
        </p>
      </div>
    </PolicyLayout>
  );
}
