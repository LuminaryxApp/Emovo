"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
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

        {/* Logo and brand */}
        <div className="mb-8 flex items-center gap-3">
          <img src="/logo.png" alt="Emovo" className="h-8 w-8" />
          <span className="font-serif text-xl font-bold text-brand-green">Emovo</span>
        </div>

        {/* Title and last updated */}
        <h1 className="font-serif text-4xl font-bold text-text-primary md:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-text-secondary">Last updated: February 23, 2026</p>

        {/* Divider */}
        <hr className="my-8 border-border-light" />

        {/* Policy content */}
        <article className="space-y-10 text-base leading-relaxed text-text-primary">
          {/* 1. Introduction */}
          <section>
            <h2 className="mb-4 font-serif text-2xl font-bold text-text-primary">
              1. Introduction
            </h2>
            <p className="text-text-secondary">
              Welcome to Emovo. This Privacy Policy explains how we collect, use, protect, and
              handle your personal information when you use our emotion tracking application and
              related services, including our mobile app and website (collectively, the
              &ldquo;Service&rdquo;). We are committed to protecting your privacy and being
              transparent about our data practices. By using Emovo, you agree to the collection and
              use of information as described in this policy.
            </p>
          </section>

          {/* 2. Information We Collect */}
          <section>
            <h2 className="mb-4 font-serif text-2xl font-bold text-text-primary">
              2. Information We Collect
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-lg font-bold text-text-primary">Account Information</h3>
                <p className="text-text-secondary">
                  When you create an account, we collect your email address, display name, and
                  username. You may optionally provide a bio and profile avatar. Your email address
                  is used for authentication, account recovery, and important service
                  communications.
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-lg font-bold text-text-primary">Mood Data</h3>
                <p className="text-text-secondary">
                  When you log your mood, we store your mood score (on a 1&ndash;5 scale), any
                  triggers you select, and the timestamp of each entry. Mood notes are encrypted
                  using AES-256-GCM encryption with Additional Authenticated Data (AAD) and key
                  versioning before being stored. This means your private reflections are unreadable
                  to anyone &mdash; including us. We cannot decrypt, access, or read your mood notes
                  under any circumstances.
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-lg font-bold text-text-primary">Community Content</h3>
                <p className="text-text-secondary">
                  If you choose to participate in community features, we store content you create
                  including posts, comments, likes, follow relationships, and direct messages.
                  Please note that community content (posts, comments, and messages) is not
                  end-to-end encrypted and is stored in readable form to enable the social features
                  of the Service.
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-lg font-bold text-text-primary">Usage Data</h3>
                <p className="text-text-secondary">
                  We collect basic usage information necessary to operate the Service, including
                  login timestamps, session information, and your timezone (used to display your
                  mood statistics accurately in your local time).
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-lg font-bold text-text-primary">
                  Information We Do NOT Collect
                </h3>
                <p className="text-text-secondary">
                  We do not collect your location data, contacts, device identifiers, advertising
                  identifiers, or any other information beyond what is described above. We do not
                  use tracking pixels, third-party analytics services, or advertising SDKs.
                </p>
              </div>
            </div>
          </section>

          {/* 3. How We Use Your Information */}
          <section>
            <h2 className="mb-4 font-serif text-2xl font-bold text-text-primary">
              3. How We Use Your Information
            </h2>
            <p className="mb-4 text-text-secondary">
              We use the information we collect for the following purposes:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-text-secondary">
              <li>
                <strong className="text-text-primary">Providing the Service:</strong> To operate
                your account, store your mood entries, generate your personal analytics and
                insights, and enable community features.
              </li>
              <li>
                <strong className="text-text-primary">Personal Analytics:</strong> To compute mood
                trends, trigger frequency, and other statistical insights displayed to you in the
                app. These analytics are calculated for you alone and are not shared with anyone.
              </li>
              <li>
                <strong className="text-text-primary">Community Moderation:</strong> To maintain a
                safe and supportive community environment by reviewing reported content and
                enforcing our community guidelines.
              </li>
              <li>
                <strong className="text-text-primary">Service Communications:</strong> To send you
                important account-related notices such as email verification, password reset links,
                and security alerts.
              </li>
              <li>
                <strong className="text-text-primary">Service Improvement:</strong> To understand
                general usage patterns (in aggregate, not individually) so we can improve the
                Service.
              </li>
            </ul>
          </section>

          {/* 4. Data Security */}
          <section>
            <h2 className="mb-4 font-serif text-2xl font-bold text-text-primary">
              4. Data Security
            </h2>
            <p className="mb-4 text-text-secondary">
              We take the security of your data seriously and employ multiple layers of protection:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-text-secondary">
              <li>
                <strong className="text-text-primary">Encrypted Mood Notes:</strong> Your mood notes
                are encrypted using AES-256-GCM with Additional Authenticated Data and key
                versioning. This is a zero-knowledge architecture &mdash; we do not have the ability
                to read your private notes, and neither does anyone who might gain unauthorized
                access to our database.
              </li>
              <li>
                <strong className="text-text-primary">Password Security:</strong> Your password is
                hashed using Argon2id, the current gold standard for password hashing. We never
                store your password in plain text.
              </li>
              <li>
                <strong className="text-text-primary">Secure Transmission:</strong> All data
                transmitted between your device and our servers is protected using HTTPS/TLS
                encryption.
              </li>
              <li>
                <strong className="text-text-primary">Session Security:</strong> We use JSON Web
                Tokens (JWT) with refresh token rotation. This means that each time your session is
                refreshed, the previous token is invalidated, protecting you against token theft and
                replay attacks.
              </li>
            </ul>
          </section>

          {/* 5. Data Sharing */}
          <section>
            <h2 className="mb-4 font-serif text-2xl font-bold text-text-primary">
              5. Data Sharing
            </h2>
            <p className="mb-4 text-text-secondary">
              We are committed to keeping your data private:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-text-secondary">
              <li>
                <strong className="text-text-primary">No selling of data:</strong> We do not sell
                your personal information to anyone, ever.
              </li>
              <li>
                <strong className="text-text-primary">No third-party sharing:</strong> We do not
                share your data with third-party companies for marketing, advertising, or any other
                purpose.
              </li>
              <li>
                <strong className="text-text-primary">No advertising:</strong> Emovo is free and
                does not display advertisements. There are no ad networks or tracking partners
                receiving your data.
              </li>
              <li>
                <strong className="text-text-primary">Legal requirements:</strong> We may disclose
                your information only if required to do so by law or in response to a valid legal
                process, such as a court order or subpoena.
              </li>
            </ul>
          </section>

          {/* 6. Community Content */}
          <section>
            <h2 className="mb-4 font-serif text-2xl font-bold text-text-primary">
              6. Community Content
            </h2>
            <p className="text-text-secondary">
              Emovo includes community features such as posts, comments, likes, follows, and direct
              messages. When you share content through community features, please be aware that
              posts and comments are visible to other Emovo users as intended by the feature&apos;s
              design (for example, posts on a public profile are visible to all users, while posts
              on a private profile are visible only to approved followers). Direct messages are
              visible to the participants of the conversation. We encourage you to be thoughtful
              about what you share publicly, as community content is not end-to-end encrypted. Your
              private mood data (entries, scores, triggers, and encrypted notes) is never shared
              through community features unless you explicitly choose to include such information in
              a post or comment.
            </p>
          </section>

          {/* 7. Data Retention */}
          <section>
            <h2 className="mb-4 font-serif text-2xl font-bold text-text-primary">
              7. Data Retention
            </h2>
            <p className="text-text-secondary">
              We retain your personal information and mood data for as long as your account is
              active. If you choose to delete your account, we will permanently delete all of your
              associated data, including your profile information, mood entries, community content,
              messages, and any other data linked to your account. This deletion is irreversible. We
              do not retain backup copies of deleted user data beyond what is needed for standard
              database operations.
            </p>
          </section>

          {/* 8. Your Rights */}
          <section>
            <h2 className="mb-4 font-serif text-2xl font-bold text-text-primary">8. Your Rights</h2>
            <p className="mb-4 text-text-secondary">
              You have full control over your data. Here is what you can do:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-text-secondary">
              <li>
                <strong className="text-text-primary">Access and Export:</strong> You can export all
                of your mood data at any time in JSON or CSV format directly from the app.
              </li>
              <li>
                <strong className="text-text-primary">Delete Your Account:</strong> You can delete
                your account and all associated data at any time from your account settings. This
                action is permanent and cannot be undone.
              </li>
              <li>
                <strong className="text-text-primary">Modify Your Profile:</strong> You can update
                your display name, username, bio, and avatar at any time.
              </li>
              <li>
                <strong className="text-text-primary">Privacy Controls:</strong> You can set your
                profile to private so that only approved followers can see your posts. You can also
                choose whether to show or hide your real name on your profile.
              </li>
            </ul>
            <p className="mt-4 text-text-secondary">
              If you have questions about exercising any of these rights or need assistance, please
              contact us at the email address provided below.
            </p>
          </section>

          {/* 9. Children's Privacy */}
          <section>
            <h2 className="mb-4 font-serif text-2xl font-bold text-text-primary">
              9. Children&apos;s Privacy
            </h2>
            <p className="text-text-secondary">
              Emovo is not intended for use by children under the age of 13. We do not knowingly
              collect personal information from children under 13. If we become aware that we have
              inadvertently collected personal information from a child under 13, we will take steps
              to delete that information as quickly as possible. If you are a parent or guardian and
              believe your child has provided us with personal information, please contact us so we
              can take appropriate action.
            </p>
          </section>

          {/* 10. Changes to This Policy */}
          <section>
            <h2 className="mb-4 font-serif text-2xl font-bold text-text-primary">
              10. Changes to This Policy
            </h2>
            <p className="text-text-secondary">
              We may update this Privacy Policy from time to time to reflect changes in our
              practices or for legal, operational, or regulatory reasons. When we make significant
              changes, we will update the &ldquo;Last updated&rdquo; date at the top of this page.
              We encourage you to review this policy periodically to stay informed about how we
              protect your information.
            </p>
          </section>

          {/* 11. Contact Us */}
          <section>
            <h2 className="mb-4 font-serif text-2xl font-bold text-text-primary">11. Contact Us</h2>
            <p className="text-text-secondary">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our
              data practices, please contact us at:
            </p>
            <p className="mt-3">
              <a
                href="mailto:support@emovo.app"
                className="font-semibold text-brand-green transition-colors hover:text-brand-green-dark"
              >
                support@emovo.app
              </a>
            </p>
          </section>
        </article>

        {/* Footer divider and copyright */}
        <hr className="my-10 border-border-light" />
        <footer className="pb-8 text-center">
          <p className="font-serif text-lg font-bold text-brand-green">Emovo</p>
          <p className="mt-1 text-xs text-text-tertiary">&copy; 2026 Emovo. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
