export default function JobCard({ job, onApply }) {
  return (
    <div className="card hover:shadow-lg transition overflow-hidden">
      {/* Header with logo/icon */}
      <div className="bg-gradient-to-r from-primary-600 to-indigo-600 px-5 py-4 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/20 text-xl font-bold backdrop-blur">
              {job.companyName.charAt(0)}
            </div>
            <div>
              <h3 className="text-base font-semibold">{job.companyName}</h3>
              <div className="mt-1 flex items-center gap-1 text-xs text-white/90">
                ⭐ {job.ratingAvg ? job.ratingAvg.toFixed(1) : "New"}
                <span className="mx-1">•</span>
                {job.totalDeliveries || 0} deliveries
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-3">
        {/* Location */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>📍</span>
          <span>{job.city}, {job.state}</span>
        </div>

        {/* Job Type */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            Full-time
          </span>
          <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
            Flexible Hours
          </span>
        </div>

        {/* Salary */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Salary Range</p>
          <p className="text-lg font-bold text-gray-900">
            ₹{job.salaryRangeMin?.toLocaleString()} - ₹{job.salaryRangeMax?.toLocaleString()}
            <span className="text-sm font-normal text-gray-500">/month</span>
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
          <div>
            <p className="text-xs text-gray-500">Open Positions</p>
            <p className="text-base font-semibold text-gray-900">{job.openPositions || 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Applicants</p>
            <p className="text-base font-semibold text-gray-900">{job.totalApplicants || 0}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-5 flex gap-3">
        <button
          onClick={onApply}
          className="btn-primary flex-1"
        >
          Apply Now
        </button>
        <button className="btn-outline px-4">
          View Details
        </button>
      </div>
    </div>
  );
}
