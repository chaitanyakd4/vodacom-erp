import React from 'react';

export const metadata = {
  title: 'Privacy Policy - Vodacom Technologies',
  description: 'Privacy Policy for Vodacom Technologies Pvt. Ltd. ERP and communication services',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#041521] text-slate-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-[#081e2e] border border-white/10 rounded-2xl p-6 sm:p-10 shadow-2xl">
        <div className="border-b border-white/10 pb-6 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">Privacy Policy</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">Vodacom Technologies Pvt. Ltd. — Effective Date: January 1, 2026</p>
        </div>

        <div className="space-y-6 text-xs sm:text-sm leading-relaxed text-slate-300">
          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">1. Overview</h2>
            <p>
              Vodacom Technologies Pvt. Ltd. (&quot;Vodacom&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the Vodacom Enterprise Resource Planning (ERP) platform and related notification services. This Privacy Policy explains how we collect, use, store, and protect information when you interact with our billing, service work, customer support, and automated communication channels (including WhatsApp and SMS).
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">2. Information We Collect</h2>
            <p className="mb-2">We collect only information necessary to provide legitimate business operations, customer support, and service execution:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li><strong>Contact Information:</strong> Company name, contact person name, authorized phone numbers, official email addresses, billing and site service addresses.</li>
              <li><strong>Commercial Records:</strong> Invoices, AMC contracts, quotation proposals, delivery challans, and customer support enquiry tickets.</li>
              <li><strong>Field Service &amp; Technician Data:</strong> Assigned service tickets, check-in timestamps, technician mobile numbers, and optional site navigation details.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">3. How We Use Information</h2>
            <p className="mb-2">Your information is used strictly for operational purposes:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li>Delivering automated service work ticket status updates, technician arrivals, and assignment alerts.</li>
              <li>Sending invoice reminders, contract renewal notices, and quotation responses via official email and WhatsApp messaging channels.</li>
              <li>Maintaining accurate accounting, GST compliance, and audit records under applicable Indian laws.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">4. WhatsApp &amp; Electronic Communications</h2>
            <p>
              Our ERP system utilizes the official Meta WhatsApp Cloud API to deliver utility notifications, such as service ticket assignments, site arrival confirmations, and invoice payment reminders. We do not engage in unsolicited promotional spam. Recipients may opt out of automated notifications at any time by contacting our support team or replying STOP.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">5. Data Protection &amp; Confidentiality</h2>
            <p>
              We enforce strict industry-standard access controls, database encryption, and secure HTTPS/TLS transport protocols. We do not sell, rent, or lease customer data to third-party advertisers or data brokers under any circumstances.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">6. Contact Information</h2>
            <p className="mb-2">If you have questions regarding this Privacy Policy or wish to update your records, please contact us at:</p>
            <div className="bg-[#041521] border border-white/5 rounded-xl p-4 text-xs space-y-1">
              <p className="font-semibold text-white">Vodacom Technologies Pvt. Ltd.</p>
              <p>205 LGF, Sant Nagar, East of Kailash, New Delhi - 110065, India</p>
              <p>Phone: 011-42032009 / 011-42032010 / +91-9716146816</p>
              <p>Email: <a href="mailto:sales@vodacom.in" className="text-emerald-400 hover:underline">sales@vodacom.in</a></p>
              <p>Website: <a href="https://www.vodacom.in" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">www.vodacom.in</a></p>
              <p>GSTIN: 07AACCV8995J1ZI</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
