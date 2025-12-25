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
    if (lowerLabel.includes("home")) return <FaHome className="text-emerald-500" />;
    if (lowerLabel.includes("office")) return <FaBuilding className="text-blue-500" />;
    return <FaMapMarkerAlt className="text-orange-500" />;
  };

  // Limit addresses to show on dashboard
  const displayedAddresses = addresses?.slice(0, limit) || [];
  const hasMore = (addresses?.length || 0) > limit;

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📍</span>
            <h3 className="text-sm font-semibold text-gray-900">
              Saved Addresses
            </h3>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
              {addresses?.length || 0}
            </span>
          </div>
          <Link
            to="/customer/addresses"
            className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
          >
            View All
          </Link>
        </div>

        <div className="p-4 space-y-3">
          {!addresses || addresses.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                <FaMapMarkerAlt className="text-xl text-gray-400" />
              </div>
              <p className="text-xs text-gray-500 mb-3">No saved addresses</p>
              <button
                onClick={() => setShowModal(true)}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center justify-center gap-1 mx-auto"
              >
                <FaPlus className="text-xs" /> Add Address
              </button>
            </div>
          ) : (
            <>
              {displayedAddresses.map((address) => (
                <div
                  key={address.id}
                  className={`rounded-xl border p-3 transition hover:shadow-sm ${address.isDefault
                      ? "border-emerald-300 bg-emerald-50/50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        {getAddressIcon(address.label)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {address.label || "Address"}
                          </p>
                          {address.isDefault && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded flex items-center gap-0.5">
                              <FaStar className="text-xs" /> Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 truncate">
                          {address.addressLine1 || address.addressLine}
                        </p>
                        <p className="text-xs text-gray-500">
                          {address.city} - {address.pincode}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(address)}
                        className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-primary-100 flex items-center justify-center text-gray-500 hover:text-primary-600 transition"
                      >
                        <FaEdit className="text-xs" />
                      </button>
                      <button
                        onClick={() => handleDelete(address.id)}
                        disabled={deleting === address.id}
                        className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-100 flex items-center justify-center text-gray-500 hover:text-red-600 transition"
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                  </div>

                  {!address.isDefault && (
                    <button
                      onClick={() => handleSetDefault(address.id)}
                      className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                    >
                      <FaStar className="text-xs" /> Set as Default
                    </button>
                  )}
                </div>
              ))}

              {hasMore && (
                <Link
                  to="/customer/addresses"
                  className="block text-center text-xs text-emerald-600 hover:text-emerald-700 font-medium py-2"
                >
                  +{addresses.length - limit} more addresses →
                </Link>
              )}

              <button
                onClick={() => {
                  setEditingAddress(null);
                  setShowModal(true);
                }}
                className="w-full py-2 border-2 border-dashed border-gray-200 hover:border-emerald-300 rounded-xl text-xs text-gray-500 hover:text-emerald-600 font-medium transition flex items-center justify-center gap-1"
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
