import { useState } from "react";
import apiClient from "../../utils/api";

export default function ApplyModal({ job, onClose }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    companyId: job.companyId,
    applicantName: "",
    applicantEmail: "",
    applicantPhone: "",
    dateOfBirth: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    vehicleType: "BIKE",
    vehicleNumber: "",
    licenseNumber: "",
    licenseExpiry: "",
    experienceYears: "0-1",
    previousEmployer: "",
    servicePincodes: "",
    preferredShifts: "flexible",
    licenseDocumentUrl: "",
    aadhaarDocumentUrl: "",
    rcDocumentUrl: "",
    vehiclePhotoUrl: "",
    photoUrl: "",
    coverLetter: "",
    expectedSalary: "",
    availableFrom: "Immediately",
    weekendAvailability: true,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileUpload = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingDocs(true);
    setError("");

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("applicationId", Date.now());

      const endpoint = fieldName === "photoUrl" ? "/upload/profile" : "/upload/job-document";

      const response = await apiClient.post(endpoint, uploadFormData, {
        // Don't set Content-Type for FormData - browser will set it with the correct boundary
        params: fieldName !== "photoUrl" ? { docType: fieldName } : {},
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

  // ✅ Validation functions
  const validateStep1 = () => {
    if (!formData.applicantName.trim()) {
      setError("Full name is required");
      return false;
    }
    if (!formData.applicantEmail.trim()) {
      setError("Email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.applicantEmail)) {
      setError("Please enter a valid email address");
      return false;
    }
    if (!formData.applicantPhone.trim()) {
      setError("Phone number is required");
      return false;
    }
    if (!/^[6-9]\d{9}$/.test(formData.applicantPhone)) {
      setError("Please enter a valid 10-digit phone number");
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

  const validateStep2 = () => {
    if (!formData.vehicleNumber.trim()) {
      setError("Vehicle number is required");
      return false;
    }
    if (!formData.licenseNumber.trim()) {
      setError("License number is required");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!formData.licenseDocumentUrl) {
      setError("Driving license document is required");
      return false;
    }
    if (!formData.aadhaarDocumentUrl) {
      setError("Aadhaar card document is required");
      return false;
    }
    if (!formData.rcDocumentUrl) {
      setError("Vehicle RC document is required");
      return false;
    }
    return true;
  };

  const validateStep4 = () => {
    // Step 4 fields are optional
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
    if (e) e.preventDefault();

    // Final validation
    if (!validateStep1() || !validateStep2() || !validateStep3() || !validateStep4()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Prepare data - convert expectedSalary to number or null
      const submitData = {
        ...formData,
        expectedSalary: formData.expectedSalary ? parseInt(formData.expectedSalary, 10) : null,
      };

      await apiClient.post("/job-applications", submitData);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit application.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl max-w-md w-full p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-green-400 text-3xl mb-4">
            ✓
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Application Submitted!</h3>
          <p className="text-sm text-white/60 mb-6">
            Thank you for applying to <strong className="text-white">{job.companyName}</strong>. We'll review your application
            and get back to you soon.
          </p>
          <button onClick={onClose} className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl max-w-3xl w-full my-8">
        <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Apply to {job.companyName}</h2>
            <p className="text-xs text-white/50 mt-0.5">Step {step} of 4</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="px-6 py-3 bg-white/5">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className={step >= 1 ? "text-indigo-400 font-medium" : "text-white/40"}>Personal</span>
            <span className={step >= 2 ? "text-indigo-400 font-medium" : "text-white/40"}>Professional</span>
            <span className={step >= 3 ? "text-indigo-400 font-medium" : "text-white/40"}>Documents</span>
            <span className={step >= 4 ? "text-indigo-400 font-medium" : "text-white/40"}>Additional</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300" style={{ width: `${(step / 4) * 100}%` }} />
          </div>
        </div>

        <form onSubmit={(e) => e.preventDefault()}>
          <div className="px-6 py-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Step 1: Personal */}
            {step === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-white/80 mb-1.5">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="applicantName"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={formData.applicantName}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="applicantEmail"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={formData.applicantEmail}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">
                    Phone <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    name="applicantPhone"
                    pattern="[6-9][0-9]{9}"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={formData.applicantPhone}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-white/80 mb-1.5">
                    Address <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    name="address"
                    rows={2}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">
                    City <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={formData.city}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">State</label>
                  <input type="text" name="state" className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" value={formData.state} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">
                    Pincode <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    pattern="[1-9][0-9]{5}"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={formData.pincode}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Professional */}
            {step === 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">
                    Vehicle Type <span className="text-red-500">*</span>
                  </label>
                  <select name="vehicleType" className="input" value={formData.vehicleType} onChange={handleChange}>
                    <option value="BIKE">Bike</option>
                    <option value="SCOOTER">Scooter</option>
                    <option value="CAR">Car</option>
                    <option value="VAN">Van</option>
                    <option value="TRUCK">Truck</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">
                    Vehicle Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="vehicleNumber"
                    className="input"
                    value={formData.vehicleNumber}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">
                    License Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="licenseNumber"
                    className="input"
                    value={formData.licenseNumber}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">License Expiry</label>
                  <input
                    type="month"
                    name="licenseExpiry"
                    className="input"
                    value={formData.licenseExpiry}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">Experience</label>
                  <select name="experienceYears" className="input" value={formData.experienceYears} onChange={handleChange}>
                    <option value="0-1">0-1 years</option>
                    <option value="1-3">1-3 years</option>
                    <option value="3-5">3-5 years</option>
                    <option value="5+">5+ years</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">Previous Employer</label>
                  <input
                    type="text"
                    name="previousEmployer"
                    className="input"
                    value={formData.previousEmployer}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">Service Pincodes</label>
                  <input
                    type="text"
                    name="servicePincodes"
                    className="input"
                    placeholder="600001, 600002"
                    value={formData.servicePincodes}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">Preferred Shifts</label>
                  <select name="preferredShifts" className="input" value={formData.preferredShifts} onChange={handleChange}>
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Evening</option>
                    <option value="night">Night</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 3: Documents */}
            {step === 3 && (
              <div className="space-y-4">
                {/* Profile Photo */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">
                    Profile Photo <span className="text-xs text-white/40 font-normal">(Image only)</span>
                  </label>
                  {formData.photoUrl ? (
                    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <span className="text-green-600 text-lg">✓</span>
                      <span className="text-sm text-green-700 flex-1">Photo uploaded</span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, photoUrl: '' }))}
                        className="text-xs text-gray-500 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, "photoUrl")}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                      disabled={uploadingDocs}
                    />
                  )}
                </div>

                {/* Driving License */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">
                    Driving License <span className="text-red-500">*</span>
                    <span className="text-xs text-white/40 font-normal ml-1">(PDF or Image)</span>
                  </label>
                  {formData.licenseDocumentUrl ? (
                    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <span className="text-green-600 text-lg">✓</span>
                      <span className="text-sm text-green-700 flex-1">Driving License uploaded</span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, licenseDocumentUrl: '' }))}
                        className="text-xs text-gray-500 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, "licenseDocumentUrl")}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                      disabled={uploadingDocs}
                    />
                  )}
                </div>

                {/* Aadhaar Card */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">
                    Aadhaar Card <span className="text-red-500">*</span>
                    <span className="text-xs text-white/40 font-normal ml-1">(PDF or Image)</span>
                  </label>
                  {formData.aadhaarDocumentUrl ? (
                    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <span className="text-green-600 text-lg">✓</span>
                      <span className="text-sm text-green-700 flex-1">Aadhaar Card uploaded</span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, aadhaarDocumentUrl: '' }))}
                        className="text-xs text-gray-500 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, "aadhaarDocumentUrl")}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                      disabled={uploadingDocs}
                    />
                  )}
                </div>

                {/* Vehicle RC */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">
                    Vehicle RC <span className="text-red-500">*</span>
                    <span className="text-xs text-white/40 font-normal ml-1">(PDF or Image)</span>
                  </label>
                  {formData.rcDocumentUrl ? (
                    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <span className="text-green-600 text-lg">✓</span>
                      <span className="text-sm text-green-700 flex-1">Vehicle RC uploaded</span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, rcDocumentUrl: '' }))}
                        className="text-xs text-gray-500 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, "rcDocumentUrl")}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                      disabled={uploadingDocs}
                    />
                  )}
                </div>

                {/* Vehicle Photo */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">
                    Vehicle Photo <span className="text-xs text-white/40 font-normal">(Image only)</span>
                  </label>
                  {formData.vehiclePhotoUrl ? (
                    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <span className="text-green-600 text-lg">✓</span>
                      <span className="text-sm text-green-700 flex-1">Vehicle Photo uploaded</span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, vehiclePhotoUrl: '' }))}
                        className="text-xs text-gray-500 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, "vehiclePhotoUrl")}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                      disabled={uploadingDocs}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Additional */}
            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">Expected Salary (₹/month)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    name="expectedSalary"
                    className="input"
                    placeholder="e.g., 20000"
                    value={formData.expectedSalary}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">Available From</label>
                  <input
                    type="text"
                    name="availableFrom"
                    className="input"
                    placeholder="Immediately or DD-MM-YYYY"
                    value={formData.availableFrom}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">Cover Letter</label>
                  <textarea
                    name="coverLetter"
                    rows={4}
                    className="input"
                    placeholder="Why do you want to join us?"
                    value={formData.coverLetter}
                    onChange={handleChange}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="weekendAvailability"
                    id="weekendAvailability"
                    checked={formData.weekendAvailability}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-white/20 bg-white/10 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="weekendAvailability" className="text-sm text-white/80">
                    Available on weekends
                  </label>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-500/20 border border-red-500/30 p-3 mt-4">
                <p className="text-sm text-red-400">⚠️ {error}</p>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 px-6 py-4 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button type="button" onClick={() => setStep(step - 1)} className="px-5 py-2.5 bg-white/10 border border-white/20 text-white rounded-xl font-medium hover:bg-white/20 transition">
                ← Back
              </button>
            ) : (
              <button type="button" onClick={onClose} className="px-5 py-2.5 bg-white/10 border border-white/20 text-white rounded-xl font-medium hover:bg-white/20 transition">
                Cancel
              </button>
            )}

            {step < 4 ? (
              <button type="button" onClick={handleNext} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition">
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || uploadingDocs}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Submitting..." : uploadingDocs ? "Uploading..." : "Submit Application"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
