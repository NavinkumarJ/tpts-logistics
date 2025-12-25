import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMyWallet, getEarningsSummary, getMyTransactions } from "../../services/walletService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import { FaWallet, FaHistory, FaArrowUp, FaArrowDown, FaInfoCircle, FaUniversity } from "react-icons/fa";

export default function CompanyWalletPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [wallet, setWallet] = useState(null);
    const [earnings, setEarnings] = useState(null);
    const [transactions, setTransactions] = useState([]);

    useEffect(() => {
        fetchWalletData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchWalletData = async () => {
        setLoading(true);
        try {
            const [walletData, earningsData, transactionsData] = await Promise.all([
                getMyWallet(),
                getEarningsSummary(),
                getMyTransactions(10)
            ]);
            setWallet(walletData);
            setEarnings(earningsData);
            setTransactions(transactionsData || []);
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                toast.error("Failed to load wallet data");
                console.error(err);
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                <p className="mt-3 text-sm text-gray-600">Loading wallet...</p>
            </div>
        );
    }

    const balance = wallet?.balance || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Wallet & Payments</h1>
                <p className="text-sm text-gray-500 mt-1">Manage your earnings and payouts</p>
            </div>

            {/* Balance Card */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-8 text-white shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-white/70 mb-1">Available Balance</p>
                        <p className="text-4xl font-bold">₹{balance.toLocaleString()}</p>
                    </div>
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                        <FaWallet className="text-3xl" />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button className="flex-1 py-3 bg-white text-indigo-600 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-100 transition">
                        <FaUniversity /> Withdraw
                    </button>
                    <button className="flex-1 py-3 bg-white/20 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-white/30 transition">
                        <FaHistory /> Statement
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <FaArrowDown className="text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Earnings</p>
                            <p className="text-xl font-bold text-gray-900">₹{(earnings?.totalEarnings || 0).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                            <FaArrowUp className="text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Withdrawn</p>
                            <p className="text-xl font-bold text-gray-900">₹{(earnings?.totalWithdrawn || 0).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <FaWallet className="text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Pending Earnings</p>
                            <p className="text-xl font-bold text-gray-900">₹{(earnings?.pendingEarnings || 0).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transactions */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FaHistory className="text-gray-400" /> Recent Transactions
                </h3>

                {transactions.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">No transactions yet</p>
                ) : (
                    <div className="space-y-3">
                        {transactions.map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === "CREDIT" ? "bg-green-100" : "bg-red-100"
                                        }`}>
                                        {tx.type === "CREDIT" ? (
                                            <FaArrowDown className="text-green-600" />
                                        ) : (
                                            <FaArrowUp className="text-red-600" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{tx.description || tx.type}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                                                day: "numeric", month: "short", year: "numeric"
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <p className={`font-bold ${tx.type === "CREDIT" ? "text-green-600" : "text-red-600"}`}>
                                    {tx.type === "CREDIT" ? "+" : "-"}₹{tx.amount?.toLocaleString()}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {transactions.length > 0 && (
                    <button className="w-full mt-4 py-3 text-sm text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg transition">
                        View All Transactions →
                    </button>
                )}
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <FaInfoCircle className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                    <p className="text-sm font-medium text-blue-900">Settlement Information</p>
                    <p className="text-sm text-blue-700 mt-1">
                        Payments are settled within 24-48 hours after successful delivery.
                        Withdrawals are processed to your registered bank account within 2-3 business days.
                    </p>
                </div>
            </div>
        </div>
    );
}
