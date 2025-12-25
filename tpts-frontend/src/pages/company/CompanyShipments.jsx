import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getCompanyGroups } from "../../services/companyService";

export default function CompanyShipments() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const groupsData = await getCompanyGroups();
      setShipments(groupsData || []);
    } catch (err) {
      console.error("Failed to fetch shipments:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredShipments = shipments.filter((s) => {
    if (filter === "all") return true;
    if (filter === "active") return ["PENDING", "ASSIGNED", "IN_PROGRESS"].includes(s.status);
    if (filter === "completed") return s.status === "COMPLETED";
    return true;
  });

  const getStatusColor = (status) => {
    const colors = {
      PENDING: "bg-yellow-100 text-yellow-800",
      ASSIGNED: "bg-blue-100 text-blue-800",
      IN_PROGRESS: "bg-purple-100 text-purple-800",
      COMPLETED: "bg-green-100 text-green-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        <p className="mt-3 text-sm text-gray-600">Loading shipments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Group Shipments</h1>
          <p className="text-sm text-gray-600 mt-1">Manage all your group shipments</p>
        </div>
        <div className="flex gap-2">
          <Link to="/company/dashboard" className="btn-outline text-sm">
            ← Dashboard
          </Link>
          <Link to="/company/create-shipment" className="btn-primary text-sm">
            + Create Shipment
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === "all" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
          >
            All ({shipments.length})
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === "active" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === "completed" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Shipments List */}
      {filteredShipments.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-200">
          <div className="text-5xl mb-4">📦</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Shipments Found</h3>
          <p className="text-sm text-gray-600 mb-6">
            You haven't created any group shipments yet.
          </p>
          <Link to="/company/create-shipment" className="btn-primary">
            Create Group Shipment
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredShipments.map((shipment) => (
            <div
              key={shipment.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                        shipment.status
                      )}`}
                    >
                      {shipment.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(shipment.createdAt).toLocaleDateString("en-IN")}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-gray-900 mb-1">
                    Group #{shipment.id} - {shipment.totalParcels} Parcels
                  </p>

                  <p className="text-xs text-gray-600 mb-2">
                    <strong>Route:</strong> {shipment.pickupCity} → {shipment.deliveryCity}
                  </p>

                  <p className="text-xs text-gray-500">
                    💰 Total: ₹{shipment.totalAmount}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Link
                    to={`/company/shipments/${shipment.id}`}
                    className="btn-primary text-xs px-4 py-2 text-center"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
