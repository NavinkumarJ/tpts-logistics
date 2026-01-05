import { FaBox, FaTruck, FaCheckCircle, FaMapMarkerAlt, FaArrowUp, FaArrowDown } from "react-icons/fa";

export default function StatsCards({ stats }) {
  const cards = [
    {
      title: "Total Shipments",
      value: stats.totalShipments,
      icon: FaBox,
      gradient: "from-blue-500 to-blue-600",
      iconBg: "bg-blue-500/30",
      trend: "+12%",
      trendUp: true,
    },
    {
      title: "Active Shipments",
      value: stats.activeShipments,
      icon: FaTruck,
      gradient: "from-orange-500 to-orange-600",
      iconBg: "bg-orange-500/30",
      trend: "+8%",
      trendUp: true,
      highlight: stats.activeShipments > 0,
    },
    {
      title: "Completed",
      value: stats.completedShipments,
      icon: FaCheckCircle,
      gradient: "from-green-500 to-green-600",
      iconBg: "bg-green-500/30",
      trend: "+24%",
      trendUp: true,
    },
    {
      title: "Saved Addresses",
      value: stats.totalAddresses,
      icon: FaMapMarkerAlt,
      gradient: "from-purple-500 to-purple-600",
      iconBg: "bg-purple-500/30",
      trend: "0%",
      trendUp: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`relative bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 ${card.highlight ? "ring-2 ring-orange-400" : ""
            }`}
        >
          {/* Gradient Background Decoration */}
          <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${card.gradient} opacity-20 rounded-bl-full`}></div>

          <div className="relative">
            {/* Icon */}
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${card.iconBg} mb-4`}>
              <card.icon className="text-xl text-white" />
            </div>

            {/* Title */}
            <p className="text-xs font-medium text-white/60 uppercase tracking-wide mb-1">
              {card.title}
            </p>

            {/* Value */}
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-white">{card.value}</p>

              {/* Trend Indicator */}
              <div className={`flex items-center gap-1 text-xs font-semibold ${card.trendUp ? "text-green-400" : "text-white/40"
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
              <div className="mt-3 flex items-center gap-1.5 text-xs text-orange-400 font-medium">
                <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></span>
                Needs attention
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}