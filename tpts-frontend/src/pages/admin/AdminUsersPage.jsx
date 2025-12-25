import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAllUsers, updateUserStatus, deleteUser } from "../../services/adminService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import {
    FaUsers, FaSearch, FaUserCheck, FaUserTimes, FaTrash,
    FaBuilding, FaTruck, FaUser, FaEllipsisV, FaSync,
    FaChevronLeft, FaChevronRight, FaStar, FaEnvelope, FaPhone
} from "react-icons/fa";

const USER_TYPE_CONFIG = {
    CUSTOMER: { label: "Customer", icon: FaUser, color: "bg-blue-100 text-blue-700", borderColor: "border-blue-200" },
    COMPANY_ADMIN: { label: "Company", icon: FaBuilding, color: "bg-purple-100 text-purple-700", borderColor: "border-purple-200" },
    DELIVERY_AGENT: { label: "Agent", icon: FaTruck, color: "bg-orange-100 text-orange-700", borderColor: "border-orange-200" },
    SUPER_ADMIN: { label: "Admin", icon: FaUsers, color: "bg-red-100 text-red-700", borderColor: "border-red-200" },
};

const ITEMS_PER_PAGE = 10;

export default function AdminUsersPage() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter]);

    // Reset page when filter or search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filter, searchQuery]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const userType = filter !== "all" ? filter : null;
            const data = await getAllUsers(userType);
            setUsers(data || []);
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                toast.error("Failed to load users");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (userId, currentStatus) => {
        try {
            await updateUserStatus(userId, !currentStatus);
            toast.success(currentStatus ? "User suspended" : "User activated");
            fetchUsers();
            setSelectedUser(null);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update user");
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
        try {
            await deleteUser(userId);
            toast.success("User deleted");
            fetchUsers();
            setSelectedUser(null);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete user");
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.phone?.includes(searchQuery) ||
            user.companyName?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    // Pagination
    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Stats
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive).length;
    const usersByType = {
        CUSTOMER: users.filter(u => u.userType === "CUSTOMER").length,
        COMPANY_ADMIN: users.filter(u => u.userType === "COMPANY_ADMIN").length,
        DELIVERY_AGENT: users.filter(u => u.userType === "DELIVERY_AGENT").length,
    };

    if (loading && users.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-transparent"></div>
                <p className="mt-3 text-sm text-gray-600">Loading users...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage all platform users</p>
                </div>
                <button
                    onClick={fetchUsers}
                    className="btn-outline flex items-center gap-2 self-start"
                >
                    <FaSync className={loading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard label="Total Users" value={totalUsers} color="text-slate-700" bgColor="bg-slate-50" />
                <StatCard label="Active" value={activeUsers} color="text-green-600" bgColor="bg-green-50" />
                <StatCard label="Customers" value={usersByType.CUSTOMER} color="text-blue-600" bgColor="bg-blue-50" />
                <StatCard label="Companies" value={usersByType.COMPANY_ADMIN} color="text-purple-600" bgColor="bg-purple-50" />
                <StatCard label="Agents" value={usersByType.DELIVERY_AGENT} color="text-orange-600" bgColor="bg-orange-50" />
            </div>

            {/* Filters & Search */}
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-1">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email, phone, company..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {[
                            { key: "all", label: "All", icon: FaUsers },
                            { key: "CUSTOMER", label: "Customers", icon: FaUser },
                            { key: "COMPANY_ADMIN", label: "Companies", icon: FaBuilding },
                            { key: "DELIVERY_AGENT", label: "Agents", icon: FaTruck },
                        ].map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${filter === f.key
                                    ? "bg-slate-700 text-white shadow-md"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                            >
                                <f.icon className="text-xs" /> {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Users Table */}
            {filteredUsers.length === 0 ? (
                <div className="bg-white rounded-xl p-12 shadow-md border border-gray-200 text-center">
                    <FaUsers className="text-5xl text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Users Found</h3>
                    <p className="text-sm text-gray-500">
                        {searchQuery ? "No users match your search" : "No users registered yet"}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {paginatedUsers.map((user) => {
                                    const typeConfig = USER_TYPE_CONFIG[user.userType] || USER_TYPE_CONFIG.CUSTOMER;
                                    const TypeIcon = typeConfig.icon;

                                    return (
                                        <tr key={`${user.userType}-${user.id}`} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 text-white flex items-center justify-center font-bold text-sm`}>
                                                        {user.fullName?.charAt(0)?.toUpperCase() || "U"}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{user.fullName || "N/A"}</p>
                                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                                            <FaEnvelope className="text-[10px]" /> {user.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${typeConfig.color}`}>
                                                    <TypeIcon className="text-xs" /> {typeConfig.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                                    <FaPhone className="text-gray-400 text-xs" />
                                                    {user.phone || "-"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${user.isActive ? "bg-green-500" : "bg-red-500"}`}></span>
                                                    {user.isActive ? "Active" : "Suspended"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-xs text-gray-500">
                                                    {user.companyName && (
                                                        <p className="font-medium text-gray-700">{user.companyName}</p>
                                                    )}
                                                    {user.rating && (
                                                        <p className="flex items-center gap-1">
                                                            <FaStar className="text-yellow-500 text-[10px]" /> {user.rating.toFixed(1)}
                                                        </p>
                                                    )}
                                                    {user.city && <p>{user.city}</p>}
                                                    <p className="text-gray-400">
                                                        Joined {new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setSelectedUser(selectedUser === `${user.userType}-${user.userId}` ? null : `${user.userType}-${user.userId}`)}
                                                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                                                    >
                                                        <FaEllipsisV className="text-gray-400" />
                                                    </button>
                                                    {selectedUser === `${user.userType}-${user.userId}` && (
                                                        <div className="absolute right-0 top-10 bg-white shadow-xl rounded-lg border border-gray-200 py-2 w-44 z-10">
                                                            <button
                                                                onClick={() => handleToggleStatus(user.userId, user.isActive)}
                                                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 transition"
                                                            >
                                                                {user.isActive ? (
                                                                    <><FaUserTimes className="text-red-500" /> Suspend User</>
                                                                ) : (
                                                                    <><FaUserCheck className="text-green-500" /> Activate User</>
                                                                )}
                                                            </button>
                                                            {user.userType !== "SUPER_ADMIN" && (
                                                                <button
                                                                    onClick={() => handleDeleteUser(user.userId)}
                                                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition"
                                                                >
                                                                    <FaTrash /> Delete User
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <p className="text-sm text-gray-600">
                                    Showing <span className="font-medium">{startIndex + 1}</span> - <span className="font-medium">{Math.min(startIndex + ITEMS_PER_PAGE, filteredUsers.length)}</span> of <span className="font-medium">{filteredUsers.length}</span> users
                                </p>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                        className="px-2 py-1.5 rounded text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                                    >
                                        First
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                                    >
                                        <FaChevronLeft className="text-xs" /> Prev
                                    </button>

                                    <div className="flex gap-1">
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = currentPage - 2 + i;
                                            }
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`w-8 h-8 rounded text-sm font-medium transition ${currentPage === pageNum
                                                            ? "bg-slate-700 text-white"
                                                            : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                                                        }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                                    >
                                        Next <FaChevronRight className="text-xs" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage === totalPages}
                                        className="px-2 py-1.5 rounded text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                                    >
                                        Last
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, color, bgColor }) {
    return (
        <div className={`${bgColor} rounded-xl p-5 shadow-sm border border-gray-100 text-center`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
        </div>
    );
}
