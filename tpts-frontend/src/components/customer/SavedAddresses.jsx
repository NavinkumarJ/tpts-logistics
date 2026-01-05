import { useState } from "react";
import { Link } from "react-router-dom";
import { FaMapMarkerAlt, FaPlus, FaEdit, FaTrash, FaStar, FaHome, FaBuilding } from "react-icons/fa";
import AddressModal from "./AddressModal";
import { deleteAddress, setDefaultAddress } from "../../services/customerService";
import toast from "react-hot-toast";

export default function SavedAddresses({ addresses, customerId, onRefresh, limit = 2 }) {
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const handleEdit = (address) => {
    setEditingAddress(address);
    setShowModal(true);
  };

  const handleDelete = async (addressId) => {
    if (!confirm("Are you sure you want to delete this address?")) return;

    setDeleting(addressId);
    try {
      await deleteAddress(customerId, addressId);
      toast.success("Address deleted successfully");
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete address");
    } finally {
      setDeleting(null);
    }
  };

  const handleSetDefault = async (addressId) => {
    try {
      await setDefaultAddress(customerId, addressId);
      toast.success("Default address updated");
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to set default address");
    }
  };

  const getAddressIcon = (label) => {
    const lowerLabel = label?.toLowerCase() || "";
    if (lowerLabel.includes("home")) return <FaHome className="text-emerald-400" />;
    if (lowerLabel.includes("office")) return <FaBuilding className="text-blue-400" />;
    return <FaMapMarkerAlt className="text-orange-400" />;
  };

  // Limit addresses to show on dashboard
  const displayedAddresses = addresses?.slice(0, limit) || [];
  const hasMore = (addresses?.length || 0) > limit;

  return (
    <>
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
        <div className="bg-white/5 border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📍</span>
            <h3 className="text-sm font-semibold text-white">
              Saved Addresses
            </h3>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-medium border border-emerald-500/30">
              {addresses?.length || 0}
            </span>
          </div>
          <Link
            to="/customer/addresses"
            className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition"
          >
            View All
          </Link>
        </div>

        <div className="p-4 space-y-3">
          {!addresses || addresses.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                <FaMapMarkerAlt className="text-xl text-white/40" />
              </div>
              <p className="text-xs text-white/50 mb-3">No saved addresses</p>
              <button
                onClick={() => setShowModal(true)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center justify-center gap-1 mx-auto transition"
              >
                <FaPlus className="text-xs" /> Add Address
              </button>
            </div>
          ) : (
            <>
              {displayedAddresses.map((address) => (
                <div
                  key={address.id}
                  className={`rounded-xl border p-3 transition ${address.isDefault
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                        {getAddressIcon(address.label)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="text-sm font-semibold text-white truncate">
                            {address.label || "Address"}
                          </p>
                          {address.isDefault && (
                            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-medium rounded flex items-center gap-0.5 border border-amber-500/30">
                              <FaStar className="text-xs" /> Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/60 truncate">
                          {address.addressLine1 || address.addressLine}
                        </p>
                        <p className="text-xs text-white/50">
                          {address.city} - {address.pincode}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(address)}
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/50 hover:text-white transition"
                      >
                        <FaEdit className="text-xs" />
                      </button>
                      <button
                        onClick={() => handleDelete(address.id)}
                        disabled={deleting === address.id}
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-red-500/20 flex items-center justify-center text-white/50 hover:text-red-400 transition"
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                  </div>

                  {!address.isDefault && (
                    <button
                      onClick={() => handleSetDefault(address.id)}
                      className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition"
                    >
                      <FaStar className="text-xs" /> Set as Default
                    </button>
                  )}
                </div>
              ))}

              {hasMore && (
                <Link
                  to="/customer/addresses"
                  className="block text-center text-xs text-emerald-400 hover:text-emerald-300 font-medium py-2 transition"
                >
                  +{addresses.length - limit} more addresses →
                </Link>
              )}

              <button
                onClick={() => {
                  setEditingAddress(null);
                  setShowModal(true);
                }}
                className="w-full py-2 border-2 border-dashed border-white/20 hover:border-emerald-500/30 rounded-xl text-xs text-white/50 hover:text-emerald-400 font-medium transition flex items-center justify-center gap-1"
              >
                <FaPlus className="text-xs" /> Add New Address
              </button>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <AddressModal
          customerId={customerId}
          address={editingAddress}
          onClose={() => {
            setShowModal(false);
            setEditingAddress(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingAddress(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
