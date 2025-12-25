import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function ShipmentChart() {
  const data = [
    { month: "Jan", shipments: 12, delivered: 10 },
    { month: "Feb", shipments: 19, delivered: 16 },
    { month: "Mar", shipments: 15, delivered: 14 },
    { month: "Apr", shipments: 25, delivered: 22 },
    { month: "May", shipments: 22, delivered: 20 },
    { month: "Jun", shipments: 30, delivered: 28 },
  ];

  return (
    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Shipment Analytics</h3>
          <p className="text-sm text-gray-500">Last 6 months overview</p>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 12 }} />
          <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "#fff", 
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
            }} 
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Bar dataKey="shipments" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          <Bar dataKey="delivered" fill="#10b981" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
