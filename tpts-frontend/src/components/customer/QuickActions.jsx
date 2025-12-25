import { Link } from "react-router-dom";
import { FaPlus, FaSearch, FaHistory, FaCog } from "react-icons/fa";

export default function QuickActions() {
  const actions = [
    {
      label: "New Shipment",
      icon: FaPlus,
      to: "/customer/new-shipment",
      color: "bg-primary-600 hover:bg-primary-700",
      primary: true,
    },
    {
      label: "Track Parcel",
      icon: FaSearch,
      to: "/track",
      color: "bg-indigo-600 hover:bg-indigo-700",
    },
    {
      label: "Order History",
      icon: FaHistory,
      to: "/customer/shipments",
      color: "bg-purple-600 hover:bg-purple-700",
    },
    {
      label: "Settings",
      icon: FaCog,
      to: "/customer/settings",
      color: "bg-gray-600 hover:bg-gray-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((action, idx) => (
        <Link
          key={idx}
          to={action.to}
          className={`card p-4 ${
            action.primary
              ? "ring-2 ring-primary-500 bg-gradient-to-br from-primary-50 to-indigo-50"
              : ""
          } hover:shadow-md transition text-center group`}
        >
          <div
            className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg ${action.color} text-white transition`}
          >
            <action.icon className="text-lg" />
          </div>
          <p className="text-sm font-semibold text-gray-900">{action.label}</p>
        </Link>
      ))}
    </div>
  );
}
