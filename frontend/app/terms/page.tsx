import React from 'react';

export const metadata = {
  title: 'Terms of Service - Vodacom Technologies',
  description: 'Terms of Service for Vodacom Technologies Pvt. Ltd. ERP and communication services',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#041521] text-slate-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-[#081e2e] border border-white/10 rounded-2xl p-6 sm:p-10 shadow-2xl">
        <div className="border-b border-white/10 pb-6 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">Terms of Service</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">Vodacom Technologies Pvt. Ltd. — Effective Date: January 1, 2026</p>
        </div>

        <div className="space-y-6 text-xs sm:text-sm leading-relaxed text-slate-300">
          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Vodacom Enterprise Resource Planning (ERP) portal or receiving automated notifications from Vodacom Technologies Pvt. Ltd., you agree to be bound by these Terms of Service and our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">2. Scope of Services</h2>
            <p>
              Vodacom Technologies provides enterprise hardware support, Annual Maintenance Contracts (AMC), IT infrastructure solutions, delivery challans, and customer support ticketing. Electronic communications, including automated WhatsApp and email notifications, are provided to facilitate business workflow and support transparency.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">3. User Responsibilities</h2>
            <p>
              Authorized portal users are responsible for maintaining the confidentiality of their credentials and ensuring that contact details entered for clients and field technicians are accurate and authorized.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">4. Contact &amp; Support</h2>
            <div className="bg-[#041521] border border-white/5 rounded-xl p-4 text-xs space-y-1">
              <p className="font-semibold text-white">Vodacom Technologies Pvt. Ltd.</p>
              <p>205 LGF, Sant Nagar, East of Kailash, New Delhi - 110065, India</p>
              <p>Phone: 011-42032009 / 011-42032010 / +91-9716146816</p>
              <p>Email: <a href="mailto:sales@vodacom.in" className="text-emerald-400 hover:underline">sales@vodacom.in</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
