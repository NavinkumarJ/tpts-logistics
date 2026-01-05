import { useState } from 'react';
import { FaComments, FaChevronDown, FaChevronUp, FaUser, FaBox } from 'react-icons/fa';
import ChatPanel from './ChatPanel';

/**
 * Group Chat Panel for agents to chat with multiple customers
 * Shows a list of customers in the group and allows selecting one to chat
 * 
 * @param {Object} props
 * @param {number} props.groupId - Group Shipment ID
 * @param {Array} props.parcels - Array of parcels with customer info
 * @param {boolean} props.isMinimized - Start minimized
 * @param {boolean} props.readOnly - If true, show chat but disable sending messages
 */
export default function GroupChatPanel({ groupId, parcels = [], isMinimized = true, readOnly = false }) {
    const [isOpen, setIsOpen] = useState(!isMinimized);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showCustomerList, setShowCustomerList] = useState(true);

    // Get unique customers from parcels - show SENDER name (account holder who booked)
    // Also include receiver name for delivery context
    const customers = parcels.map(p => ({
        parcelId: p.id,
        // Sender/customer name (account holder) - who we message
        name: p.pickupName || p.senderName || p.customerName || 'Customer',
        // Receiver/delivery name - who receives the package (for agent context on delivery)
        receiverName: p.deliveryName || p.receiverName || null,
        trackingNumber: p.trackingNumber,
        status: p.status,
        deliveryCity: p.deliveryCity || p.city,
    })).filter((c, i, arr) => arr.findIndex(x => x.parcelId === c.parcelId) === i);

    const handleSelectCustomer = (customer) => {
        setSelectedCustomer(customer);
        setShowCustomerList(false);
    };

    const handleBackToList = () => {
        setSelectedCustomer(null);
        setShowCustomerList(true);
    };

    if (customers.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[1000]">
            {/* Minimized View */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 
                               text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl 
                               transition-all duration-300 hover:scale-105"
                >
                    <FaComments className="text-xl" />
                    <span className="font-medium">Chat with Customers ({customers.length})</span>
                </button>
            )}

            {/* Expanded Panel */}
            {isOpen && (
                <div className="w-80 sm:w-96 bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 
                                flex flex-col overflow-hidden animate-slideUp">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 
                                    flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FaComments className="text-lg" />
                            <div>
                                <p className="font-semibold text-sm">
                                    {selectedCustomer ? `Chat with ${selectedCustomer.name}` : 'Group Customers'}
                                </p>
                                <p className="text-xs text-indigo-200">
                                    {selectedCustomer ? selectedCustomer.trackingNumber : `${customers.length} customers`}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {selectedCustomer && (
                                <button
                                    onClick={handleBackToList}
                                    className="p-1.5 hover:bg-white/20 rounded-full transition text-xs"
                                >
                                    ← Back
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 hover:bg-white/20 rounded-full transition"
                            >
                                <FaChevronDown className="text-lg" />
                            </button>
                        </div>
                    </div>

                    {/* Customer List or Chat */}
                    {showCustomerList ? (
                        <div className="max-h-80 overflow-y-auto p-3 space-y-2 bg-slate-900/50">
                            <p className="text-xs text-white/60 mb-2 px-1">
                                Select a customer to start chatting:
                            </p>
                            {customers.map((customer) => (
                                <button
                                    key={customer.parcelId}
                                    onClick={() => handleSelectCustomer(customer)}
                                    className="w-full p-3 bg-white/10 rounded-xl border border-white/20 
                                             hover:border-indigo-400/50 hover:bg-white/15 transition-all
                                             text-left flex items-center gap-3 group"
                                >
                                    <div className="w-10 h-10 bg-indigo-500/30 rounded-full flex items-center justify-center
                                                  group-hover:bg-indigo-500/40 transition">
                                        <FaUser className="text-indigo-300" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-white truncate">
                                            {customer.name}
                                            {/* Show receiver name if different from sender */}
                                            {customer.receiverName && customer.receiverName !== customer.name && (
                                                <span className="text-white/50 font-normal"> → {customer.receiverName}</span>
                                            )}
                                        </p>
                                        <p className="text-xs text-white/60 truncate">
                                            {customer.trackingNumber} • {customer.deliveryCity}
                                        </p>
                                    </div>
                                    <div className={`px-2 py-0.5 rounded text-xs font-medium
                                        ${customer.status === 'DELIVERED' ? 'bg-green-500/30 text-green-300' :
                                            customer.status === 'OUT_FOR_DELIVERY' ? 'bg-blue-500/30 text-blue-300' :
                                                'bg-white/20 text-white/70'}`}>
                                        {customer.status?.replace(/_/g, ' ') || 'Pending'}
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : selectedCustomer && (
                        <div className="flex-1">
                            {/* Embedded chat for selected customer */}
                            <EmbeddedChat
                                groupId={groupId}
                                receiverParcelId={selectedCustomer.parcelId}
                                receiverName={selectedCustomer.name}
                                readOnly={readOnly}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Custom animation */}
            <style>{`
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-slideUp {
                    animation: slideUp 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}

/**
 * Embedded chat component that doesn't use the floating position
 */
function EmbeddedChat({ groupId, receiverParcelId, receiverName, readOnly = false }) {
    return (
        <div className="relative">
            {/* Use ChatPanel but embedded */}
            <ChatPanel
                type="group"
                id={groupId}
                receiverParcelId={receiverParcelId}
                receiverName={receiverName}
                isAgent={true}
                isMinimized={false}
                embedded={true}
                readOnly={readOnly}
            />
        </div>
    );
}
