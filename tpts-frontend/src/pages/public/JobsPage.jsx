import { useState, useEffect } from "react";
import apiClient from "../../utils/api";
import JobCard from "../../components/jobs/JobCard";
import ApplyModal from "../../components/jobs/ApplyModal";

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [cityFilter, setCityFilter] = useState("all");
  const [experienceFilter, setExperienceFilter] = useState("all");
  const [salaryFilter, setSalaryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Modal
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [jobs, cityFilter, experienceFilter, salaryFilter, sortBy]);

  const fetchJobs = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get("/jobs");
      setJobs(response.data.data || []);
    } catch (err) {
      setError("Failed to load jobs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...jobs];

    // City filter
    if (cityFilter !== "all") {
      filtered = filtered.filter((job) => job.city === cityFilter);
    }

    // Experience filter
    if (experienceFilter !== "all") {
      // This would need backend support or custom logic
    }

    // Salary filter
    if (salaryFilter !== "all") {
      const [min, max] = salaryFilter.split("-").map(Number);
      filtered = filtered.filter((job) => {
        const avgSalary = (job.salaryRangeMin + job.salaryRangeMax) / 2;
        if (max) return avgSalary >= min && avgSalary <= max;
        return avgSalary >= min;
      });
    }

    // Sort
    if (sortBy === "salary-high") {
      filtered.sort((a, b) => b.salaryRangeMax - a.salaryRangeMax);
    } else if (sortBy === "salary-low") {
      filtered.sort((a, b) => a.salaryRangeMin - b.salaryRangeMin);
    } else if (sortBy === "rating") {
      filtered.sort((a, b) => (b.ratingAvg || 0) - (a.ratingAvg || 0));
    } else if (sortBy === "openings") {
      filtered.sort((a, b) => b.openPositions - a.openPositions);
    }

    setFilteredJobs(filtered);
  };

  const cities = ["all", ...new Set(jobs.map((j) => j.city).filter(Boolean))];

  return (
    <main className="min-h-screen bg-gray-50 py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">💼 Delivery Agent Jobs</h1>
          <p className="mt-2 text-sm text-gray-600">
            Join verified courier companies. {jobs.length} companies actively hiring.
          </p>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* City */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                📍 City
              </label>
              <select
                className="input text-sm"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
              >
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city === "all" ? "All Cities" : city}
                  </option>
                ))}
              </select>
            </div>

            {/* Experience */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                🎓 Experience
              </label>
              <select
                className="input text-sm"
                value={experienceFilter}
                onChange={(e) => setExperienceFilter(e.target.value)}
              >
                <option value="all">All Levels</option>
                <option value="0-1">0-1 years</option>
                <option value="1-3">1-3 years</option>
                <option value="3-5">3-5 years</option>
                <option value="5+">5+ years</option>
              </select>
            </div>

            {/* Salary */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                💰 Salary Range
              </label>
              <select
                className="input text-sm"
                value={salaryFilter}
                onChange={(e) => setSalaryFilter(e.target.value)}
              >
                <option value="all">All Ranges</option>
                <option value="0-15000">Below ₹15,000</option>
                <option value="15000-25000">₹15,000 - ₹25,000</option>
                <option value="25000-35000">₹25,000 - ₹35,000</option>
                <option value="35000-999999">Above ₹35,000</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                🔄 Sort By
              </label>
              <select
                className="input text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="salary-high">Salary: High to Low</option>
                <option value="salary-low">Salary: Low to High</option>
                <option value="rating">Top Rated</option>
                <option value="openings">Most Openings</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredJobs.length}</span> job{filteredJobs.length !== 1 && "s"}
          </p>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
            <p className="mt-3 text-sm text-gray-600">Loading jobs...</p>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-600">⚠️ {error}</p>
          </div>
        )}

        {/* Job Grid */}
        {!loading && !error && filteredJobs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No jobs found matching your filters.</p>
          </div>
        )}

        {!loading && !error && filteredJobs.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.companyId}
                job={job}
                onApply={() => {
                  setSelectedJob(job);
                  setShowApplyModal(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Apply Modal */}
      {showApplyModal && selectedJob && (
        <ApplyModal
          job={selectedJob}
          onClose={() => {
            setShowApplyModal(false);
            setSelectedJob(null);
          }}
        />
      )}
    </main>
  );
}
