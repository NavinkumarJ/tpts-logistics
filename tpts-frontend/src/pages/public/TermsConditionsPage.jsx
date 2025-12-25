export default function TermsConditionsPage() {
  return (
    <div className="min-h-screen bg-white py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms & Conditions</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: December 19, 2025</p>

        <div className="prose prose-lg max-w-none">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-600 mb-4">
            By accessing and using TPTS (Trail Parcel Tracking System), you accept and agree to be bound by these Terms and Conditions.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. User Registration</h2>
          <p className="text-gray-600 mb-4">
            You must register an account to use our services. You are responsible for maintaining the confidentiality of your account credentials.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Services</h2>
          <p className="text-gray-600 mb-4">
            TPTS provides a platform connecting customers with courier companies for parcel delivery services. We facilitate group shipments to reduce costs.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Payment Terms</h2>
          <p className="text-gray-600 mb-4">
            All payments are processed through Razorpay. Prices are displayed upfront and include all applicable charges. Refunds are subject to our refund policy.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Delivery Terms</h2>
          <p className="text-gray-600 mb-4">
            Delivery times are estimates. All parcels are insured. OTP verification is required for delivery completion.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Prohibited Items</h2>
          <p className="text-gray-600 mb-4">
            You may not ship illegal, hazardous, or restricted items. We reserve the right to refuse service for prohibited items.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Limitation of Liability</h2>
          <p className="text-gray-600 mb-4">
            TPTS acts as a platform connecting users with courier services. Our liability is limited to the insurance value of the parcel.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. Contact</h2>
          <p className="text-gray-600">
            For questions about these terms, contact us at{' '}
            <a href="mailto:alamalujai@gmail.com" className="text-primary-600 hover:underline">
              alamalujai@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
