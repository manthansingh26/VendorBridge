import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { getVendors, createVendor, updateVendor, deleteVendor } from "../../api/vendor.api";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/common/EmptyState";
import { STATUS_COLORS } from "../../utils/constants";
import { Plus, Search, Filter, Edit2, Trash2, Eye, Star } from "lucide-react";

export default function VendorList() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  // Load vendors
  const fetchVendorsList = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter && statusFilter !== "ALL") params.status = statusFilter;

      const res = await getVendors(params);
      if (res.data?.success) {
        setVendors(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load vendors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorsList();
  }, [searchTerm, categoryFilter, statusFilter]);

  // Handle auto open modal from query params
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get("action") === "create") {
      setEditingVendor(null);
      reset();
      setIsModalOpen(true);
      // Clean query parameter
      navigate("/vendors", { replace: true });
    }
  }, [location.search]);

  // Submit vendor form
  const onSubmit = async (data) => {
    try {
      if (editingVendor) {
        const res = await updateVendor(editingVendor.id, data);
        if (res.data?.success) {
          setIsModalOpen(false);
          fetchVendorsList();
        }
      } else {
        const res = await createVendor(data);
        if (res.data?.success) {
          setIsModalOpen(false);
          fetchVendorsList();
        }
      }
    } catch (error) {
      console.error("Vendor save error:", error);
      alert(error.response?.data?.message || "Failed to save vendor.");
    }
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    reset();
    setValue("companyName", vendor.companyName);
    setValue("contactPerson", vendor.contactPerson);
    setValue("email", vendor.email);
    setValue("phone", vendor.phone);
    setValue("gstNumber", vendor.gstNumber);
    setValue("category", vendor.category);
    setValue("address", vendor.address);
    setValue("city", vendor.city);
    setValue("state", vendor.state);
    setValue("pincode", vendor.pincode);
    setValue("status", vendor.status);
    setValue("rating", vendor.rating);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this vendor profile?")) {
      try {
        const res = await deleteVendor(id);
        if (res.data?.success) {
          fetchVendorsList();
        }
      } catch (err) {
        console.error("Failed to delete vendor:", err);
      }
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Suppliers & Vendors</h1>
          <p className="text-gray-500 text-sm mt-1">Manage vendor credentials, categorization, and GST details.</p>
        </div>
        <Button
          onClick={() => {
            setEditingVendor(null);
            reset();
            setIsModalOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" /> Onboard Vendor
        </Button>
      </div>

      {/* Status Tab Filters */}
      <div className="flex border-b border-gray-200 gap-6">
        {[
          { key: "ALL", label: "All Suppliers" },
          { key: "ACTIVE", label: "Active" },
          { key: "PENDING", label: "Pending Verification" },
          { key: "BLOCKED", label: "Blocked" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`pb-3 text-sm font-semibold transition-colors relative ${
              statusFilter === tab.key
                ? "text-primary-600 border-b-2 border-primary-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search by company, contact, email..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="IT Hardware">IT Hardware</option>
            <option value="Software License">Software License</option>
            <option value="Office Stationery">Office Stationery</option>
            <option value="Raw Materials">Raw Materials</option>
            <option value="Services">Services</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading vendors list...</div>
      ) : vendors.length === 0 ? (
        <EmptyState
          title="No vendors onboarded"
          description="Get started by onboarding your first supplier/vendor."
          actionText="Add Supplier"
          onAction={() => {
            setEditingVendor(null);
            reset();
            setIsModalOpen(true);
          }}
        />
      ) : (
        <Table headers={["Company", "Contact Person", "Category", "GSTIN", "Rating", "Status", "Actions"]}>
          {vendors.map((vendor) => (
            <tr key={vendor.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-4 font-semibold text-gray-900">{vendor.companyName}</td>
              <td className="px-6 py-4">
                <div>
                  <p className="font-medium text-gray-800">{vendor.contactPerson}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{vendor.email}</p>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200">
                  {vendor.category}
                </span>
              </td>
              <td className="px-6 py-4 font-mono text-xs text-gray-500">{vendor.gstNumber}</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-bold text-xs">{vendor.rating.toFixed(1)}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    STATUS_COLORS[vendor.status] || "bg-gray-100 text-gray-800"
                  }`}
                >
                  {vendor.status}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/vendors/${vendor.id}`)}
                    className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(vendor)}
                    className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Edit Profile"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(vendor.id)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Vendor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {/* Onboarding / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVendor ? "Update Supplier Profile" : "Onboard Supplier / Vendor"}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Company Name"
              placeholder="e.g. Acme Corporation"
              error={errors.companyName?.message}
              {...register("companyName", { required: "Company Name is required" })}
            />
            <Input
              label="Contact Person"
              placeholder="e.g. John Doe"
              error={errors.contactPerson?.message}
              {...register("contactPerson", { required: "Contact Person is required" })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. supplies@acme.com"
              error={errors.email?.message}
              {...register("email", { required: "Email is required" })}
            />
            <Input
              label="Phone Number"
              placeholder="e.g. +91 9876543210"
              error={errors.phone?.message}
              {...register("phone", { required: "Phone is required" })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="GST Number"
              placeholder="e.g. 22AAAAA0000A1Z5"
              error={errors.gstNumber?.message}
              {...register("gstNumber", {
                required: "GST Number is required",
                pattern: {
                  value: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
                  message: "Invalid GST number format",
                },
              })}
            />
            <Select
              label="Category"
              options={[
                { value: "IT Hardware", label: "IT Hardware" },
                { value: "Software License", label: "Software License" },
                { value: "Office Stationery", label: "Office Stationery" },
                { value: "Raw Materials", label: "Raw Materials" },
                { value: "Services", label: "Services" },
              ]}
              error={errors.category?.message}
              {...register("category", { required: "Category is required" })}
            />
          </div>

          <Input
            label="Address"
            placeholder="e.g. Plot 42, Sector 12, Industrial Area"
            error={errors.address?.message}
            {...register("address", { required: "Address is required" })}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="City"
              placeholder="Mumbai"
              error={errors.city?.message}
              {...register("city", { required: "City is required" })}
            />
            <Input
              label="State"
              placeholder="Maharashtra"
              error={errors.state?.message}
              {...register("state", { required: "State is required" })}
            />
            <Input
              label="Pincode"
              placeholder="400001"
              error={errors.pincode?.message}
              {...register("pincode", {
                required: "Pincode is required",
                pattern: {
                  value: /^[0-9]{6}$/,
                  message: "Must be 6 digits",
                },
              })}
            />
          </div>

          {editingVendor && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Status"
                options={[
                  { value: "ACTIVE", label: "ACTIVE" },
                  { value: "INACTIVE", label: "INACTIVE" },
                  { value: "BLACKLISTED", label: "BLACKLISTED" },
                  { value: "PENDING", label: "PENDING" },
                ]}
                error={errors.status?.message}
                {...register("status")}
              />
              <Input
                label="Rating (0-5)"
                type="number"
                step="0.1"
                min="0"
                max="5"
                error={errors.rating?.message}
                {...register("rating", { valueAsNumber: true })}
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingVendor ? "Update Supplier" : "Create Onboard"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
