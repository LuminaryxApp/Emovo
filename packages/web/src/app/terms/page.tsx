"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-brand-cream">
      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Back link */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-brand-green transition-colors hover:text-brand-green-dark"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        {/* Header */}
        <div className="mb-10 flex items-center gap-3">
          <img src="/logo.png" alt="Emovo" className="h-8 w-8" />
          <span className="font-serif text-2xl font-bold text-brand-green">Emovo</span>
        </div>

        {/* Title */}
        <article>
          <h1 className="font-serif text-4xl font-bold text-text-primary md:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-text-secondary">Last updated: February 23, 2026</p>

          <div className="mt-10 space-y-10">
            {/* 1. Acceptance of Terms */}
            <section>
              <h2 className="mb-4 font-serif text-2xl font-bold text-text-primary">
                1. Acceptance of Terms
              </h2>
              <div className="space-y-3 text-text-secondary leading-relaxed">
                <p>
                  Welcome to Emovo. By accessing or using the Emovo application, website, or any
                  associated services (collectively, the &ldquo;Service&rdquo;), you agree to be
                  bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to
                  these Terms, you may not access or use the Service.
                </p>
                <p>
                  These Terms constitute a legally binding agreement between you and Emovo. By
                  creating an account, browsing the website, or using any feature of the Service,
                  you acknowledge that you have read, understood, and agree to be bound by these
                  Terms, along with our{" "}
                  <Link
                    href="/privacy"
                    className="font-semibold text-brand-green underline underline-offset-2 hover:text-brand-green-dark"
                  >
                    Privacy Policy
                  </Link>
                  , which is incorporated by reference.
                </p>
              </div>
            </section>

            <hr className="border-border-light" />

            {/* 2. Description of Service */}
            <section>
              <h2 className="mb-4 font-serif text-2xl font-bold text-text-primary">
                2. Description of Service
              </h2>
              <div className="space-y-3 text-text-secondary leading-relaxed">
                <p>
                  Emovo is an emotion tracking platform available on mobile and web. The Service
                  provides tools for personal emotional awareness and community support, including:
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>
                    <strong className="text-text-primary">Daily mood logging</strong> &mdash; Record
                    your mood on a 1&ndash;5 scale, identify triggers, and write reflective notes.
                  </li>
                  <li>
                    <strong className="text-text-primary">Mood analytics and insights</strong>{" "}
                    &mdash; View charts, trends, and patterns in your emotional data over time.
                  </li>
                  <li>
                    <strong className="text-text-primary">Community features</strong> &mdash; Create
                    posts, comment, like, follow other users, and send direct messages.
                  </li>
                  <li>
                    <strong className="text-text-primary">User profiles</strong> &mdash; Customize
                    your public profile and manage your privacy settings.
                  </li>
                  <li>
                    <strong className="text-text-primary">Data export</strong> &mdash; Export your
                    personal mood data in JSON or CSV format at any time.
                  </li>
                </ul>
                <p>
                  The Service is provided free of charge. We reserve the right to modify, suspend,
                  or discontinue any part of the Service at any time, with or without notice.
                </p>
              </div>
            </section>

            <hr className="border-border-light" />

            {/* 3. Account Registration */}
            <section>
              <h2 className="mb-4 font-serif text-2xl font-bold text-text-primary">
                3. Account Registration
              </h2>
              <div className="space-y-3 text-text-secondary leading-relaxed">
                <p>
                  To use certain features of the Service, you must create an account. When
                  registering, you agree to the following:
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>
                    <strong className="text-text-primary">Age requirement:</strong> You must be at
                    least 13 years of age to create an account and use the Service. If you are under
                    18, you represent that you have obtained your parent or legal guardian&rsquo;s
                    consent to use the Service.
                  </li>
                  <li>
                    <strong className="text-text-primary">Accurate information:</strong> You agree
                    to provide truthful, accurate, and complete information during registration and
                    to keep your account information up to date.
                  </li>
                  <li>
                    <strong className="text-text-primary">Account security:</strong> You are solely
                    responsible for maintaining the confidentiality of your password and for all
                    activity that occurs under your account. You agree to notify us immediately at{" "}
                    <a
                      href="mailto:support@emovo.app"
                      className="font-semibold text-brand-green underline underline-offset-2 hover:text-brand-green-dark"
                    >
                      support@emovo.app
                    </a>{" "}
                    if you suspect any unauthorized use of your account.
                  </li>
                  <li>
                    <strong className="text-text-primary">One account per person:</strong> Each
                    individual may maintain only one account. Creating multiple accounts to evade
                    restrictions or for any deceptive purpose is prohibited.
                  </li>
                </ul>
              </div>
            </section>

            <hr className="border-border-light" />

            {/* 4. User Content & Conduct */}
            <section>
              <h2 className="mb-4 font-serif text-2xl font-bold text-text-primary">
                4. User Content &amp; Conduct
              </h2>
              <div className="space-y-3 text-text-secondary leading-relaxed">
                <p>
                  The Service allows you to create, share, and interact with content including mood
                  entries, posts, comments, messages, and profile information (collectively,
                  &ldquo;User Content&rdquo;). You are solely responsible for all User Content you
                  create or share through the Service.
                </p>
                <p>
                  <strong className="text-text-primary">
                    You agree not to use the Service to:
                  </strong>
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>Harass, bully, threaten, intimidate, or abuse any other user.</li>
                  <li>
                    Post or transmit content that is hateful, discriminatory, violent, sexually
                    explicit, or otherwise offensive.
                  </li>
                  <li>
                    Engage in spamming, phishing, or distributing unsolicited messages or
                    advertisements.
                  </li>
                  <li>
                    Impersonate another person or entity, or falsely represent your affiliation with
                    any person or organization.
                  </li>
                  <li>
                    Post content that infringes on the intellectual property rights, privacy rights,
                    or other rights of any third party.
                  </li>
                  <li>
                    Attempt to gain unauthorized access to other users&rsquo; accounts or any part
                    of the Service&rsquo;s infrastructure.
                  </li>
                  <li>
                    Use automated scripts, bots, or scrapers to access or interact with the Service
                    without our express written permission.
                  </li>
                  <li>Encourage or promote self-harm, suicide, or dangerous activities.</li>
                  <li>
                    Violate any applicable local, state, national, or international law or
                    regulation.
                  </li>
                </ul>
                <p>
                  We reserve the right to remove any User Content that violates these Terms or that
                  we determine, in our sole discretion, is harmful, inappropriate, or otherwise
                  objectionable.
                </p>
              </div>
            </section>

            <hr className="border-border-light" />

            {/* 5. Privacy & Data Security */}
            <section>
              <h2 className="mb-4 font-serif text-2xl font-bold text-text-primary">
                5. Privacy &amp; Data Security
              </h2>
              <div className="space-y-3 text-text-secondary leading-relaxed">
                <p>
                  Your privacy is important to us. Our collection, use, and protection of your
                  personal information is governed by our{" "}
                  <Link
                    href="/privacy"
                    className="font-semibold text-brand-green underline underline-offset-2 hover:text-brand-green-dark"
                  >
                    Privacy Policy
                  </Link>
                  . By using the Service, you consent to the practices described therein.
                </p>
                <p>
                  We take the security of your data seriously. Mood notes are encrypted using
                  AES-256-GCM encryption to protect the confidentiality of your personal
                  reflections. While we implement industry-standard security measures including
                  encryption, secure authentication, and access controls, no method of electronic
                  storage or transmission is 100% secure. We cannot guarantee absolute security but
                  are committed to protecting your data to the best of our ability.
                </p>
                <p>
                  You may export your personal data at any time in JSON or CSV format through your
                  account settings. You may also request deletion of your account and all associated
                  data at any time.
                </p>
              </div>
            </section>

            <hr className="border-border-light" />

            {/* 6. Intellectual Property */}
            <section>
              <h2 className="mb-4 font-serif text-2xl font-bold text-text-primary">
                6. Intellectual Property
              </h2>
              <div className="space-y-3 text-text-secondary leading-relaxed">
                <p>
                  <strong className="text-text-primary">Our property:</strong> The Service,
                  including its design, code, graphics, logos, trademarks, and all other
                  intellectual property, is owned by Emovo and protected by applicable intellectual
                  property laws. You may not copy, modify, distribute, sell, or lease any part of
                  the Service or its underlying technology without our express written permission.
                </p>
                <p>
                  <strong className="text-text-primary">Your content:</strong> You retain full
                  ownership of all User Content you create and share through the Service. By posting
                  User Content, you grant Emovo a non-exclusive, worldwide, royalty-free license to
                  use, display, and distribute your content solely for the purpose of operating and
                  providing the Service. This license ends when you delete your content or your
                  account, except where your content has been shared with others and they have not
                  deleted it.
                </p>
                <p>
                  You represent and warrant that you own or have the necessary rights to all User
                  Content you submit, and that your content does not infringe the rights of any
                  third party.
                </p>
              </div>
            </section>

            <hr className="border-border-light" />

            {/* 7. Community Guidelines */}
            <section>
              <h2 className="mb-4 font-serif text-2xl font-bold text-text-primary">
                7. Community Guidelines
              </h2>
              <div className="space-y-3 text-text-secondary leading-relaxed">
                <p>
                  Emovo is built around emotional well-being and mutual support. To maintain a safe
                  and respectful community, all users must adhere to the following guidelines:
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>
                    <strong className="text-text-primary">Be respectful:</strong> Treat all
                    community members with kindness and empathy. Disagreements are natural, but
                    personal attacks are never acceptable.
                  </li>
                  <li>
                    <strong className="text-text-primary">No harmful content:</strong> Do not post
                    content that promotes violence, self-harm, hate speech, discrimination, or
                    illegal activity.
                  </li>
                  <li>
                    <strong className="text-text-primary">Protect privacy:</strong> Do not share
                    other people&rsquo;s personal information without their consent. Respect the
                    vulnerability that comes with sharing emotional experiences.
                  </li>
                  <li>
                    <strong className="text-text-primary">No misinformation:</strong> Do not present
                    yourself as a licensed mental health professional unless you are one. Do not
                    provide medical advice or diagnoses.
                  </li>
                  <li>
                    <strong className="text-text-primary">Report concerns:</strong> If you see
                    content or behavior that violates these guidelines, please report it. We review
                    all reports and take appropriate action.
                  </li>
                </ul>
                <p>
                  We reserve the right to moderate, edit, or remove any content and to restrict or
                  revoke access for users who violate these guidelines. Moderation decisions are
                  made at our sole discretion and are final.
                </p>
              </div>
            </section>

            <hr className="border-border-light" />

            {/* 8. Termination */}
            <section>
              <h2 className="mb-4 font-serif text-2xl font-bold text-text-primary">
                8. Termination
              </h2>
              <div className="space-y-3 text-text-secondary leading-relaxed">
                <p>
                  <strong className="text-text-primary">Termination by Emovo:</strong> We may
                  suspend, restrict, or permanently terminate your account and access to the Service
                  at any time, with or without notice, for any reason, including but not limited to:
                  violation of these Terms, violation of Community Guidelines, fraudulent or illegal
                  activity, or conduct that we believe is harmful to other users or the integrity of
                  the Service.
                </p>
                <p>
                  <strong className="text-text-primary">Termination by you:</strong> You may delete
                  your account at any time through your account settings. Upon account deletion, we
                  will permanently delete your account data, mood entries, and personal information
                  from our active systems. Some data may be retained in encrypted backups for a
                  limited period as described in our Privacy Policy.
                </p>
                <p>
                  Upon termination, your right to use the Service ceases immediately. Sections of
                  these Terms that by their nature should survive termination (including
                  intellectual property, disclaimers, and limitation of liability) will remain in
                  effect.
                </p>
              </div>
            </section>

            <hr className="border-border-light" />

            {/* 9. Disclaimers */}
            <section>
              <h2 className="mb-4 font-serif text-2xl font-bold text-text-primary">
                9. Disclaimers
              </h2>
              <div className="space-y-3 text-text-secondary leading-relaxed">
                <p className="rounded-xl border border-border-light bg-white/50 p-4 font-semibold text-text-primary">
                  Emovo is not a substitute for professional mental health care. The Service is
                  designed as a personal wellness and self-awareness tool, not as a medical device,
                  therapy platform, or crisis intervention service. If you are experiencing a mental
                  health crisis, please contact a qualified mental health professional or emergency
                  services immediately.
                </p>
                <p>
                  The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
                  basis without warranties of any kind, whether express, implied, or statutory.
                  Emovo disclaims all warranties, including but not limited to implied warranties of
                  merchantability, fitness for a particular purpose, non-infringement, and any
                  warranties arising from course of dealing or usage of trade.
                </p>
                <p>
                  We do not warrant that the Service will be uninterrupted, error-free, secure, or
                  free of viruses or other harmful components. We do not warrant the accuracy,
                  reliability, or completeness of any insights, analytics, or information provided
                  through the Service.
                </p>
                <p>
                  Any content shared by other users in the community is their own opinion and does
                  not represent the views of Emovo. We do not endorse or verify the accuracy of
                  user-generated content.
                </p>
              </div>
            </section>

            <hr className="border-border-light" />

            {/* 10. Limitation of Liability */}
            <section>
              <h2 className="mb-4 font-serif text-2xl font-bold text-text-primary">
                10. Limitation of Liability
              </h2>
              <div className="space-y-3 text-text-secondary leading-relaxed">
                <p>
                  To the maximum extent permitted by applicable law, Emovo, its owners, officers,
                  employees, affiliates, and agents shall not be liable for any indirect,
                  incidental, special, consequential, or punitive damages, including but not limited
                  to loss of data, loss of profits, loss of goodwill, or damages arising from:
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>Your use of or inability to use the Service.</li>
                  <li>Any unauthorized access to or alteration of your data or transmissions.</li>
                  <li>Any content or conduct of any third party on the Service.</li>
                  <li>Any interruption, suspension, or termination of the Service.</li>
                  <li>
                    Any reliance on information, insights, or analytics provided by the Service.
                  </li>
                </ul>
                <p>
                  In no event shall Emovo&rsquo;s total aggregate liability to you for all claims
                  arising out of or relating to these Terms or the Service exceed the amount you
                  paid to Emovo in the twelve (12) months preceding the claim, or fifty US dollars
                  ($50.00), whichever is greater.
                </p>
                <p>
                  Some jurisdictions do not allow the exclusion or limitation of certain damages. In
                  such jurisdictions, our liability shall be limited to the fullest extent permitted
                  by law.
                </p>
              </div>
            </section>

            <hr className="border-border-light" />

            {/* 11. Changes to Terms */}
            <section>
              <h2 className="mb-4 font-serif text-2xl font-bold text-text-primary">
                11. Changes to Terms
              </h2>
              <div className="space-y-3 text-text-secondary leading-relaxed">
                <p>
                  We may update these Terms from time to time to reflect changes in our practices,
                  features, or legal requirements. When we make material changes, we will notify you
                  by posting the updated Terms on this page and updating the &ldquo;Last
                  updated&rdquo; date at the top of this document. For significant changes, we may
                  also provide additional notice through the Service, such as an in-app notification
                  or an email to the address associated with your account.
                </p>
                <p>
                  Your continued use of the Service after the effective date of any changes
                  constitutes your acceptance of the updated Terms. If you do not agree with the
                  revised Terms, you must stop using the Service and delete your account.
                </p>
              </div>
            </section>

            <hr className="border-border-light" />

            {/* 12. Contact Information */}
            <section>
              <h2 className="mb-4 font-serif text-2xl font-bold text-text-primary">
                12. Contact Information
              </h2>
              <div className="space-y-3 text-text-secondary leading-relaxed">
                <p>
                  If you have any questions, concerns, or feedback about these Terms of Service,
                  please contact us at:
                </p>
                <p>
                  <a
                    href="mailto:support@emovo.app"
                    className="font-semibold text-brand-green underline underline-offset-2 hover:text-brand-green-dark"
                  >
                    support@emovo.app
                  </a>
                </p>
                <p>
                  We will make reasonable efforts to respond to your inquiry in a timely manner.
                </p>
              </div>
            </section>
          </div>
        </article>

        {/* Footer */}
        <footer className="mt-16 border-t border-border-light pt-8 text-center">
          <p className="font-serif text-lg font-bold text-brand-green">Emovo</p>
          <p className="mt-2 text-xs text-text-secondary">
            &copy; 2026 Emovo. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
