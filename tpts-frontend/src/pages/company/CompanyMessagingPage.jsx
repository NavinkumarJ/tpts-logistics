import { useState, useEffect } from "react";
import apiClient from "../../utils/api";
import {
    FaEnvelope, FaPaperPlane, FaUsers, FaSearch,
    FaCheckCircle, FaTimesCircle, FaClock, FaHistory, FaTimes,
    FaGlobe, FaUserTie, FaMotorcycle, FaEye, FaChevronLeft, FaChevronRight
} from "react-icons/fa";
import { HiOutlineMail, HiOutlineUserGroup } from "react-icons/hi";
import toast from "react-hot-toast";

export default function CompanyMessagingPage() {
    const [sendToAll, setSendToAll] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [selectedRecipients, setSelectedRecipients] = useState([]);
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [emailHistory, setEmailHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [searching, setSearching] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Pagination computed values
    const totalPages = Math.ceil(emailHistory.length / itemsPerPage);
    const paginatedEmails = emailHistory.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Load email history on mount
    useEffect(() => {
        fetchEmailHistory();
    }, []);

    const fetchEmailHistory = async () => {
        try {
            setLoadingHistory(true);
            const response = await apiClient.get("/company/messaging/history");
            setEmailHistory(response.data?.data || []);
        } catch (error) {
            console.error("Failed to load email history:", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    // Search agents when query changes
    useEffect(() => {
        if (!sendToAll && searchQuery.length >= 2) {
            const timeout = setTimeout(() => searchAgents(), 300);
            return () => clearTimeout(timeout);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery, sendToAll]);

    const searchAgents = async () => {
        try {
            setSearching(true);
            const response = await apiClient.get(`/company/messaging/agents/search?q=${searchQuery}`);
            setSearchResults(response.data?.data || []);
        } catch (error) {
            console.error("Search failed:", error);
        } finally {
            setSearching(false);
        }
    };

    const handleSend = async () => {
        if (!subject.trim() || !message.trim()) {
            toast.error("Subject and message are required");
            return;
        }

        if (!sendToAll && selectedRecipients.length === 0) {
            toast.error("Select at least one agent");
            return;
        }

        try {
            setSending(true);
            const data = {
                recipientType: "AGENT",
                sendToAll,
                recipientIds: sendToAll ? null : selectedRecipients.map(r => r.id),
                subject,
                message: message.replace(/\n/g, "<br>")
            };

            const response = await apiClient.post("/company/messaging/send", data);
            const result = response.data?.data;

            toast.success(`Email sent to ${result?.recipientCount || 0} agents!`);

            // Reset form
            setSubject("");
            setMessage("");
            setSelectedRecipients([]);
            setSearchQuery("");

            // Refresh history
            fetchEmailHistory();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send email");
        } finally {
            setSending(false);
        }
    };

    const addRecipient = (recipient) => {
        if (!selectedRecipients.find(r => r.id === recipient.id)) {
            setSelectedRecipients([...selectedRecipients, recipient]);
        }
        setSearchQuery("");
        setSearchResults([]);
    };

    const removeRecipient = (id) => {
        setSelectedRecipients(selectedRecipients.filter(r => r.id !== id));
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "SENT":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                        <FaCheckCircle className="w-3 h-3" /> Sent
                    </span>
                );
            case "FAILED":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                        <FaTimesCircle className="w-3 h-3" /> Failed
                    </span>
                );
            case "PARTIAL":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                        <FaClock className="w-3 h-3" /> Partial
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/20 text-white/60">
                        <FaClock className="w-3 h-3" /> Pending
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30">
                        <HiOutlineMail className="text-indigo-400 text-2xl" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">
                            Message Agents
                        </h1>
                        <p className="text-white/60 mt-1">Communicate with your delivery team via email</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Compose Section - Left side takes 2 columns */}
                <div className="lg:col-span-2">
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
                        {/* Card Header */}
                        <div className="bg-white/5 border-b border-white/10 px-6 py-4">
                            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                <FaEnvelope className="text-indigo-400" /> Compose Email to Agents
                            </h2>
                        </div>

                        <div className="p-6">
                            {/* Send Mode Toggle */}
                            <div className="mb-6">
                                <label className="text-sm font-semibold text-white mb-3 block">
                                    Select Recipients
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => {
                                            setSendToAll(true);
                                            setSelectedRecipients([]);
                                            setSearchQuery("");
                                        }}
                                        className={`p-4 rounded-xl border-2 transition-all duration-300 ${sendToAll
                                            ? "border-indigo-500 bg-indigo-500/20"
                                            : "border-white/20 hover:border-white/40 hover:bg-white/5"
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${sendToAll
                                            ? "bg-indigo-500/30 text-indigo-400"
                                            : "bg-white/10 text-white/60"
                                            }`}>
                                            <FaUsers className="text-lg" />
                                        </div>
                                        <div className="text-left">
                                            <p className={`font-semibold ${sendToAll ? "text-indigo-400" : "text-white"}`}>
                                                All Agents
                                            </p>
                                            <p className="text-xs text-white/50">Send to entire team</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setSendToAll(false)}
                                        className={`p-4 rounded-xl border-2 transition-all duration-300 ${!sendToAll
                                            ? "border-indigo-500 bg-indigo-500/20"
                                            : "border-white/20 hover:border-white/40 hover:bg-white/5"
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${!sendToAll
                                            ? "bg-indigo-500/30 text-indigo-400"
                                            : "bg-white/10 text-white/60"
                                            }`}>
                                            <FaUserTie className="text-lg" />
                                        </div>
                                        <div className="text-left">
                                            <p className={`font-semibold ${!sendToAll ? "text-indigo-400" : "text-white"}`}>
                                                Specific Agents
                                            </p>
                                            <p className="text-xs text-white/50">Search & select agents</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Agent Search (when not sending to all) */}
                            {!sendToAll && (
                                <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                                    <label className="text-sm font-semibold text-white mb-2 block">
                                        Search Agents
                                    </label>
                                    <div className="relative">
                                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                                        <input
                                            type="text"
                                            placeholder="Type to search agents by name or email..."
                                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                        {searching && (
                                            <span className="loading loading-spinner loading-sm absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400"></span>
                                        )}
                                    </div>

                                    {/* Search Results Dropdown */}
                                    {searchResults.length > 0 && (
                                        <div className="mt-3 bg-slate-800 rounded-xl border border-white/20 shadow-lg max-h-48 overflow-y-auto">
                                            {searchResults.map((agent) => (
                                                <div
                                                    key={agent.id}
                                                    className="p-3 hover:bg-white/10 cursor-pointer flex justify-between items-center border-b border-white/10 last:border-0 transition-colors"
                                                    onClick={() => addRecipient(agent)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold">
                                                            {agent.fullName?.charAt(0)?.toUpperCase() || "A"}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-white">
                                                                {agent.fullName}
                                                            </p>
                                                            <p className="text-xs text-white/50 flex items-center gap-1">
                                                                <FaMotorcycle className="w-3 h-3" />
                                                                {agent.vehicleType || "Agent"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className="text-indigo-400 text-sm">+ Add</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* No results message */}
                                    {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                                        <div className="mt-3 text-center py-4 text-white/50 text-sm">
                                            No agents found matching "{searchQuery}"
                                        </div>
                                    )}

                                    {/* Selected Agents */}
                                    {selectedRecipients.length > 0 && (
                                        <div className="mt-4">
                                            <p className="text-xs font-medium text-white/50 mb-2">
                                                Selected Agents ({selectedRecipients.length})
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedRecipients.map((r) => (
                                                    <div
                                                        key={r.id}
                                                        className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-full text-sm font-medium border border-indigo-500/30"
                                                    >
                                                        {r.fullName}
                                                        <button
                                                            onClick={() => removeRecipient(r.id)}
                                                            className="hover:bg-indigo-500/30 rounded-full p-0.5 transition-colors"
                                                        >
                                                            <FaTimes className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Subject */}
                            <div className="mb-5">
                                <label className="text-sm font-semibold text-white mb-2 block">
                                    Email Subject
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter a clear subject line..."
                                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                />
                            </div>

                            {/* Message */}
                            <div className="mb-6">
                                <label className="text-sm font-semibold text-white mb-2 block">
                                    Message Body
                                </label>
                                <textarea
                                    placeholder="Write your message to the agents..."
                                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all h-40 resize-none"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                            </div>

                            {/* Send Button */}
                            <button
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
                                onClick={handleSend}
                                disabled={sending || !subject.trim() || !message.trim() || (!sendToAll && selectedRecipients.length === 0)}
                            >
                                {sending ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm"></span>
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <FaPaperPlane /> Send Email
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick Stats - Right side */}
                <div className="space-y-6">
                    {/* Stats Cards */}
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                            <HiOutlineUserGroup className="text-indigo-400" />
                            Email Stats
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                        <FaEnvelope className="text-indigo-400" />
                                    </div>
                                    <span className="font-medium text-white/70">Total Sent</span>
                                </div>
                                <span className="text-2xl font-bold text-white">
                                    {emailHistory.length}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                                        <FaCheckCircle className="text-green-400" />
                                    </div>
                                    <span className="font-medium text-white/70">Delivered</span>
                                </div>
                                <span className="text-2xl font-bold text-green-400">
                                    {emailHistory.filter(e => e.status === "SENT").length}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                                        <FaTimesCircle className="text-red-400" />
                                    </div>
                                    <span className="font-medium text-white/70">Failed</span>
                                </div>
                                <span className="text-2xl font-bold text-red-400">
                                    {emailHistory.filter(e => e.status === "FAILED").length}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions Card */}
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                            <FaMotorcycle className="text-indigo-400" /> Delivery Team
                        </h3>
                        <p className="text-sm text-white/60 mb-4">
                            Keep your agents informed about schedules, updates, and important announcements.
                        </p>
                        <div className="text-xs text-white/50 space-y-1">
                            <p>💡 Regular updates improve team coordination</p>
                            <p>📱 Agents receive emails on their registered accounts</p>
                        </div>
                    </div>

                    {/* Tips Card */}
                    <div className="bg-yellow-500/20 rounded-2xl border border-yellow-500/30 p-6">
                        <h3 className="font-semibold text-yellow-400 mb-3">📝 Communication Tips</h3>
                        <ul className="text-sm text-white/70 space-y-2">
                            <li>• Keep messages clear and actionable</li>
                            <li>• Include relevant dates and times</li>
                            <li>• Mention specific routes if applicable</li>
                            <li>• Add contact info for queries</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Email History */}
            <div className="mt-8 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
                <div className="bg-white/5 border-b border-white/10 px-6 py-4">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <FaHistory className="text-indigo-400" /> Sent Messages History
                    </h2>
                </div>

                <div className="p-6">
                    {loadingHistory ? (
                        <div className="flex justify-center py-12">
                            <span className="loading loading-spinner loading-lg text-indigo-400"></span>
                        </div>
                    ) : emailHistory.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FaEnvelope className="text-white/40 text-2xl" />
                            </div>
                            <p className="text-white font-medium">No messages sent yet</p>
                            <p className="text-white/50 text-sm mt-1">Your sent email history will appear here</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-white/60">Date & Time</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-white/60">Recipients</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-white/60">Subject</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-white/60">Count</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-white/60">Status</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-white/60">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedEmails.map((email, index) => (
                                        <tr
                                            key={email.id}
                                            className={`border-b border-white/5 hover:bg-white/5 transition-colors ${index % 2 === 0 ? "bg-white/[0.02]" : ""
                                                }`}
                                        >
                                            <td className="py-3 px-4 text-sm text-white/70">
                                                {email.sentAt
                                                    ? new Date(email.sentAt).toLocaleString()
                                                    : new Date(email.createdAt).toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                                        <FaUserTie className="text-indigo-400 text-sm" />
                                                    </div>
                                                    <span className="text-sm text-white max-w-[150px] truncate">
                                                        {email.recipientName || "All Agents"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-white max-w-[220px] truncate font-medium">
                                                {email.subject}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 font-semibold text-sm">
                                                    {email.recipientCount}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">{getStatusBadge(email.status)}</td>
                                            <td className="py-3 px-4">
                                                <button
                                                    onClick={() => setSelectedEmail(email)}
                                                    className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors"
                                                    title="View Email"
                                                >
                                                    <FaEye className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {emailHistory.length > itemsPerPage && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                            <p className="text-sm text-white/50">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, emailHistory.length)} of {emailHistory.length} emails
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-white/20 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <FaChevronLeft className="w-4 h-4 text-white/60" />
                                </button>
                                <div className="flex items-center gap-1">
                                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
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
                                                className={`w-10 h-10 rounded-lg font-medium transition-all ${currentPage === pageNum
                                                    ? "bg-indigo-600 text-white"
                                                    : "border border-white/20 text-white/60 hover:bg-white/10"
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-white/20 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <FaChevronRight className="w-4 h-4 text-white/60" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Email Content Modal */}
            {selectedEmail && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-white/20">
                        {/* Modal Header */}
                        <div className="bg-white/5 border-b border-white/10 px-6 py-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <FaEnvelope className="text-indigo-400" /> Email Details
                            </h3>
                            <button
                                onClick={() => setSelectedEmail(null)}
                                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <FaTimes className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {/* Email Meta Info */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                    <p className="text-xs text-white/50 mb-1">Sent To</p>
                                    <p className="font-semibold text-white">
                                        {selectedEmail.recipientName || "All Agents"}
                                    </p>
                                    <p className="text-sm text-white/60">
                                        {selectedEmail.recipientCount} agent(s)
                                    </p>
                                </div>
                                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                    <p className="text-xs text-white/50 mb-1">Sent At</p>
                                    <p className="font-semibold text-white">
                                        {selectedEmail.sentAt
                                            ? new Date(selectedEmail.sentAt).toLocaleString()
                                            : new Date(selectedEmail.createdAt).toLocaleString()}
                                    </p>
                                    <div className="mt-1">{getStatusBadge(selectedEmail.status)}</div>
                                </div>
                            </div>

                            {/* Subject */}
                            <div className="mb-4">
                                <p className="text-xs text-white/50 mb-1">Subject</p>
                                <p className="text-lg font-semibold text-white bg-indigo-500/20 px-4 py-3 rounded-xl border border-indigo-500/30">
                                    {selectedEmail.subject}
                                </p>
                            </div>

                            {/* Message Body */}
                            <div>
                                <p className="text-xs text-white/50 mb-1">Message</p>
                                <div
                                    className="bg-white/5 rounded-xl p-4 text-white/80 leading-relaxed prose prose-sm prose-invert max-w-none border border-white/10"
                                    dangerouslySetInnerHTML={{ __html: selectedEmail.message || "<em>No message content</em>" }}
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="border-t border-white/10 px-6 py-4 bg-white/5">
                            <button
                                onClick={() => setSelectedEmail(null)}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
