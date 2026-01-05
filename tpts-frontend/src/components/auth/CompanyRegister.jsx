import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaBuilding, FaUser, FaEnvelope, FaPhone, FaLock, FaMapMarkerAlt, FaCity, FaGlobe, FaRupeeSign, FaUpload, FaCheckCircle, FaTimes } from "react-icons/fa";
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

      const isLogo = fieldName === "companyLogoUrl";
      const endpoint = isLogo ? "/upload/company-logo" : "/upload/company-document";

      if (!isLogo) {
        uploadFormData.append("docType", fieldName.replace("Url", ""));
      }

      const response = await apiClient.post(endpoint, uploadFormData);

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

  const validateStep1 = () => {
    if (!formData.companyName.trim()) { setError("Company name is required"); return false; }
    if (formData.companyName.length < 2) { setError("Company name must be at least 2 characters"); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.contactPersonName.trim()) { setError("Contact person name is required"); return false; }
    if (!formData.email.trim()) { setError("Email is required"); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { setError("Please enter a valid email address"); return false; }
    if (!formData.phone.trim()) { setError("Phone number is required"); return false; }
    if (!/^[6-9]\d{9}$/.test(formData.phone)) { setError("Please enter a valid 10-digit phone number starting with 6-9"); return false; }
    if (!formData.password.trim()) { setError("Password is required"); return false; }
    if (formData.password.length < 6) { setError("Password must be at least 6 characters"); return false; }
    if (!formData.address.trim()) { setError("Address is required"); return false; }
    if (!formData.city.trim()) { setError("City is required"); return false; }
    if (!formData.state.trim()) { setError("State is required"); return false; }
    if (!formData.pincode.trim()) { setError("Pincode is required"); return false; }
    if (!/^[1-9][0-9]{5}$/.test(formData.pincode)) { setError("Please enter a valid 6-digit pincode"); return false; }
    return true;
  };

  const validateStep3 = () => true;

  const validateStep4 = () => {
    if (!formData.companyLogoUrl) { setError("Company logo is required"); return false; }
    if (!formData.registrationCertificateUrl) { setError("Registration certificate is required"); return false; }
    if (!formData.gstCertificateUrl) { setError("GST certificate is required"); return false; }
    return true;
  };

  const handleNext = () => {
    setError("");
    let isValid = false;
    switch (step) {
      case 1: isValid = validateStep1(); break;
      case 2: isValid = validateStep2(); break;
      case 3: isValid = validateStep3(); break;
      case 4: isValid = validateStep4(); break;
      default: isValid = false;
    }
    if (isValid && step < 4) setStep(step + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep1() || !validateStep2() || !validateStep3() || !validateStep4()) return;

    setLoading(true);
    setError("");

    try {
      const payload = {
        ...formData,
        serviceCities: formData.serviceCities.split(",").map((city) => city.trim()).filter(Boolean),
        baseRatePerKm: formData.baseRatePerKm ? parseFloat(formData.baseRatePerKm) : null,
        baseRatePerKg: formData.baseRatePerKg ? parseFloat(formData.baseRatePerKg) : null,
      };

      await apiClient.post("/auth/register/company", payload);
      navigate("/verify-otp", { state: { email: formData.email, userType: "COMPANY_ADMIN" } });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition";
  const labelClass = "block text-sm font-medium text-white/80 mb-1.5";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-indigo-900 flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Back Button */}
        <div className="mb-6">
          <button onClick={onBack} className="text-sm text-white/70 hover:text-white flex items-center gap-2 transition-colors group">
            <FaArrowLeft className="text-xs group-hover:-translate-x-1 transition-transform" />
            <span>Back to Account Type</span>
          </button>
        </div>

        {/* Logo */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-3 mb-4 group">
            <img src="/logo.png" alt="TPTS Logo" className="h-16 w-auto object-contain transition-all duration-200 group-hover:brightness-125 group-hover:scale-105" />
          </Link>
          <h2 className="text-2xl font-bold text-white">Company Registration</h2>
          <p className="mt-2 text-sm text-white/60">Step {step} of 4 • Register your courier company</p>
        </div>

        {/* Progress */}
        <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 mb-4 p-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className={step >= 1 ? "text-purple-300 font-medium" : "text-white/60"}>Company Info</span>
            <span className={step >= 2 ? "text-purple-300 font-medium" : "text-white/60"}>Contact & Address</span>
            <span className={step >= 3 ? "text-purple-300 font-medium" : "text-white/60"}>Service & Pricing</span>
            <span className={step >= 4 ? "text-purple-300 font-medium" : "text-white/60"}>Documents</span>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-300" style={{ width: `${(step / 4) * 100}%` }} />
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl">
          <form onSubmit={handleSubmit}>
            <div className="p-6 sm:p-8 space-y-5 max-h-[55vh] overflow-y-auto">
              {/* Step 1: Company Info */}
              {step === 1 && (
                <>
                  <div>
                    <label className={labelClass}>Company Name <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaBuilding className="text-white/60" /></div>
                      <input type="text" name="companyName" minLength={2} maxLength={200} className={inputClass} placeholder="e.g., Fast Courier Services Pvt Ltd" value={formData.companyName} onChange={handleChange} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Registration Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaBuilding className="text-white/60" /></div>
                      <input type="text" name="registrationNumber" maxLength={50} className={inputClass} placeholder="Company registration number" value={formData.registrationNumber} onChange={handleChange} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>GST Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaBuilding className="text-white/60" /></div>
                      <input type="text" name="gstNumber" maxLength={20} className={inputClass} placeholder="GST registration number" value={formData.gstNumber} onChange={handleChange} />
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Contact & Address */}
              {step === 2 && (
                <>
                  <div>
                    <label className={labelClass}>Contact Person Name <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaUser className="text-white/60" /></div>
                      <input type="text" name="contactPersonName" minLength={2} maxLength={100} className={inputClass} placeholder="Admin/Manager name" value={formData.contactPersonName} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Email <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaEnvelope className="text-white/60" /></div>
                        <input type="email" name="email" className={inputClass} placeholder="company@example.com" value={formData.email} onChange={handleChange} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Phone <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaPhone className="text-white/60" /></div>
                        <input type="tel" name="phone" pattern="[6-9][0-9]{9}" className={inputClass} placeholder="10-digit number" value={formData.phone} onChange={handleChange} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Password <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaLock className="text-white/60" /></div>
                      <input type="password" name="password" minLength={6} maxLength={50} className={inputClass} placeholder="Minimum 6 characters" value={formData.password} onChange={handleChange} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Office Address <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <div className="absolute top-3 left-0 pl-3 pointer-events-none"><FaMapMarkerAlt className="text-white/60" /></div>
                      <textarea name="address" rows={2} className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" placeholder="Street, building, area" value={formData.address} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>City <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaCity className="text-white/60" /></div>
                        <input type="text" name="city" maxLength={100} className={inputClass} value={formData.city} onChange={handleChange} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>State <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaGlobe className="text-white/60" /></div>
                        <input type="text" name="state" maxLength={100} className={inputClass} value={formData.state} onChange={handleChange} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Pincode <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaMapMarkerAlt className="text-white/60" /></div>
                        <input type="text" name="pincode" pattern="[1-9][0-9]{5}" className={inputClass} value={formData.pincode} onChange={handleChange} />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Step 3: Service & Pricing */}
              {step === 3 && (
                <>
                  <div>
                    <label className={labelClass}>Service Cities</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaCity className="text-white/60" /></div>
                      <input type="text" name="serviceCities" className={inputClass} placeholder="e.g., Chennai, Bangalore, Hyderabad" value={formData.serviceCities} onChange={handleChange} />
                    </div>
                    <p className="mt-1 text-xs text-white/60">Comma-separated list</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Base Rate per KM (₹)</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaRupeeSign className="text-white/60" /></div>
                        <input type="number" name="baseRatePerKm" step="0.01" min="0" className={inputClass} placeholder="e.g., 8.50" value={formData.baseRatePerKm} onChange={handleChange} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Base Rate per KG (₹)</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaRupeeSign className="text-white/60" /></div>
                        <input type="number" name="baseRatePerKg" step="0.01" min="0" className={inputClass} placeholder="e.g., 12.00" value={formData.baseRatePerKg} onChange={handleChange} />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Step 4: Documents */}
              {step === 4 && (
                <>
                  <div className="space-y-4">
                    {/* Company Logo */}
                    <div>
                      <label className={labelClass}>Company Logo <span className="text-red-400">*</span> <span className="text-xs text-white/40 font-normal ml-1">(Image only)</span></label>
                      {formData.companyLogoUrl ? (
                        <div className="flex items-center gap-2 p-3 bg-green-500/20 border border-green-500/30 rounded-xl">
                          <FaCheckCircle className="text-green-400" />
                          <span className="text-sm text-green-300 truncate flex-1">Logo uploaded</span>
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, companyLogoUrl: '' }))} className="text-xs text-white/50 hover:text-red-400 px-2 py-1 rounded hover:bg-red-500/20"><FaTimes /></button>
                        </div>
                      ) : (
                        <div className="relative">
                          <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "companyLogoUrl")} className="block w-full text-sm text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-purple-500/30 file:text-purple-300 hover:file:bg-purple-500/50 cursor-pointer" disabled={uploadingDocs} />
                        </div>
                      )}
                    </div>

                    {/* Registration Certificate */}
                    <div>
                      <label className={labelClass}>Registration Certificate <span className="text-red-400">*</span> <span className="text-xs text-white/40 font-normal ml-1">(PDF or Image)</span></label>
                      {formData.registrationCertificateUrl ? (
                        <div className="flex items-center gap-2 p-3 bg-green-500/20 border border-green-500/30 rounded-xl">
                          <FaCheckCircle className="text-green-400" />
                          <span className="text-sm text-green-300 truncate flex-1">Certificate uploaded</span>
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, registrationCertificateUrl: '' }))} className="text-xs text-white/50 hover:text-red-400 px-2 py-1 rounded hover:bg-red-500/20"><FaTimes /></button>
                        </div>
                      ) : (
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload(e, "registrationCertificateUrl")} className="block w-full text-sm text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-purple-500/30 file:text-purple-300 hover:file:bg-purple-500/50 cursor-pointer" disabled={uploadingDocs} />
                      )}
                    </div>

                    {/* GST Certificate */}
                    <div>
                      <label className={labelClass}>GST Certificate <span className="text-red-400">*</span> <span className="text-xs text-white/40 font-normal ml-1">(PDF or Image)</span></label>
                      {formData.gstCertificateUrl ? (
                        <div className="flex items-center gap-2 p-3 bg-green-500/20 border border-green-500/30 rounded-xl">
                          <FaCheckCircle className="text-green-400" />
                          <span className="text-sm text-green-300 truncate flex-1">GST Certificate uploaded</span>
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, gstCertificateUrl: '' }))} className="text-xs text-white/50 hover:text-red-400 px-2 py-1 rounded hover:bg-red-500/20"><FaTimes /></button>
                        </div>
                      ) : (
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload(e, "gstCertificateUrl")} className="block w-full text-sm text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-purple-500/30 file:text-purple-300 hover:file:bg-purple-500/50 cursor-pointer" disabled={uploadingDocs} />
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 mt-4">
                    <p className="text-sm text-amber-300 font-medium mb-2">ℹ️ Pending Admin Approval</p>
                    <p className="text-xs text-white/60">Your company registration will be reviewed by TPTS admins. You'll receive an email notification once approved.</p>
                  </div>
                </>
              )}

              {/* Error */}
              {error && (
                <div className="rounded-xl bg-red-500/20 border border-red-500/30 p-3">
                  <p className="text-sm text-red-300">⚠️ {error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/20 px-6 sm:px-8 py-4 flex items-center justify-between gap-3">
              {step > 1 ? (
                <button type="button" onClick={() => setStep(step - 1)} className="py-2.5 px-5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium rounded-xl transition-all">← Back</button>
              ) : (
                <button type="button" onClick={onBack} className="py-2.5 px-5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium rounded-xl transition-all">← Account Type</button>
              )}

              {step < 4 ? (
                <button type="button" onClick={handleNext} className="py-2.5 px-5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/30 transition-all">Next →</button>
              ) : (
                <button type="submit" disabled={loading || uploadingDocs} className="py-2.5 px-5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/30 transition-all disabled:opacity-50">
                  {loading ? "Submitting..." : uploadingDocs ? "Uploading..." : "Submit Registration"}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Login Link */}
        <div className="mt-8 text-center">
          <p className="text-base text-white/80">
            Already have an account?{" "}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-bold hover:underline text-lg">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}