import { useState } from "react";
import { FaWallet, FaPlus, FaHistory, FaArrowUp, FaArrowDown, FaInfoCircle } from "react-icons/fa";

export default function WalletPage() {
    const [balance] = useState(0);

    // Placeholder transactions
    const transactions = [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Wallet</h1>
                <p className="text-sm text-gray-500 mt-1">Manage your wallet balance and transactions</p>
            </div>

            {/* Balance Card */}
            <div className="bg-gradient-to-r from-primary-600 to-indigo-600 rounded-xl p-8 text-white shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-white/70 mb-1">Available Balance</p>
                        <p className="text-4xl font-bold">₹{balance.toFixed(2)}</p>
                    </div>
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                        <FaWallet className="text-3xl" />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button className="flex-1 py-3 bg-white text-primary-600 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-100 transition">
                        <FaPlus /> Add Money
                    </button>
                    <button className="flex-1 py-3 bg-white/20 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-white/30 transition">
                        <FaHistory /> History
                    </button>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <FaInfoCircle className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                    <p className="text-sm font-medium text-blue-900">Wallet Coming Soon!</p>
                    <p className="text-sm text-blue-700 mt-1">
                        We're working on adding wallet functionality. Soon you'll be able to add funds,
                        earn cashback, and pay for shipments directly from your wallet.
                    </p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200 text-center hover:shadow-lg transition cursor-pointer">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FaArrowDown className="text-green-600" />
                    </div>
                    <p className="font-medium text-gray-900">Add Money</p>
                    <p className="text-xs text-gray-500">Top up wallet</p>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200 text-center hover:shadow-lg transition cursor-pointer">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FaArrowUp className="text-orange-600" />
                    </div>
                    <p className="font-medium text-gray-900">Withdraw</p>
                    <p className="text-xs text-gray-500">To bank account</p>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200 text-center hover:shadow-lg transition cursor-pointer">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FaHistory className="text-purple-600" />
                    </div>
                    <p className="font-medium text-gray-900">Transactions</p>
                    <p className="text-xs text-gray-500">View history</p>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200 text-center hover:shadow-lg transition cursor-pointer">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FaWallet className="text-blue-600" />
                    </div>
                    <p className="font-medium text-gray-900">Offers</p>
                    <p className="text-xs text-gray-500">Cashback deals</p>
                </div>
            </div>

            {/* Transactions */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FaHistory className="text-gray-400" /> Recent Transactions
                </h3>

                {transactions.length === 0 ? (
                    <div className="text-center py-8">
                        <FaHistory className="text-4xl text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No transactions yet</p>
                        <p className="text-sm text-gray-400 mt-1">Your wallet transactions will appear here</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {transactions.map((tx, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'credit' ? 'bg-green-100' : 'bg-red-100'
                                        }`}>
                                        {tx.type === 'credit' ?
                                            <FaArrowDown className="text-green-600" /> :
                                            <FaArrowUp className="text-red-600" />
                                        }
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{tx.description}</p>
                                        <p className="text-xs text-gray-500">{tx.date}</p>
                                    </div>
                                </div>
                                <p className={`font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                    {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
