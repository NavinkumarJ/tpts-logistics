import { useState, useEffect } from "react";
import {
    sendBulkEmail,
    getEmailHistory,
    searchCompanies,
    searchCustomers
} from "../../services/superAdminService";
import {
    FaEnvelope, FaPaperPlane, FaBuilding, FaUsers, FaSearch,
    FaCheckCircle, FaTimesCircle, FaClock, FaHistory, FaTimes,
    FaGlobe, FaUserTie, FaEye, FaChevronLeft, FaChevronRight
} from "react-icons/fa";
import { HiOutlineMail, HiOutlineUserGroup } from "react-icons/hi";
import toast from "react-hot-toast";

export default function AdminMessagingPage() {
    const [recipientType, setRecipientType] = useState("COMPANY");
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
            const data = await getEmailHistory(null, 50);
            setEmailHistory(data || []);
        } catch (error) {
            console.error("Failed to load email history:", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    // Search recipients when query changes
    useEffect(() => {
        if (!sendToAll && searchQuery.length >= 2) {
            const timeout = setTimeout(() => searchRecipients(), 300);
            return () => clearTimeout(timeout);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery, recipientType, sendToAll]);

    const searchRecipients = async () => {
        try {
            setSearching(true);
            let results;
            if (recipientType === "COMPANY") {
                results = await searchCompanies(searchQuery);
            } else {
                results = await searchCustomers(searchQuery);
            }
            setSearchResults(results || []);
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
            toast.error("Select at least one recipient");
            return;
        }

        try {
            setSending(true);
            const data = {
                recipientType,
                sendToAll,
                recipientIds: sendToAll ? null : selectedRecipients.map(r => r.id),
                subject,
                message: message.replace(/\n/g, "<br>")
            };

            const result = await sendBulkEmail(data);

            toast.success(`Email sent to ${result?.recipientCount || 0} recipients!`);

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
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                        <FaCheckCircle className="w-3 h-3" /> Sent
                    </span>
                );
            case "FAILED":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                        <FaTimesCircle className="w-3 h-3" /> Failed
                    </span>
                );
            case "PARTIAL":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        <FaClock className="w-3 h-3" /> Partial
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-white/60 border border-white/20">
                        <FaClock className="w-3 h-3" /> Pending
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <HiOutlineMail className="text-white text-2xl" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">
                                Admin Messaging
                            </h1>
                            <p className="text-white/60 mt-1">Send bulk emails to companies and customers</p>
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
                                    <FaEnvelope className="text-indigo-400" /> Compose Email
                                </h2>
                            </div>

                            <div className="p-6">
                                {/* Recipient Type Selection - Beautiful Cards */}
                                <div className="mb-6">
                                    <label className="text-sm font-semibold text-white/70 mb-3 block">
                                        Select Recipient Type
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => {
                                                setRecipientType("COMPANY");
                                                setSelectedRecipients([]);
                                                setSearchResults([]);
                                                setSendToAll(true);
                                            }}
                                            className={`p-4 rounded-xl border-2 transition-all duration-300 ${recipientType === "COMPANY"
                                                ? "border-indigo-500 bg-indigo-500/20"
                                                : "border-white/20 hover:border-white/40 bg-white/5"
                                                }`}
                                        >
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${recipientType === "COMPANY"
                                                ? "bg-indigo-500 text-white"
                                                : "bg-white/10 text-white/50"
                                                }`}>
                                                <FaBuilding className="text-lg" />
                                            </div>
                                            <div className="text-left">
                                                <p className={`font-semibold ${recipientType === "COMPANY" ? "text-indigo-400" : "text-white/70"}`}>
                                                    Companies
                                                </p>
                                                <p className="text-xs text-white/50">Send to company admins</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setRecipientType("CUSTOMER");
                                                setSelectedRecipients([]);
                                                setSearchResults([]);
                                                setSendToAll(true);
                                            }}
                                            className={`p-4 rounded-xl border-2 transition-all duration-300 ${recipientType === "CUSTOMER"
                                                ? "border-purple-500 bg-purple-500/20"
                                                : "border-white/20 hover:border-white/40 bg-white/5"
                                                }`}
                                        >
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${recipientType === "CUSTOMER"
                                                ? "bg-purple-500 text-white"
                                                : "bg-white/10 text-white/50"
                                                }`}>
                                                <FaUsers className="text-lg" />
                                            </div>
                                            <div className="text-left">
                                                <p className={`font-semibold ${recipientType === "CUSTOMER" ? "text-purple-400" : "text-white/70"}`}>
                                                    Customers
                                                </p>
                                                <p className="text-xs text-white/50">Send to registered users</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Send Mode Toggle */}
                                <div className="mb-6">
                                    <label className="text-sm font-semibold text-white/70 mb-3 block">
                                        Send Mode
                                    </label>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => {
                                                setSendToAll(true);
                                                setSelectedRecipients([]);
                                                setSearchQuery("");
                                            }}
                                            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${sendToAll
                                                ? "bg-indigo-600 text-white"
                                                : "bg-white/10 text-white/60 hover:bg-white/20 border border-white/20"
                                                }`}
                                        >
                                            <FaGlobe /> Send to All {recipientType === "COMPANY" ? "Companies" : "Customers"}
                                        </button>
                                        <button
                                            onClick={() => setSendToAll(false)}
                                            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${!sendToAll
                                                ? "bg-indigo-600 text-white"
                                                : "bg-white/10 text-white/60 hover:bg-white/20 border border-white/20"
                                                }`}
                                        >
                                            <FaSearch /> Search & Select
                                        </button>
                                    </div>
                                </div>

                                {/* Recipient Search (when not sending to all) */}
                                {!sendToAll && (
                                    <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                                        <label className="text-sm font-semibold text-white/70 mb-2 block">
                                            Search {recipientType === "COMPANY" ? "Companies" : "Customers"}
                                        </label>
                                        <div className="relative">
                                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                                            <input
                                                type="text"
                                                placeholder={`Type to search ${recipientType.toLowerCase()}s by name or email...`}
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
                                                {searchResults.map((result) => (
                                                    <div
                                                        key={result.id}
                                                        className="p-3 hover:bg-white/10 cursor-pointer flex justify-between items-center border-b border-white/10 last:border-0 transition-colors"
                                                        onClick={() => addRecipient(result)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold">
                                                                {(recipientType === "COMPANY" ? result.companyName : result.fullName)?.charAt(0)?.toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-white">
                                                                    {recipientType === "COMPANY" ? result.companyName : result.fullName}
                                                                </p>
                                                                <p className="text-xs text-white/50">{result.email}</p>
                                                            </div>
                                                        </div>
                                                        <span className="text-indigo-400 text-sm">+ Add</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Selected Recipients */}
                                        {selectedRecipients.length > 0 && (
                                            <div className="mt-4">
                                                <p className="text-xs font-medium text-white/50 mb-2">
                                                    Selected Recipients ({selectedRecipients.length})
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedRecipients.map((r) => (
                                                        <div
                                                            key={r.id}
                                                            className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-full text-sm font-medium border border-indigo-500/30"
                                                        >
                                                            {recipientType === "COMPANY" ? r.companyName : r.fullName}
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
                                    <label className="text-sm font-semibold text-white/70 mb-2 block">
                                        Email Subject
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter a compelling subject line..."
                                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                    />
                                </div>

                                {/* Message */}
                                <div className="mb-6">
                                    <label className="text-sm font-semibold text-white/70 mb-2 block">
                                        Message Body
                                    </label>
                                    <textarea
                                        placeholder="Write your message here... You can use basic formatting."
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
                                Quick Stats
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                            <FaEnvelope className="text-indigo-400" />
                                        </div>
                                        <span className="font-medium text-white/70">Emails Sent</span>
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
                                        <span className="font-medium text-white/70">Successful</span>
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

                        {/* Tips Card */}
                        <div className="bg-yellow-500/20 backdrop-blur-xl rounded-2xl border border-yellow-500/30 p-6">
                            <h3 className="font-semibold text-yellow-400 mb-3">💡 Tips</h3>
                            <ul className="text-sm text-white/70 space-y-2">
                                <li>• Keep subject lines under 50 characters</li>
                                <li>• Personalize your message</li>
                                <li>• Use clear call-to-actions</li>
                                <li>• Test with a single recipient first</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Email History */}
                <div className="mt-8 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
                    <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <FaHistory /> Email History
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
                                    <FaEnvelope className="text-white/30 text-2xl" />
                                </div>
                                <p className="text-white font-medium">No emails sent yet</p>
                                <p className="text-white/50 text-sm mt-1">Your sent email history will appear here</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-white/50">Date & Time</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-white/50">Type</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-white/50">Recipients</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-white/50">Subject</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-white/50">Count</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-white/50">Status</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-white/50">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedEmails.map((email, index) => (
                                            <tr
                                                key={email.id}
                                                className={`border-b border-white/10 hover:bg-white/5 transition-colors ${index % 2 === 0 ? "bg-white/5" : ""
                                                    }`}
                                            >
                                                <td className="py-3 px-4 text-sm text-white/60">
                                                    {email.sentAt
                                                        ? new Date(email.sentAt).toLocaleString()
                                                        : new Date(email.createdAt).toLocaleString()}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${email.recipientType === "COMPANY"
                                                        ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                                                        : "bg-purple-500/20 text-purple-400 border-purple-500/30"
                                                        }`}>
                                                        {email.recipientType === "COMPANY" ? <FaBuilding className="w-3 h-3" /> : <FaUsers className="w-3 h-3" />}
                                                        {email.recipientType}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-white/70 max-w-[180px] truncate">
                                                    {email.recipientName || "Multiple Recipients"}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-white max-w-[220px] truncate font-medium">
                                                    {email.subject}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-white font-semibold text-sm">
                                                        {email.recipientCount}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">{getStatusBadge(email.status)}</td>
                                                <td className="py-3 px-4">
                                                    <button
                                                        onClick={() => setSelectedEmail(email)}
                                                        className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors border border-indigo-500/30"
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
            </div>

            {/* Email Content Modal */}
            {selectedEmail && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-white/20">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <FaEnvelope /> Email Details
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
                                <div className="bg-white/10 rounded-xl p-4 border border-white/10">
                                    <p className="text-xs text-white/50 mb-1">Sent To</p>
                                    <p className="font-semibold text-white">
                                        {selectedEmail.recipientName || "All Recipients"}
                                    </p>
                                    <p className="text-sm text-white/50">
                                        {selectedEmail.recipientCount} recipient(s)
                                    </p>
                                </div>
                                <div className="bg-white/10 rounded-xl p-4 border border-white/10">
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
                                    className="bg-white/10 rounded-xl p-4 text-white/70 leading-relaxed border border-white/10"
                                    dangerouslySetInnerHTML={{ __html: selectedEmail.message || "<em>No message content</em>" }}
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="border-t border-white/10 px-6 py-4 bg-white/5">
                            <button
                                onClick={() => setSelectedEmail(null)}
                                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
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
