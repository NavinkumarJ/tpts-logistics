import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaBriefcase, FaMapMarkerAlt, FaGraduationCap, FaMoneyBillWave, FaSort, FaArrowLeft, FaSpinner, FaExclamationTriangle } from "react-icons/fa";
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

    // City filter - match companyCity or serviceCities
    if (cityFilter !== "all") {
      filtered = filtered.filter((job) => {
        if (job.companyCity && job.companyCity.toLowerCase() === cityFilter.toLowerCase()) {
          return true;
        }
        // Also check serviceCities for matches (handle JSON array or comma-separated)
        if (job.serviceCities) {
          try {
            const parsed = JSON.parse(job.serviceCities);
            if (Array.isArray(parsed)) {
              return parsed.some(c => String(c).toLowerCase() === cityFilter.toLowerCase());
            }
          } catch {
            // Fallback to string matching
            return job.serviceCities.toLowerCase().includes(cityFilter.toLowerCase());
          }
        }
        return false;
      });
    }

    // Experience filter - Note: Backend doesn't provide experience requirement per job
    // This is a placeholder for future implementation
    if (experienceFilter !== "all") {
      // Experience filtering would require backend support
      // For now, don't filter if this is selected
    }

    // Salary filter - Check if job's salary range overlaps with filter range
    if (salaryFilter !== "all") {
      const [filterMin, filterMax] = salaryFilter.split("-").map(Number);
      filtered = filtered.filter((job) => {
        const jobMin = job.salaryRangeMin || 0;
        const jobMax = job.salaryRangeMax || 999999;

        // Check if ranges overlap
        if (filterMax) {
          // Range has both min and max (e.g., 15000-25000)
          return jobMax >= filterMin && jobMin <= filterMax;
        } else {
          // Open-ended range (e.g., 35000+ for "Above ₹35,000")
          return jobMax >= filterMin;
        }
      });
    }

    // Sort
    if (sortBy === "newest") {
      // Keep default order (newest first from backend)
    } else if (sortBy === "salary-high") {
      filtered.sort((a, b) => (b.salaryRangeMax || 0) - (a.salaryRangeMax || 0));
    } else if (sortBy === "salary-low") {
      filtered.sort((a, b) => (a.salaryRangeMin || 0) - (b.salaryRangeMin || 0));
    } else if (sortBy === "rating") {
      filtered.sort((a, b) => (parseFloat(b.companyRating) || 0) - (parseFloat(a.companyRating) || 0));
    } else if (sortBy === "openings") {
      filtered.sort((a, b) => (b.openPositions || 0) - (a.openPositions || 0));
    }

    setFilteredJobs(filtered);
  };

  // Extract all unique cities from companyCity and serviceCities
  const cities = ["all", ...new Set(
    jobs.flatMap((j) => {
      const citiesList = [];
      if (j.companyCity) citiesList.push(j.companyCity);
      if (j.serviceCities) {
        // serviceCities might be a JSON array string or comma-separated
        try {
          // Try parsing as JSON array first
          const parsed = JSON.parse(j.serviceCities);
          if (Array.isArray(parsed)) {
            parsed.forEach(c => {
              const trimmed = String(c).trim();
              if (trimmed) citiesList.push(trimmed);
            });
          }
        } catch {
          // Fallback to comma-separated parsing
          j.serviceCities.split(",").forEach(c => {
            const trimmed = c.trim();
            if (trimmed) citiesList.push(trimmed);
          });
        }
      }
      return citiesList;
    })
  ).values()].filter(Boolean);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-indigo-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors group"
          >
            <FaArrowLeft className="text-sm group-hover:-translate-x-1 transition-transform" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
              <FaBriefcase className="text-2xl text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Delivery Agent <span className="text-primary-400">Jobs</span></h1>
          <p className="text-white/60">
            Join verified courier companies. {jobs.length} companies actively hiring.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* City */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-white/80 mb-2">
                <FaMapMarkerAlt className="text-primary-400" /> City
              </label>
              <select
                className="w-full bg-white/10 border border-white/20 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
              >
                {cities.map((city) => (
                  <option key={city} value={city} className="bg-slate-800 text-white">
                    {city === "all" ? "All Cities" : city}
                  </option>
                ))}
              </select>
            </div>

            {/* Experience */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-white/80 mb-2">
                <FaGraduationCap className="text-green-400" /> Experience
              </label>
              <select
                className="w-full bg-white/10 border border-white/20 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={experienceFilter}
                onChange={(e) => setExperienceFilter(e.target.value)}
              >
                <option value="all" className="bg-slate-800">All Levels</option>
                <option value="0-1" className="bg-slate-800">0-1 years</option>
                <option value="1-3" className="bg-slate-800">1-3 years</option>
                <option value="3-5" className="bg-slate-800">3-5 years</option>
                <option value="5+" className="bg-slate-800">5+ years</option>
              </select>
            </div>

            {/* Salary */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-white/80 mb-2">
                <FaMoneyBillWave className="text-yellow-400" /> Salary Range
              </label>
              <select
                className="w-full bg-white/10 border border-white/20 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={salaryFilter}
                onChange={(e) => setSalaryFilter(e.target.value)}
              >
                <option value="all" className="bg-slate-800">All Ranges</option>
                <option value="0-15000" className="bg-slate-800">Below ₹15,000</option>
                <option value="15000-25000" className="bg-slate-800">₹15,000 - ₹25,000</option>
                <option value="25000-35000" className="bg-slate-800">₹25,000 - ₹35,000</option>
                <option value="35000-999999" className="bg-slate-800">Above ₹35,000</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-white/80 mb-2">
                <FaSort className="text-purple-400" /> Sort By
              </label>
              <select
                className="w-full bg-white/10 border border-white/20 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest" className="bg-slate-800">Newest First</option>
                <option value="salary-high" className="bg-slate-800">Salary: High to Low</option>
                <option value="salary-low" className="bg-slate-800">Salary: Low to High</option>
                <option value="rating" className="bg-slate-800">Top Rated</option>
                <option value="openings" className="bg-slate-800">Most Openings</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="mb-6">
          <p className="text-white/60">
            Showing <span className="font-semibold text-white">{filteredJobs.length}</span> job{filteredJobs.length !== 1 && "s"}
          </p>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="text-center py-16">
            <FaSpinner className="inline-block h-8 w-8 animate-spin text-primary-400" />
            <p className="mt-4 text-white/60">Loading jobs...</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-500/20 backdrop-blur-sm border border-red-400/30 p-4 flex items-start gap-3">
            <FaExclamationTriangle className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-100">{error}</p>
          </div>
        )}

        {/* Job Grid */}
        {!loading && !error && filteredJobs.length === 0 && (
          <div className="text-center py-16">
            <p className="text-white/60">No jobs found matching your filters.</p>
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
