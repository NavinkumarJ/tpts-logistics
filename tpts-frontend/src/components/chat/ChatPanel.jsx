import { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaSpinner, FaComments, FaTimes, FaChevronDown } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import {
    getParcelMessages,
    sendParcelMessage,
    markParcelMessagesAsRead,
    getGroupMessages,
    sendGroupMessage,
    markGroupMessagesAsRead
} from '../../services/chatService';

/**
 * Reusable Chat Panel component for customer-agent messaging
 * 
 * @param {Object} props
 * @param {'parcel' | 'group'} props.type - Type of chat (parcel or group)
 * @param {number} props.id - Parcel ID or Group Shipment ID
 * @param {number} [props.receiverParcelId] - For agent: specific parcel/customer to message
 * @param {string} [props.receiverName] - Name of the chat partner
 * @param {boolean} [props.isAgent] - Whether current user is the agent
 * @param {boolean} [props.isMinimized] - Start minimized
 * @param {boolean} [props.embedded] - If true, renders inline without fixed positioning
 * @param {boolean} [props.readOnly] - If true, show chat but disable sending messages
 */
export default function ChatPanel({
    type,
    id,
    receiverParcelId,
    receiverName = 'Delivery Agent',
    isAgent = false,
    isMinimized: initialMinimized = true,
    embedded = false,
    readOnly = false
}) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [isOpen, setIsOpen] = useState(!initialMinimized);
    const [unreadCount, setUnreadCount] = useState(0);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Fetch messages
    const fetchMessages = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = type === 'parcel'
                ? await getParcelMessages(id)
                : await getGroupMessages(id, receiverParcelId); // Pass parcelId for per-customer filtering
            setMessages(data || []);

            // Mark as read when opened
            if (isOpen) {
                markAsRead();
            }
        } catch (err) {
            console.error('Failed to load messages:', err);
        } finally {
            setLoading(false);
        }
    };

    // Mark messages as read
    const markAsRead = async () => {
        try {
            if (type === 'parcel') {
                await markParcelMessagesAsRead(id);
            } else {
                await markGroupMessagesAsRead(id);
            }
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    };

    // Send message
    const handleSend = async (e) => {
        e?.preventDefault();
        if (!newMessage.trim() || sending) return;

        setSending(true);
        try {
            let sentMessage;
            if (type === 'parcel') {
                sentMessage = await sendParcelMessage(id, newMessage.trim());
            } else {
                sentMessage = await sendGroupMessage(id, newMessage.trim(), receiverParcelId);
            }
            setMessages(prev => [...prev, sentMessage]);
            setNewMessage('');
            scrollToBottom();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    // Initial load
    useEffect(() => {
        if (id) {
            fetchMessages();
        }
        // Poll for new messages every 10 seconds
        const interval = setInterval(fetchMessages, 10000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, type, receiverParcelId]);

    // Scroll when messages change
    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    // Mark as read when opened
    useEffect(() => {
        if (isOpen && messages.length > 0) {
            markAsRead();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Calculate unread
    useEffect(() => {
        const unread = messages.filter(m => !m.isMine && !m.isRead).length;
        setUnreadCount(unread);
    }, [messages]);

    // Format timestamp
    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Group messages by date
    const groupedMessages = messages.reduce((groups, msg) => {
        const date = formatDate(msg.createdAt);
        if (!groups[date]) groups[date] = [];
        groups[date].push(msg);
        return groups;
    }, {});

    if (!id) return null;

    // Embedded mode - renders inline without fixed positioning
    if (embedded) {
        return (
            <div className="bg-slate-800/95 flex flex-col h-80">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-3 bg-slate-900/50 space-y-3">
                    {loading && messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <FaSpinner className="animate-spin text-indigo-400 text-2xl" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-white/60">
                            <FaComments className="text-4xl mb-2 text-white/30" />
                            <p className="text-sm">No messages yet</p>
                            <p className="text-xs">Send a message to start chatting</p>
                        </div>
                    ) : (
                        Object.entries(groupedMessages).map(([date, msgs]) => (
                            <div key={date}>
                                <div className="flex items-center justify-center my-2">
                                    <span className="bg-white/10 text-white/60 text-xs px-3 py-1 rounded-full">
                                        {date}
                                    </span>
                                </div>
                                {msgs.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'} mb-2`}
                                    >
                                        <div
                                            className={`max-w-[75%] px-3 py-2 rounded-2xl ${msg.isMine
                                                ? 'bg-indigo-600 text-white rounded-br-md'
                                                : 'bg-white/15 text-white border border-white/20 rounded-bl-md'
                                                }`}
                                        >
                                            {!msg.isMine && (
                                                <p className="text-xs font-medium text-indigo-300 mb-0.5">
                                                    {msg.senderName}
                                                </p>
                                            )}
                                            <p className="text-sm whitespace-pre-wrap break-words">
                                                {msg.message}
                                            </p>
                                            <p className={`text-[10px] mt-1 ${msg.isMine ? 'text-indigo-200' : 'text-white/50'}`}>
                                                {formatTime(msg.createdAt)}
                                                {msg.isMine && msg.isRead && ' ✓✓'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area - or Read-Only notice */}
                {readOnly ? (
                    <div className="p-3 border-t border-white/10 bg-white/5 text-center">
                        <p className="text-sm text-white/50">💬 Chat history (read-only)</p>
                    </div>
                ) : (
                    <form onSubmit={handleSend} className="p-3 border-t border-white/10 bg-white/5">
                        <div className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-full 
                                         focus:outline-none focus:ring-2 focus:ring-indigo-500 
                                         focus:border-transparent text-sm text-white placeholder-white/50"
                                disabled={sending}
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim() || sending}
                                className="p-2.5 bg-indigo-600 text-white rounded-full 
                                         hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                                         transition-colors"
                            >
                                {sending ? (
                                    <FaSpinner className="animate-spin" />
                                ) : (
                                    <FaPaperPlane className="text-sm" />
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-50">
            {/* Minimized View */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 
                               text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl 
                               transition-all duration-300 hover:scale-105"
                >
                    <FaComments className="text-xl" />
                    <span className="font-medium">Chat with {isAgent ? 'Customer' : receiverName}</span>
                    {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                            {unreadCount}
                        </span>
                    )}
                </button>
            )}

            {/* Expanded Chat Panel */}
            {isOpen && (
                <div className="w-80 sm:w-96 max-h-[28rem] bg-white rounded-2xl shadow-2xl border border-gray-200 
                                flex flex-col overflow-hidden animate-slideUp">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 
                                    flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FaComments className="text-lg" />
                            <div>
                                <p className="font-semibold text-sm">
                                    {isAgent ? 'Chat with Customer' : `Chat with ${receiverName}`}
                                </p>
                                <p className="text-xs text-indigo-200">
                                    {type === 'parcel' ? 'Order Chat' : 'Group Delivery Chat'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 hover:bg-white/20 rounded-full transition"
                        >
                            <FaChevronDown className="text-lg" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 h-72 overflow-y-auto p-3 bg-gray-50 space-y-3">
                        {loading && messages.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <FaSpinner className="animate-spin text-indigo-600 text-2xl" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <FaComments className="text-4xl mb-2 text-gray-300" />
                                <p className="text-sm">No messages yet</p>
                                <p className="text-xs">Send a message to start chatting</p>
                            </div>
                        ) : (
                            Object.entries(groupedMessages).map(([date, msgs]) => (
                                <div key={date}>
                                    {/* Date Separator */}
                                    <div className="flex items-center justify-center my-2">
                                        <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                                            {date}
                                        </span>
                                    </div>
                                    {/* Messages */}
                                    {msgs.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'} mb-2`}
                                        >
                                            <div
                                                className={`max-w-[75%] px-3 py-2 rounded-2xl ${msg.isMine
                                                    ? 'bg-indigo-600 text-white rounded-br-md'
                                                    : 'bg-white text-gray-800 border rounded-bl-md shadow-sm'
                                                    }`}
                                            >
                                                {!msg.isMine && (
                                                    <p className="text-xs font-medium text-indigo-600 mb-0.5">
                                                        {msg.senderName}
                                                    </p>
                                                )}
                                                <p className="text-sm whitespace-pre-wrap break-words">
                                                    {msg.message}
                                                </p>
                                                <p className={`text-[10px] mt-1 ${msg.isMine ? 'text-indigo-200' : 'text-gray-400'
                                                    }`}>
                                                    {formatTime(msg.createdAt)}
                                                    {msg.isMine && msg.isRead && ' ✓✓'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="p-3 border-t bg-white">
                        <div className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-full 
                                         focus:outline-none focus:ring-2 focus:ring-indigo-500 
                                         focus:border-transparent text-sm"
                                disabled={sending}
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim() || sending}
                                className="p-2.5 bg-indigo-600 text-white rounded-full 
                                         hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                                         transition-colors"
                            >
                                {sending ? (
                                    <FaSpinner className="animate-spin" />
                                ) : (
                                    <FaPaperPlane className="text-sm" />
                                )}
                            </button>
                        </div>
                    </form>
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
