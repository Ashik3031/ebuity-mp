import React from "react";
import type { Metadata } from "next";
import { PolicyLayout } from "../../components/legal/PolicyLayout";

export const metadata: Metadata = {
  title: "Cancellation & Service Delivery Policy | Rose Essence Dubai",
  description:
    "Official Cancellation, Rescheduling, and At-Home Service Delivery Policy for Rose Essence beauty and wellness services across Dubai, UAE.",
};

export default function CancellationPolicyPage() {
  return (
    <PolicyLayout
      title="Cancellation & Service Delivery Policy"
      subtitle="Complete information on scheduling, dispatch, cancellations, rescheduling, and at-home delivery across Dubai."
      lastUpdated="November 19, 2026"
    >
      {/* Intro */}
      <div className="pb-8 space-y-4">
        <p className="text-base text-[#292525] font-serif leading-relaxed">
          At <strong className="font-semibold">Rose Essence</strong>, we aim to make every at-home beauty appointment convenient, comfortable, and well-organised. Our services are delivered directly to clients at their selected locations across Dubai, UAE, subject to operational coverage and professional availability.
        </p>
        <p>
          This policy explains our appointment scheduling, service delivery, cancellation, rescheduling, and no-show procedures.
        </p>
      </div>

      {/* 1. At-Home Service Delivery */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          1. At-Home Service Delivery
        </h2>
        <p>
          Rose Essence operates exclusively through an at-home service model. Our certified beauty therapists and aestheticians travel directly to your home, apartment, villa, or hotel suite with professional tools, sanitized equipment, and fresh botanical formulations.
        </p>
        <div className="p-3.5 rounded-2xl bg-stone-50 border border-[#E8D8C8] text-xs text-[#292525]">
          <strong>Salon Location Notice:</strong> We do not operate a walk-in salon or accept appointments at a public salon premises. All appointments must be scheduled in advance through our official website or concierge channels.
        </div>
      </div>

      {/* 2. Service Coverage Areas */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          2. Service Coverage Areas
        </h2>
        <p>
          Rose Essence provides at-home services throughout Dubai communities, including Downtown Dubai, Business Bay, Palm Jumeirah, Dubai Marina, JBR, Emirates Hills, Arabian Ranches, Jumeirah, Dubai Hills Estate, and surrounding areas.
        </p>
        <p>
          Service availability depends on:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-[#4A4543]">
          <li>Exact residential community and property access.</li>
          <li>Selected treatment duration and equipment requirements.</li>
          <li>Therapist qualification and schedule availability.</li>
          <li>Travel buffer and traffic scheduling.</li>
        </ul>
        <p className="text-xs text-[#746D69]">
          A booking is confirmed only once Rose Essence has verified therapist availability in your requested zone. If your location cannot be serviced at the requested time, our concierge will propose the closest available alternative.
        </p>
      </div>

      {/* 3. Booking and Appointment Confirmation */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          3. Booking and Appointment Confirmation
        </h2>
        <p>
          When submitting a booking request, customers provide their full name, contact number, requested service, preferred date/time, and complete Dubai address.
        </p>
        <p>
          Submitting a request on the website initiates the allocation process. Your appointment is officially confirmed when you receive a confirmation message or email with your unique booking reference (e.g. <code className="bg-stone-100 px-1.5 py-0.5 rounded text-xs text-[#CF565D]">RB-XXXXXXXX</code>).
        </p>
      </div>

      {/* 4. Appointment Scheduling */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          4. Appointment Scheduling
        </h2>
        <p>
          We make every reasonable effort to accommodate your preferred date and time. However, all bookings depend on therapist availability. We strongly encourage booking in advance—especially for weekends, evening slots, and special occasion or bridal ceremonies.
        </p>
      </div>

      {/* 5. Service Professional Arrival */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          5. Service Professional Arrival
        </h2>
        <p>
          Our aestheticians aim to arrive promptly within the confirmed appointment window. To account for Dubai traffic conditions and security gate clearance, our system schedules mandatory travel buffers between appointments.
        </p>
        <p className="text-xs text-[#746D69]">
          If an unforeseen traffic or weather delay occurs, our concierge team will notify you via call or WhatsApp with an updated estimated arrival time.
        </p>
      </div>

      {/* 6. Customer Availability and Preparation */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          6. Customer Availability and Preparation
        </h2>
        <p>To ensure a flawless at-home spa experience, we kindly request clients to:</p>
        <ul className="list-disc pl-5 space-y-1 text-[#4A4543]">
          <li>Be present and reachable at the confirmed address at the scheduled time.</li>
          <li>Ensure visitor parking or security gate access is pre-cleared with building management.</li>
          <li>Prepare a clean, well-lit, and reasonably ventilated space with access to an electrical outlet and running water.</li>
          <li>Notify our team in advance of any pets or specific domestic requirements.</li>
        </ul>
      </div>

      {/* 7. Cancellation Policy */}
      <div className="py-8 space-y-4">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          7. Cancellation Policy
        </h2>
        <p>
          We understand that schedules can change. To respect our therapists' dedicated travel time and preserve schedule slots, we operate under the following cancellation structure:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-4 rounded-2xl bg-white border border-[#E8D8C8] shadow-2xs space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full inline-block">
              Free Cancellation
            </span>
            <h3 className="font-serif font-bold text-[#292525]">More than 24 Hours</h3>
            <p className="text-xs text-[#746D69]">
              Cancel without any cancellation fee. Any pre-paid amount is refunded in full.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E8D8C8] shadow-2xs space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full inline-block">
              Late Cancellation
            </span>
            <h3 className="font-serif font-bold text-[#292525]">Within 24 Hours</h3>
            <p className="text-xs text-[#746D69]">
              A 50 AED travel coordination fee may apply to compensate the reserved therapist slot.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E8D8C8] shadow-2xs space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full inline-block">
              On-The-Way / At Door
            </span>
            <h3 className="font-serif font-bold text-[#292525]">Dispatched or Arrived</h3>
            <p className="text-xs text-[#746D69]">
              If cancelled after dispatch or arrival, a charge equivalent to 50% of the service total applies.
            </p>
          </div>
        </div>

        <p className="text-xs text-[#746D69] pt-1">
          Cancellation requests must be submitted through official communication channels (WhatsApp, concierge call, or online booking portal).
        </p>
      </div>

      {/* 8. Rescheduling Appointments */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          8. Rescheduling Appointments
        </h2>
        <p>
          You may reschedule your appointment to another date or time free of charge when requested at least <strong className="text-[#292525]">12 hours</strong> prior to your scheduled slot. Rescheduling is subject to therapist availability in your area.
        </p>
      </div>

      {/* 9. No-Show Policy */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          9. No-Show Policy
        </h2>
        <p>
          A no-show occurs when a therapist arrives at the confirmed address within the appointment window, but the customer is unavailable, unreachable, or does not grant entry after a <strong className="text-[#292525]">15-minute grace period</strong>.
        </p>
        <p className="text-xs text-[#746D69]">
          In the event of a verified no-show, a fee of up to 50% of the booking value may be charged to cover therapist travel time and loss of scheduling availability.
        </p>
      </div>

      {/* 10. Cancellation by Rose Essence */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          10. Cancellation by Rose Essence
        </h2>
        <p>
          If Rose Essence must cancel or reschedule due to therapist illness, severe weather, or unexpected road hazards, we will notify you immediately. You will be offered top priority rescheduling or a 100% full refund of any pre-paid amount.
        </p>
      </div>

      {/* 11. Service Delays and Unforeseen Circumstances */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          11. Service Delays and Unforeseen Circumstances
        </h2>
        <p>
          If a delay exceeds 30 minutes due to exceptional circumstances beyond our control, customers have the right to either proceed with the updated arrival time or reschedule the appointment without any penalty.
        </p>
      </div>

      {/* 12. Incomplete or Interrupted Services */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          12. Incomplete or Interrupted Services
        </h2>
        <p>
          If a service is interrupted due to therapist equipment failure, we will either complete the service at an agreed time or provide a proportionate refund. If interrupted at the customer's request, charges will reflect the treatment completed up to that point.
        </p>
      </div>

      {/* 13. Changes to the Service Location */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          13. Changes to the Service Location
        </h2>
        <p>
          If you need to change your service location after confirmation, please notify us as early as possible. Relocations are subject to coverage area verification and therapist dispatch routes.
        </p>
      </div>

      {/* 14. Customer Safety and Service Environment */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          14. Customer Safety and Service Environment
        </h2>
        <p>
          Our therapists adhere to strict sanitary protocols (sanitized tools, single-use disposables, and personal protective equipment). We ask clients to ensure a safe, sanitary, and respectful environment for our visiting professionals.
        </p>
      </div>

      {/* 15. Payment and Refunds */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          15. Payment and Refunds
        </h2>
        <p>
          Payments can be completed online via secure card checkout (Noon Payments) or in cash upon service completion. All refunds are handled in accordance with our <strong className="text-[#292525]">Refund &amp; Return Policy</strong>.
        </p>
      </div>

      {/* 16. Policy Updates */}
      <div className="py-8 space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          16. Policy Updates
        </h2>
        <p>
          Rose Essence reserves the right to revise this policy periodically. The latest version will always be published on our website with the revised effective date.
        </p>
      </div>

      {/* 17. Contact Us */}
      <div className="pt-8 space-y-4">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#292525]">
          17. Contact Us
        </h2>
        <p>
          For appointment cancellations, rescheduling requests, service area confirmations, or questions about these policies, please contact our concierge team:
        </p>

        <div className="p-5 sm:p-6 rounded-2xl bg-stone-50 border border-[#E8D8C8] space-y-2 text-xs sm:text-sm text-[#4A4543]">
          <p><strong className="text-[#292525]">Business Name:</strong> Rose Essence Beauty &amp; Wellness Services L.L.C.</p>
          <p><strong className="text-[#292525]">Brand Name:</strong> Rose Essence</p>
          <p><strong className="text-[#292525]">Official Email:</strong> <a href="mailto:support@roseessence.ae" className="text-[#CF565D] hover:underline">support@roseessence.ae</a></p>
          <p><strong className="text-[#292525]">Phone / WhatsApp:</strong> +971 4 000 0000 / +971 50 000 0000</p>
          <p><strong className="text-[#292525]">Business Address:</strong> Downtown Dubai / Business Bay, Dubai, United Arab Emirates</p>
          <p><strong className="text-[#292525]">Official Website:</strong> <a href="https://roseessence.ae/" className="text-[#CF565D] hover:underline" target="_blank" rel="noopener noreferrer">https://roseessence.ae/</a></p>
        </div>
      </div>
    </PolicyLayout>
  );
}
