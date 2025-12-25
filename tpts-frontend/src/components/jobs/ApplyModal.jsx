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
        headers: { "Content-Type": "multipart/form-data" },
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="card max-w-md w-full p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 text-3xl mb-4">
            ✓
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Application Submitted!</h3>
          <p className="text-sm text-gray-600 mb-6">
            Thank you for applying to <strong>{job.companyName}</strong>. We'll review your application
            and get back to you soon.
          </p>
          <button onClick={onClose} className="btn-primary w-full">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="card max-w-3xl w-full my-8">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Apply to {job.companyName}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Step {step} of 4</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="px-6 py-3 bg-gray-50">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className={step >= 1 ? "text-primary-600 font-medium" : "text-gray-400"}>Personal</span>
            <span className={step >= 2 ? "text-primary-600 font-medium" : "text-gray-400"}>Professional</span>
            <span className={step >= 3 ? "text-primary-600 font-medium" : "text-gray-400"}>Documents</span>
            <span className={step >= 4 ? "text-primary-600 font-medium" : "text-gray-400"}>Additional</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-primary-600 transition-all duration-300" style={{ width: `${(step / 4) * 100}%` }} />
          </div>
        </div>

        <form onSubmit={(e) => e.preventDefault()}>
          <div className="px-6 py-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Step 1: Personal */}
            {step === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="applicantName"
                    className="input"
                    value={formData.applicantName}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="applicantEmail"
                    className="input"
                    value={formData.applicantEmail}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="applicantPhone"
                    pattern="[6-9][0-9]{9}"
                    className="input"
                    value={formData.applicantPhone}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    className="input"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="address"
                    rows={2}
                    className="input"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    className="input"
                    value={formData.city}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
                  <input type="text" name="state" className="input" value={formData.state} onChange={handleChange} />
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
            )}

            {/* Step 2: Professional */}
            {step === 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">License Expiry</label>
                  <input
                    type="month"
                    name="licenseExpiry"
                    className="input"
                    value={formData.licenseExpiry}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Experience</label>
                  <select name="experienceYears" className="input" value={formData.experienceYears} onChange={handleChange}>
                    <option value="0-1">0-1 years</option>
                    <option value="1-3">1-3 years</option>
                    <option value="3-5">3-5 years</option>
                    <option value="5+">5+ years</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Previous Employer</label>
                  <input
                    type="text"
                    name="previousEmployer"
                    className="input"
                    value={formData.previousEmployer}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Service Pincodes</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Preferred Shifts</label>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Profile Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, "photoUrl")}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    disabled={uploadingDocs}
                  />
                  {formData.photoUrl && <p className="mt-1 text-xs text-green-600">✓ Uploaded</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Driving License <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload(e, "licenseDocumentUrl")}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    disabled={uploadingDocs}
                  />
                  {formData.licenseDocumentUrl && <p className="mt-1 text-xs text-green-600">✓ Uploaded</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Aadhaar Card <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload(e, "aadhaarDocumentUrl")}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    disabled={uploadingDocs}
                  />
                  {formData.aadhaarDocumentUrl && <p className="mt-1 text-xs text-green-600">✓ Uploaded</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Vehicle RC <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload(e, "rcDocumentUrl")}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    disabled={uploadingDocs}
                  />
                  {formData.rcDocumentUrl && <p className="mt-1 text-xs text-green-600">✓ Uploaded</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Vehicle Photo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, "vehiclePhotoUrl")}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    disabled={uploadingDocs}
                  />
                  {formData.vehiclePhotoUrl && <p className="mt-1 text-xs text-green-600">✓ Uploaded</p>}
                </div>
              </div>
            )}

            {/* Step 4: Additional */}
            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Expected Salary (₹/month)</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Available From</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Cover Letter</label>
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
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="weekendAvailability" className="text-sm text-gray-700">
                    Available on weekends
                  </label>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 mt-4">
                <p className="text-sm text-red-600">⚠️ {error}</p>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button type="button" onClick={() => setStep(step - 1)} className="btn-outline">
                ← Back
              </button>
            ) : (
              <button type="button" onClick={onClose} className="btn-outline">
                Cancel
              </button>
            )}

            {step < 4 ? (
              <button type="button" onClick={handleNext} className="btn-primary">
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || uploadingDocs}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
