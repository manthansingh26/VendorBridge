import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { getRFQs, createRFQ, updateRFQ, deleteRFQ, assignVendors } from "../../api/rfq.api";
import { getVendors } from "../../api/vendor.api";
import { uploadFile } from "../../api/user.api";
import { useAuth } from "../../context/AuthContext";
import { ROLES, STATUS_COLORS } from "../../utils/constants";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Textarea from "../../components/ui/Textarea";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/common/EmptyState";
import { Plus, Search, Filter, Eye, UserPlus, Calendar, Layers, Trash2 } from "lucide-react";

export default function RFQList() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [rfqs, setRFQs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  
  const [selectedRFQ, setSelectedRFQ] = useState(null);
  const [allVendors, setAllVendors] = useState([]);
  const [selectedVendors, setSelectedVendors] = useState([]);

  // Stepper states
  const [step, setStep] = useState(1);
  const [step1Data, setStep1Data] = useState(null);
  const [matchingVendors, setMatchingVendors] = useState([]);
  const [assignedVendorIds, setAssignedVendorIds] = useState([]);
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm();
  
  const watchAttachmentUrl = watch("attachmentUrl");

  const isOfficer = user?.role === ROLES.PROCUREMENT_OFFICER || user?.role === ROLES.ADMIN;

  const fetchRFQsList = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const res = await getRFQs(params);
      if (res.data?.success) {
        setRFQs(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load RFQs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRFQsList();
  }, [searchTerm, statusFilter]);

  // Handle URL creation trigger
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get("action") === "create" && isOfficer) {
      reset();
      setStep(1);
      setStep1Data(null);
      setAssignedVendorIds([]);
      setIsCreateOpen(true);
      navigate("/rfqs", { replace: true });
    }
  }, [location.search]);

  // File Upload Helper
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await uploadFile(formData);
        if (res.data?.success) {
          setValue("attachmentUrl", res.data.fileUrl);
        }
      } catch (err) {
        console.error(err);
        alert("File upload failed.");
      } finally {
        setUploading(false);
      }
    }
  };

  // Step 1: Specifications Submitted, load vendors
  const onNextStep = async (data) => {
    setStep1Data(data);
    try {
      const res = await getVendors({ category: data.category, status: "ACTIVE" });
      if (res.data?.success) {
        setMatchingVendors(res.data.data);
      }
      setStep(2);
    } catch (err) {
      console.error(err);
    }
  };

  // Step 2: Finalize Draft or Publish
  const handleCreateRFQFinal = async (shouldPublish) => {
    try {
      // Create RFQ first
      const res = await createRFQ(step1Data);
      if (res.data?.success) {
        const newRFQ = res.data.data;
        // If publish and vendors selected, assign them which updates status to SENT
        if (shouldPublish && assignedVendorIds.length > 0) {
          await assignVendors(newRFQ.id, assignedVendorIds);
        }
        setIsCreateOpen(false);
        setStep(1);
        setStep1Data(null);
        setAssignedVendorIds([]);
        fetchRFQsList();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to create RFQ.");
    }
  };

  const handleToggleVendorSelectInStepper = (vendorId) => {
    setAssignedVendorIds((prev) =>
      prev.includes(vendorId) ? prev.filter((id) => id !== vendorId) : [...prev, vendorId]
    );
  };

  // Open assign vendor modal
  const handleOpenAssign = async (rfq) => {
    setSelectedRFQ(rfq);
    setSelectedVendors([]);
    setIsAssignOpen(true);

    try {
      // Get vendors matching this RFQ category
      const res = await getVendors({ category: rfq.category, status: "ACTIVE" });
      if (res.data?.success) {
        setAllVendors(res.data.data);
        // Pre-fill already assigned
        const currentAssignedIds = rfq.assignedVendors?.map(av => av.vendorId) || [];
        setSelectedVendors(currentAssignedIds);
      }
    } catch (err) {
      console.error("Failed to load matching vendors:", err);
    }
  };

  const handleToggleVendorSelect = (vendorId) => {
    setSelectedVendors((prev) =>
      prev.includes(vendorId) ? prev.filter((id) => id !== vendorId) : [...prev, vendorId]
    );
  };

  const handleSaveAssignments = async () => {
    if (selectedVendors.length === 0) {
      alert("Please select at least one supplier/vendor.");
      return;
    }

    try {
      const res = await assignVendors(selectedRFQ.id, selectedVendors);
      if (res.data?.success) {
        setIsAssignOpen(false);
        fetchRFQsList();
      }
    } catch (err) {
      console.error("Failed to save assignments:", err);
      alert("Error saving vendor assignments.");
    }
  };

  const handleDeleteRFQ = async (id) => {
    if (confirm("Are you sure you want to delete this RFQ?")) {
      try {
        const res = await deleteRFQ(id);
        if (res.data?.success) {
          fetchRFQsList();
        }
      } catch (err) {
        console.error("Failed to delete RFQ:", err);
      }
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Requests for Quotations (RFQ)</h1>
          <p className="text-gray-500 text-sm mt-1">
            {user?.role === ROLES.VENDOR 
              ? "View RFQs assigned to your profile and submit Quotations." 
              : "Create procurement demand lines, request supplier bids, and view quotations."}
          </p>
        </div>
        {isOfficer && (
          <Button onClick={() => { reset(); setIsCreateOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Create RFQ
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search by title, item name..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="SENT">SENT</option>
            <option value="QUOTATION_RECEIVED">QUOTATION RECEIVED</option>
            <option value="UNDER_COMPARISON">UNDER COMPARISON</option>
            <option value="APPROVAL_PENDING">APPROVAL PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>
      </div>

      {/* RFQ Grid/Table */}
      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading RFQs...</div>
      ) : rfqs.length === 0 ? (
        <EmptyState
          title="No RFQs found"
          description="Create a new procurement demand or check status filters."
          actionText={isOfficer ? "Create RFQ" : null}
          onAction={isOfficer ? () => setIsCreateOpen(true) : null}
        />
      ) : (
        <Table headers={["Title", "Category", "Item Description", "Deadline", "Status", "Actions"]}>
          {rfqs.map((rfq) => (
            <tr key={rfq.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-4">
                <div>
                  <p className="font-semibold text-gray-900 leading-tight">{rfq.title}</p>
                  <p className="text-[10px] text-gray-400 mt-1">Creator: {rfq.createdBy?.name || "System"}</p>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs border border-slate-200">
                  {rfq.category}
                </span>
              </td>
              <td className="px-6 py-4">
                <div>
                  <p className="font-medium text-gray-800">{rfq.itemName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Quantity: {rfq.quantity} {rfq.unit}</p>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>{new Date(rfq.deadline).toLocaleDateString()}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    STATUS_COLORS[rfq.status] || "bg-gray-100 text-gray-800"
                  }`}
                >
                  {rfq.status}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => navigate(`/rfqs/${rfq.id}`)}
                    className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="View Details & Quotations"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {isOfficer && rfq.status === "DRAFT" && (
                    <button
                      onClick={() => handleOpenAssign(rfq)}
                      className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Invite / Assign Vendors"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  )}
                  {user?.role === ROLES.ADMIN && (
                    <button
                      onClick={() => handleDeleteRFQ(rfq.id)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete RFQ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {/* Creation Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Request for Quotation (RFQ)" maxWidth="max-w-xl">
        {/* Stepper Header */}
        <div className="flex items-center justify-between mb-6 border-b border-gray-150 pb-4">
          <div className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step === 1 ? "bg-primary-600 text-white shadow-sm" : "bg-emerald-100 text-emerald-700"
            }`}>
              {step > 1 ? "✓" : "1"}
            </span>
            <span className={`text-xs font-semibold ${step === 1 ? "text-gray-900 font-bold" : "text-emerald-700"}`}>RFQ Details</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-100 mx-4" />
          <div className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step === 2 ? "bg-primary-600 text-white shadow-sm" : "bg-gray-100 text-gray-400"
            }`}>
              2
            </span>
            <span className={`text-xs font-semibold ${step === 2 ? "text-gray-900 font-bold" : "text-gray-400"}`}>Assign Vendors</span>
          </div>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSubmit(onNextStep)} className="space-y-4">
            <Input
              label="RFQ Title"
              placeholder="e.g. Procurement of Office Laptops Q3"
              error={errors.title?.message}
              {...register("title", { required: "RFQ Title is required" })}
            />

            <Textarea
              label="RFQ Description"
              placeholder="Describe technical specifications, deliverables, warranties, etc."
              error={errors.description?.message}
              {...register("description", { required: "RFQ Description is required" })}
            />

            <div className="p-4 bg-slate-50/50 border border-gray-100 rounded-xl space-y-3">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Attachment / Specifications Document
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
                {uploading && <span className="text-xs text-gray-400">Uploading...</span>}
              </div>
              {watchAttachmentUrl && (
                <p className="text-[10px] text-emerald-600 font-semibold mt-1">✓ Uploaded: {watchAttachmentUrl}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Item Name"
                placeholder="e.g. Lenovo ThinkPad L14"
                error={errors.itemName?.message}
                {...register("itemName", { required: "Item Name is required" })}
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Quantity"
                type="number"
                placeholder="10"
                error={errors.quantity?.message}
                {...register("quantity", { required: "Quantity required", valueAsNumber: true })}
              />
              <Input
                label="Unit (e.g. Pcs, Kgs)"
                placeholder="Pcs"
                error={errors.unit?.message}
                {...register("unit", { required: "Unit is required" })}
              />
              <Input
                label="Submission Deadline"
                type="date"
                error={errors.deadline?.message}
                {...register("deadline", { required: "Deadline is required" })}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Next: Assign Vendors
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-gray-100 mb-2">
              <h4 className="font-semibold text-sm text-gray-800">{step1Data?.title}</h4>
              <p className="text-xs text-gray-400 mt-1">
                Category: <span className="text-gray-600 font-medium">{step1Data?.category}</span>
              </p>
            </div>

            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Select matching suppliers to invite ({matchingVendors.length} available)
            </p>

            {matchingVendors.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center bg-gray-50 border border-dashed rounded-xl">
                No active suppliers found in this category. You can still save it as a draft.
              </p>
            ) : (
              <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50 bg-white">
                {matchingVendors.map((vendor) => (
                  <label key={vendor.id} className="flex items-center gap-3 p-3 hover:bg-gray-50/50 cursor-pointer text-xs transition-colors">
                    <input
                      type="checkbox"
                      checked={assignedVendorIds.includes(vendor.id)}
                      onChange={() => handleToggleVendorSelectInStepper(vendor.id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">{vendor.companyName}</p>
                      <p className="text-gray-400 mt-0.5">Rating: ★ {vendor.rating.toFixed(1)} | {vendor.city}, {vendor.state}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => handleCreateRFQFinal(false)}>
                  Save as Draft
                </Button>
                <Button type="button" onClick={() => handleCreateRFQFinal(true)} disabled={assignedVendorIds.length === 0}>
                  Save & Send to Vendors
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Vendor Assignment Modal */}
      <Modal isOpen={isAssignOpen} onClose={() => setIsAssignOpen(false)} title="Invite Active Suppliers" maxWidth="max-w-xl">
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-gray-100">
            <h4 className="font-semibold text-sm text-gray-800">{selectedRFQ?.title}</h4>
            <p className="text-xs text-gray-400 mt-1">Category: {selectedRFQ?.category} | Quantity: {selectedRFQ?.quantity} {selectedRFQ?.unit}</p>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            <p className="text-xs text-gray-400 uppercase font-semibold">Select Suppliers to invite:</p>
            {allVendors.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center border rounded border-dashed border-gray-200">
                No active suppliers found in the <span className="font-semibold">{selectedRFQ?.category}</span> category.
              </p>
            ) : (
              allVendors.map((vendor) => {
                const isChecked = selectedVendors.includes(vendor.id);
                return (
                  <div
                    key={vendor.id}
                    onClick={() => handleToggleVendorSelect(vendor.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all hover:bg-gray-50 ${
                      isChecked 
                        ? "border-primary-500 bg-primary-50/20" 
                        : "border-gray-100"
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-xs text-gray-800">{vendor.companyName}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{vendor.contactPerson} ({vendor.email})</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-[11px] font-bold text-yellow-500 flex items-center gap-0.5">
                        ★ {vendor.rating.toFixed(1)}
                      </div>
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        checked={isChecked}
                        onChange={() => {}} // Controlled by outer click
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAssignments} disabled={allVendors.length === 0}>
              Send RFQ Invitations
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
