import { motion } from 'framer-motion';
import { ArrowLeft, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to="/" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-green-400" />
            </div>
            <h1 className="text-4xl font-bold text-white">Terms of Service</h1>
          </div>
          <p className="text-slate-400 mb-12">Last updated: March 11, 2026</p>

          <div className="space-y-10 text-slate-300">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
              <p className="leading-relaxed">
                By accessing or using the Mushroom Ki Mandi platform ("Service"), you agree to be bound by these Terms of Service.
                If you do not agree to these terms, do not use the Service. These terms apply to all users,
                including farm operators, managers, and any personnel granted access.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. Service Description</h2>
              <p className="leading-relaxed">
                Mushroom Ki Mandi provides an IoT-based climate monitoring and control platform for commercial mushroom farming.
                The Service includes hardware sensor nodes, a cloud-based dashboard, real-time alerts,
                analytics tools, and relay automation for environmental control equipment.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. Account Responsibilities</h2>
              <ul className="list-disc list-inside space-y-2 text-slate-400">
                <li>You are responsible for maintaining the confidentiality of your login credentials</li>
                <li>You must provide accurate farm and contact information</li>
                <li>You are responsible for all activity that occurs under your account</li>
                <li>You must notify us immediately of any unauthorized access</li>
                <li>Account sharing across separate business entities is not permitted</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. Hardware & Devices</h2>
              <p className="leading-relaxed">
                IoT sensor nodes provided by Mushroom Ki Mandi remain our property unless purchased outright.
                You are responsible for proper installation and physical maintenance of devices.
                Tampering with device firmware or hardware voids any warranty.
                Over-the-Air (OTA) updates will be applied automatically to maintain security and functionality.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Data Ownership</h2>
              <p className="leading-relaxed">
                You retain full ownership of your farm's telemetry data, yield records, and operational data.
                We are granted a license to process this data solely for providing the Service.
                You may export or delete your data at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Acceptable Use</h2>
              <p className="leading-relaxed mb-3">You agree not to:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-400">
                <li>Reverse-engineer, decompile, or tamper with the platform or device firmware</li>
                <li>Use the Service for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to other users' data or systems</li>
                <li>Resell or redistribute the Service without written authorization</li>
                <li>Overload or interfere with the platform's infrastructure</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Limitation of Liability</h2>
              <p className="leading-relaxed">
                The Service provides monitoring and alerts as a decision-support tool.
                Mushroom Ki Mandi is <strong className="text-white">not liable</strong> for crop losses, equipment failures,
                or damages resulting from sensor malfunction, network outages, or delayed alerts.
                The platform supplements — but does not replace — professional agricultural judgment.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Subscription & Billing</h2>
              <p className="leading-relaxed">
                Commercial subscriptions are billed monthly or annually as per the selected plan.
                Cancellations take effect at the end of the current billing period.
                Refunds are handled on a case-by-case basis. Prices may change with 30 days' advance notice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. Termination</h2>
              <p className="leading-relaxed">
                We reserve the right to suspend or terminate accounts that violate these terms.
                Upon termination, you will have 30 days to export your data before it is permanently deleted.
                You may terminate your account at any time through the dashboard or by contacting support.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">10. Governing Law</h2>
              <p className="leading-relaxed">
                These terms are governed by the laws of India. Any disputes shall be resolved
                in the courts of Punjab, India. For questions about these terms, contact us at{' '}
                <a href="mailto:legal@mushroomkimandi.in" className="text-cyan-400 hover:text-cyan-300">legal@mushroomkimandi.in</a>.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
