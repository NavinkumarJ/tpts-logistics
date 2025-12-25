import { FaBox, FaTruck, FaCheckCircle, FaMapMarkerAlt, FaArrowUp, FaArrowDown } from "react-icons/fa";

export default function StatsCards({ stats }) {
  const cards = [
    {
      title: "Total Shipments",
      value: stats.totalShipments,
      icon: FaBox,
      gradient: "from-blue-500 to-blue-600",
      bgLight: "bg-blue-50",
      textColor: "text-blue-600",
      trend: "+12%",
      trendUp: true,
    },
    {
      title: "Active Shipments",
      value: stats.activeShipments,
      icon: FaTruck,
      gradient: "from-orange-500 to-orange-600",
      bgLight: "bg-orange-50",
      textColor: "text-orange-600",
      trend: "+8%",
      trendUp: true,
      highlight: stats.activeShipments > 0,
    },
    {
      title: "Completed",
      value: stats.completedShipments,
      icon: FaCheckCircle,
      gradient: "from-green-500 to-green-600",
      bgLight: "bg-green-50",
      textColor: "text-green-600",
      trend: "+24%",
      trendUp: true,
    },
    {
      title: "Saved Addresses",
      value: stats.totalAddresses,
      icon: FaMapMarkerAlt,
      gradient: "from-purple-500 to-purple-600",
      bgLight: "bg-purple-50",
      textColor: "text-purple-600",
      trend: "0%",
      trendUp: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`relative bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 ${
            card.highlight ? "ring-2 ring-orange-400" : ""
          }`}
        >
          {/* Gradient Background Decoration */}
          <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${card.gradient} opacity-10 rounded-bl-full`}></div>
          
          <div className="relative">
            {/* Icon */}
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${card.bgLight} mb-4`}>
              <card.icon className={`text-xl ${card.textColor}`} />
            </div>

            {/* Title */}
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              {card.title}
            </p>

            {/* Value */}
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              
              {/* Trend Indicator */}
              <div className={`flex items-center gap-1 text-xs font-semibold ${
                card.trendUp ? "text-green-600" : "text-gray-400"
              }`}>
                {card.trendUp ? (
                  <FaArrowUp className="text-xs" />
                ) : (
                  <FaArrowDown className="text-xs" />
                )}
                {card.trend}
              </div>
            </div>

            {/* Highlight Badge */}
            {card.highlight && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-orange-600 font-medium">
                <span className="w-2 h-2 bg-orange-600 rounded-full animate-pulse"></span>
                Needs attention
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}