import { motion } from 'framer-motion';
import { ArrowLeft, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to="/" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-cyan-400" />
            </div>
            <h1 className="text-4xl font-bold text-white">Privacy Policy</h1>
          </div>
          <p className="text-slate-400 mb-12">Last updated: March 11, 2026</p>

          <div className="space-y-10 text-slate-300">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
              <p className="leading-relaxed mb-3">We collect information you provide directly when you create an account, set up devices, or contact us. This includes:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-400">
                <li>Name, email address, and phone number</li>
                <li>Farm location and growing room details</li>
                <li>Device telemetry data (temperature, humidity, CO2 levels)</li>
                <li>Yield and harvest records you enter into the platform</li>
                <li>Payment information (processed securely via third-party providers)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Data</h2>
              <p className="leading-relaxed mb-3">Your data is used to:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-400">
                <li>Provide real-time monitoring and alert services for your growing rooms</li>
                <li>Generate analytics, yield reports, and climate recommendations</li>
                <li>Improve our platform through aggregated, anonymized usage patterns</li>
                <li>Send you critical alerts and optional product updates</li>
                <li>Provide customer support when you reach out</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. Data Security</h2>
              <p className="leading-relaxed">
                All device-to-cloud communication is encrypted using TLS 1.3. Data at rest is encrypted with AES-256.
                We implement strict role-based access controls and regularly audit our security practices.
                Your farm data is isolated — no other customer can access your telemetry or yield records.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. Data Sharing</h2>
              <p className="leading-relaxed">
                We do <strong className="text-white">not</strong> sell your personal or farm data. We may share anonymized,
                aggregated data for agricultural research purposes only with your explicit consent.
                Third-party service providers (hosting, payment processing) access only the minimum data required to operate.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Data Retention</h2>
              <p className="leading-relaxed">
                Telemetry data is retained for the duration of your subscription plus 90 days.
                You can request a full data export or deletion at any time by contacting us at{' '}
                <a href="mailto:privacy@mushroomkimandi.in" className="text-cyan-400 hover:text-cyan-300">privacy@mushroomkimandi.in</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Cookies</h2>
              <p className="leading-relaxed">
                We use essential cookies for authentication and session management.
                Analytics cookies are optional and only enabled with your consent.
                You can manage cookie preferences through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Your Rights</h2>
              <p className="leading-relaxed mb-3">You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-400">
                <li>Access all personal data we hold about you</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your account and data</li>
                <li>Export your data in standard formats (CSV, JSON)</li>
                <li>Opt out of non-essential communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Contact Us</h2>
              <p className="leading-relaxed">
                For privacy-related inquiries, reach us at{' '}
                <a href="mailto:privacy@mushroomkimandi.in" className="text-cyan-400 hover:text-cyan-300">privacy@mushroomkimandi.in</a>{' '}
                or visit our <Link to="/contact" className="text-cyan-400 hover:text-cyan-300">Contact page</Link>.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
