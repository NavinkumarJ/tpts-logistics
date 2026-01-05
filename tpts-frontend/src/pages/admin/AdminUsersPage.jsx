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
import ConfirmModal from "../../components/common/ConfirmModal";
import ReasonInputModal from "../../components/common/ReasonInputModal";

const USER_TYPE_CONFIG = {
    CUSTOMER: { label: "Customer", icon: FaUser, color: "bg-blue-500/20 text-blue-400 border-blue-500/30", borderColor: "border-blue-500" },
    COMPANY_ADMIN: { label: "Company", icon: FaBuilding, color: "bg-purple-500/20 text-purple-400 border-purple-500/30", borderColor: "border-purple-500" },
    DELIVERY_AGENT: { label: "Agent", icon: FaTruck, color: "bg-orange-500/20 text-orange-400 border-orange-500/30", borderColor: "border-orange-500" },
    SUPER_ADMIN: { label: "Admin", icon: FaUsers, color: "bg-red-500/20 text-red-400 border-red-500/30", borderColor: "border-red-500" },
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
    const [processing, setProcessing] = useState(null);

    // Modal state for confirm/reason dialogs
    const [modalConfig, setModalConfig] = useState({
        type: null, // 'suspend', 'activate', 'delete'
        userId: null,
        userName: null,
        userEmail: null
    });

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

    // Open suspend modal
    const handleSuspend = (userId, userName, userEmail) => {
        setModalConfig({ type: 'suspend', userId, userName, userEmail });
        setSelectedUser(null);
    };

    // Confirm suspend with reason
    const confirmSuspend = async (reason) => {
        const { userId } = modalConfig;
        setModalConfig({ type: null, userId: null, userName: null, userEmail: null });
        setProcessing(userId);
        try {
            await updateUserStatus(userId, false, reason);
            toast.success("User suspended");
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to suspend user");
        } finally {
            setProcessing(null);
        }
    };

    // Open activate modal
    const handleActivate = (userId, userName, userEmail) => {
        setModalConfig({ type: 'activate', userId, userName, userEmail });
        setSelectedUser(null);
    };

    // Confirm activate
    const confirmActivate = async () => {
        const { userId } = modalConfig;
        setModalConfig({ type: null, userId: null, userName: null, userEmail: null });
        setProcessing(userId);
        try {
            await updateUserStatus(userId, true);
            toast.success("User activated");
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to activate user");
        } finally {
            setProcessing(null);
        }
    };

    // Open delete modal
    const handleDelete = (userId, userName) => {
        setModalConfig({ type: 'delete', userId, userName, userEmail: null });
        setSelectedUser(null);
    };

    // Confirm delete
    const confirmDelete = async () => {
        const { userId } = modalConfig;
        setModalConfig({ type: null, userId: null, userName: null, userEmail: null });
        setProcessing(userId);
        try {
            await deleteUser(userId);
            toast.success("User deleted");
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete user");
        } finally {
            setProcessing(null);
        }
    };

    const closeModal = () => {
        setModalConfig({ type: null, userId: null, userName: null, userEmail: null });
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
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent"></div>
                <p className="mt-3 text-sm text-white/60">Loading users...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">User Management</h1>
                    <p className="text-sm text-white/60 mt-1">Manage all platform users</p>
                </div>
                <button
                    onClick={fetchUsers}
                    className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition flex items-center gap-2 self-start"
                >
                    <FaSync className={loading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard label="Total Users" value={totalUsers} color="text-white" bgColor="bg-white/10" />
                <StatCard label="Active" value={activeUsers} color="text-green-400" bgColor="bg-green-500/20" />
                <StatCard label="Customers" value={usersByType.CUSTOMER} color="text-blue-400" bgColor="bg-blue-500/20" />
                <StatCard label="Companies" value={usersByType.COMPANY_ADMIN} color="text-purple-400" bgColor="bg-purple-500/20" />
                <StatCard label="Agents" value={usersByType.DELIVERY_AGENT} color="text-orange-400" bgColor="bg-orange-500/20" />
            </div>

            {/* Filters & Search */}
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-1">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                            type="text"
                            placeholder="Search by name, email, phone, company..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-white placeholder-white/40"
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
                                    ? "bg-indigo-600 text-white shadow-md"
                                    : "bg-white/10 text-white/70 hover:bg-white/20 border border-white/20"
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
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-12 border border-white/20 text-center">
                    <FaUsers className="text-5xl text-white/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No Users Found</h3>
                    <p className="text-sm text-white/50">
                        {searchQuery ? "No users match your search" : "No users registered yet"}
                    </p>
                </div>
            ) : (
                <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5 border-b border-white/10">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">Details</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-white/50 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {paginatedUsers.map((user) => {
                                    const typeConfig = USER_TYPE_CONFIG[user.userType] || USER_TYPE_CONFIG.CUSTOMER;
                                    const TypeIcon = typeConfig.icon;

                                    return (
                                        <tr key={`${user.userType}-${user.id}`} className="hover:bg-white/5 transition">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 text-white flex items-center justify-center font-bold text-sm`}>
                                                        {user.fullName?.charAt(0)?.toUpperCase() || "U"}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-white">{user.fullName || "N/A"}</p>
                                                        <p className="text-xs text-white/50 flex items-center gap-1">
                                                            <FaEnvelope className="text-[10px]" /> {user.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${typeConfig.color}`}>
                                                    <TypeIcon className="text-xs" /> {typeConfig.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1 text-sm text-white/60">
                                                    <FaPhone className="text-white/40 text-xs" />
                                                    {user.phone || "-"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${user.isActive ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${user.isActive ? "bg-green-400" : "bg-red-400"}`}></span>
                                                    {user.isActive ? "Active" : "Suspended"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-xs text-white/50">
                                                    {user.companyName && (
                                                        <p className="font-medium text-white/70">{user.companyName}</p>
                                                    )}
                                                    {user.rating && (
                                                        <p className="flex items-center gap-1">
                                                            <FaStar className="text-yellow-400 text-[10px]" /> {user.rating.toFixed(1)}
                                                        </p>
                                                    )}
                                                    {user.city && <p>{user.city}</p>}
                                                    <p className="text-white/40">
                                                        Joined {new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setSelectedUser(selectedUser === `${user.userType}-${user.userId}` ? null : `${user.userType}-${user.userId}`)}
                                                        className="p-2 hover:bg-white/10 rounded-lg transition"
                                                    >
                                                        <FaEllipsisV className="text-white/40" />
                                                    </button>
                                                    {selectedUser === `${user.userType}-${user.userId}` && (
                                                        <div className="absolute right-0 top-10 bg-slate-800 shadow-xl rounded-lg border border-white/20 py-2 w-44 z-10">
                                                            {user.isActive ? (
                                                                <button
                                                                    onClick={() => handleSuspend(user.userId, user.fullName, user.email)}
                                                                    disabled={processing === user.userId}
                                                                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2 transition disabled:opacity-50"
                                                                >
                                                                    <FaUserTimes className="text-red-400" /> Suspend User
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleActivate(user.userId, user.fullName, user.email)}
                                                                    disabled={processing === user.userId}
                                                                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2 transition disabled:opacity-50"
                                                                >
                                                                    <FaUserCheck className="text-green-400" /> Activate User
                                                                </button>
                                                            )}
                                                            {user.userType !== "SUPER_ADMIN" && (
                                                                <button
                                                                    onClick={() => handleDelete(user.userId, user.fullName)}
                                                                    disabled={processing === user.userId}
                                                                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition disabled:opacity-50"
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
                        <div className="px-6 py-4 border-t border-white/10 bg-white/5">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <p className="text-sm text-white/60">
                                    Showing <span className="font-medium text-white">{startIndex + 1}</span> - <span className="font-medium text-white">{Math.min(startIndex + ITEMS_PER_PAGE, filteredUsers.length)}</span> of <span className="font-medium text-white">{filteredUsers.length}</span> users
                                </p>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                        className="px-2 py-1.5 rounded text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed bg-white/10 border border-white/20 text-white hover:bg-white/20"
                                    >
                                        First
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed bg-white/10 border border-white/20 text-white hover:bg-white/20"
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
                                                        ? "bg-indigo-600 text-white"
                                                        : "bg-white/10 border border-white/20 text-white hover:bg-white/20"
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
                                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed bg-white/10 border border-white/20 text-white hover:bg-white/20"
                                    >
                                        Next <FaChevronRight className="text-xs" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage === totalPages}
                                        className="px-2 py-1.5 rounded text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed bg-white/10 border border-white/20 text-white hover:bg-white/20"
                                    >
                                        Last
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Suspend User Modal - with reason */}
            <ReasonInputModal
                isOpen={modalConfig.type === 'suspend'}
                title="Suspend User"
                subtitle={`Are you sure you want to suspend ${modalConfig.userName || 'this user'}? They will not be able to log in until reactivated.`}
                placeholder="Enter reason for suspension (will be sent via email)"
                submitText="Suspend User"
                variant="danger"
                onSubmit={confirmSuspend}
                onClose={closeModal}
            />

            {/* Activate User Modal */}
            <ConfirmModal
                isOpen={modalConfig.type === 'activate'}
                title="Activate User"
                message={`Are you sure you want to activate ${modalConfig.userName || 'this user'}? They will be able to log in again.`}
                confirmText="Activate User"
                confirmColor="green"
                onConfirm={confirmActivate}
                onClose={closeModal}
            />

            {/* Delete User Modal */}
            <ConfirmModal
                isOpen={modalConfig.type === 'delete'}
                title="Delete User"
                message={`Are you sure you want to delete ${modalConfig.userName || 'this user'}? This action cannot be undone.`}
                confirmText="Delete User"
                confirmColor="red"
                onConfirm={confirmDelete}
                onClose={closeModal}
            />
        </div>
    );
}

function StatCard({ label, value, color, bgColor }) {
    return (
        <div className={`${bgColor} backdrop-blur-xl rounded-xl p-5 border border-white/20 text-center`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-white/60 mt-1">{label}</p>
        </div>
    );
}
