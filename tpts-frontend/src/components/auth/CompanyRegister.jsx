import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../../utils/api";

export default function CompanyRegister({ onBack }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    companyName: "",
    registrationNumber: "",
    gstNumber: "",
    contactPersonName: "",
    email: "",
    phone: "",
    password: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    serviceCities: "",
    baseRatePerKm: "",
    baseRatePerKg: "",
    companyLogoUrl: "",
    registrationCertificateUrl: "",
    gstCertificateUrl: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleFileUpload = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingDocs(true);
    setError("");

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      // Use company-logo endpoint for logo (images only)
      // Use company-document endpoint for certificates (supports PDFs)
      const isLogo = fieldName === "companyLogoUrl";
      const endpoint = isLogo ? "/upload/company-logo" : "/upload/company-document";

      if (!isLogo) {
        uploadFormData.append("docType", fieldName.replace("Url", ""));
      }

      const response = await apiClient.post(endpoint, uploadFormData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setFormData((prev) => ({
        ...prev,
        [fieldName]: response.data.data.url,
      }));
    } catch (err) {
      setError(`Failed to upload ${fieldName}. Please try again.`);
    } finally {
      setUploadingDocs(false);
    }
  };

  // ✅ Validation functions for each step
  const validateStep1 = () => {
    if (!formData.companyName.trim()) {
      setError("Company name is required");
      return false;
    }
    if (formData.companyName.length < 2) {
      setError("Company name must be at least 2 characters");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.contactPersonName.trim()) {
      setError("Contact person name is required");
      return false;
    }
    if (!formData.email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }
    if (!formData.phone.trim()) {
      setError("Phone number is required");
      return false;
    }
    if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      setError("Please enter a valid 10-digit phone number starting with 6-9");
      return false;
    }
    if (!formData.password.trim()) {
      setError("Password is required");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (!formData.address.trim()) {
      setError("Address is required");
      return false;
    }
    if (!formData.city.trim()) {
      setError("City is required");
      return false;
    }
    if (!formData.state.trim()) {
      setError("State is required");
      return false;
    }
    if (!formData.pincode.trim()) {
      setError("Pincode is required");
      return false;
    }
    if (!/^[1-9][0-9]{5}$/.test(formData.pincode)) {
      setError("Please enter a valid 6-digit pincode");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    // Step 3 has no required fields, all optional
    return true;
  };

  const validateStep4 = () => {
    // ✅ All 3 documents are required
    if (!formData.companyLogoUrl) {
      setError("Company logo is required");
      return false;
    }

    if (!formData.registrationCertificateUrl) {
      setError("Registration certificate is required");
      return false;
    }

    if (!formData.gstCertificateUrl) {
      setError("GST certificate is required");
      return false;
    }

    return true;
  };

  const handleNext = () => {
    setError("");

    let isValid = false;
    switch (step) {
      case 1:
        isValid = validateStep1();
        break;
      case 2:
        isValid = validateStep2();
        break;
      case 3:
        isValid = validateStep3();
        break;
      case 4:
        isValid = validateStep4();
        break;
      default:
        isValid = false;
    }

    if (isValid && step < 4) {
      setStep(step + 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Final validation
    if (!validateStep1() || !validateStep2() || !validateStep3() || !validateStep4()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        ...formData,
        serviceCities: formData.serviceCities
          .split(",")
          .map((city) => city.trim())
          .filter(Boolean),
        baseRatePerKm: formData.baseRatePerKm ? parseFloat(formData.baseRatePerKm) : null,
        baseRatePerKg: formData.baseRatePerKg ? parseFloat(formData.baseRatePerKg) : null,
      };

      await apiClient.post("/auth/register/company", payload);
      navigate("/verify-otp", {
        state: {
          email: formData.email,
          userType: "COMPANY_ADMIN",
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-primary-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white font-bold text-xl shadow-lg">
              T
            </div>
            <span className="text-2xl font-bold text-gray-900">TPTS</span>
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">Company Registration</h2>
          <p className="mt-2 text-sm text-gray-600">Step {step} of 4 • Register your courier company</p>
        </div>

        {/* Progress */}
        <div className="card mb-4 p-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className={step >= 1 ? "text-primary-600 font-medium" : "text-gray-400"}>
              Company Info
            </span>
            <span className={step >= 2 ? "text-primary-600 font-medium" : "text-gray-400"}>
              Contact & Address
            </span>
            <span className={step >= 3 ? "text-primary-600 font-medium" : "text-gray-400"}>
              Service & Pricing
            </span>
            <span className={step >= 4 ? "text-primary-600 font-medium" : "text-gray-400"}>
              Documents
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-primary-600 transition-all duration-300" style={{ width: `${(step / 4) * 100}%` }} />
          </div>
        </div>

        {/* Form Card */}
        <div className="card shadow-xl">
          <form onSubmit={handleSubmit}>
            <div className="p-6 sm:p-8 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Step 1: Company Info */}
              {step === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="companyName"
                      minLength={2}
                      maxLength={200}
                      className="input"
                      placeholder="e.g., Fast Courier Services Pvt Ltd"
                      value={formData.companyName}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Registration Number
                    </label>
                    <input
                      type="text"
                      name="registrationNumber"
                      maxLength={50}
                      className="input"
                      placeholder="Company registration number"
                      value={formData.registrationNumber}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      GST Number
                    </label>
                    <input
                      type="text"
                      name="gstNumber"
                      maxLength={20}
                      className="input"
                      placeholder="GST registration number"
                      value={formData.gstNumber}
                      onChange={handleChange}
                    />
                  </div>
                </>
              )}

              {/* Step 2: Contact & Address */}
              {step === 2 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Contact Person Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="contactPersonName"
                      minLength={2}
                      maxLength={100}
                      className="input"
                      placeholder="Admin/Manager name"
                      value={formData.contactPersonName}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        className="input"
                        placeholder="company@example.com"
                        value={formData.email}
                        onChange={handleChange}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        pattern="[6-9][0-9]{9}"
                        className="input"
                        placeholder="10-digit number"
                        value={formData.phone}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      minLength={6}
                      maxLength={50}
                      className="input"
                      placeholder="Minimum 6 characters"
                      value={formData.password}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Office Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="address"
                      rows={2}
                      className="input"
                      placeholder="Street, building, area"
                      value={formData.address}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="city"
                        maxLength={100}
                        className="input"
                        value={formData.city}
                        onChange={handleChange}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        State <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="state"
                        maxLength={100}
                        className="input"
                        value={formData.state}
                        onChange={handleChange}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Pincode <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="pincode"
                        pattern="[1-9][0-9]{5}"
                        className="input"
                        value={formData.pincode}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Step 3: Service & Pricing */}
              {step === 3 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Service Cities
                    </label>
                    <input
                      type="text"
                      name="serviceCities"
                      className="input"
                      placeholder="e.g., Chennai, Bangalore, Hyderabad"
                      value={formData.serviceCities}
                      onChange={handleChange}
                    />
                    <p className="mt-1 text-xs text-gray-500">Comma-separated list</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Base Rate per KM (₹)
                      </label>
                      <input
                        type="number"
                        name="baseRatePerKm"
                        step="0.01"
                        min="0"
                        className="input"
                        placeholder="e.g., 8.50"
                        value={formData.baseRatePerKm}
                        onChange={handleChange}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Base Rate per KG (₹)
                      </label>
                      <input
                        type="number"
                        name="baseRatePerKg"
                        step="0.01"
                        min="0"
                        className="input"
                        placeholder="e.g., 12.00"
                        value={formData.baseRatePerKg}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Step 4: Documents */}
              {step === 4 && (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Company Logo <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, "companyLogoUrl")}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                        disabled={uploadingDocs}
                      />
                      {formData.companyLogoUrl && (
                        <p className="mt-1 text-xs text-green-600">✓ Uploaded</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Registration Certificate <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(e, "registrationCertificateUrl")}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                        disabled={uploadingDocs}
                      />
                      {formData.registrationCertificateUrl && (
                        <p className="mt-1 text-xs text-green-600">✓ Uploaded</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        GST Certificate <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(e, "gstCertificateUrl")}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                        disabled={uploadingDocs}
                      />
                      {formData.gstCertificateUrl && (
                        <p className="mt-1 text-xs text-green-600">✓ Uploaded</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-md bg-amber-50 border border-amber-200 p-4 mt-4">
                    <p className="text-sm text-amber-900 font-medium mb-2">ℹ️ Pending Admin Approval</p>
                    <p className="text-xs text-amber-800">
                      Your company registration will be reviewed by TPTS admins. You'll receive an email
                      notification once approved. Complete documents speed up the approval process.
                    </p>
                  </div>
                </>
              )}

              {/* Error */}
              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-600">⚠️ {error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 sm:px-8 py-4 flex items-center justify-between gap-3">
              {step > 1 ? (
                <button type="button" onClick={() => setStep(step - 1)} className="btn-outline">
                  ← Back
                </button>
              ) : (
                <button type="button" onClick={onBack} className="btn-outline">
                  ← Account Type
                </button>
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-primary"
                >
                  Next →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || uploadingDocs}
                  className="btn-primary disabled:opacity-50"
                >
                  {loading ? "Submitting..." : uploadingDocs ? "Uploading..." : "Submit Registration"}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}