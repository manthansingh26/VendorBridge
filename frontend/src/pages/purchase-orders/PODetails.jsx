import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { getPurchaseOrderById, updatePOStatus } from "../../api/purchaseOrder.api";
import { generateInvoice } from "../../api/invoice.api";
import { useAuth } from "../../context/AuthContext";
import { ROLES, STATUS_COLORS } from "../../utils/constants";
import Card, { CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import {
  ArrowLeft,
  Calendar,
  ShieldCheck,
  ShoppingBag,
  IndianRupee,
  Check,
  Send,
  Receipt,
  FileCheck,
} from "lucide-react";

export default function PODetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [po, setPO] = useState(null);
  const [loading, setLoading] = useState(true);

  // Billing Modal
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchPO = async () => {
    try {
      const res = await getPurchaseOrderById(id);
      if (res.data?.success) {
        setPO(res.data.data);
      }
    } catch (err) {
      console.error("Error loading purchase order details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchPO();
  }, [id]);

  if (loading) {
    return <div className="py-12 text-center text-gray-500">Loading purchase order details...</div>;
  }

  if (!po) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p className="mb-4">Purchase Order not found.</p>
        <Button onClick={() => navigate("/purchase-orders")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
        </Button>
      </div>
    );
  }

  const isVendor = user?.role === ROLES.VENDOR;
  const isOfficer = user?.role === ROLES.PROCUREMENT_OFFICER || user?.role === ROLES.ADMIN;

  // Change status (e.g. Accept order, Send order)
  const handleUpdateStatus = async (statusVal) => {
    try {
      const res = await updatePOStatus(po.id, statusVal);
      if (res.data?.success) {
        fetchPO();
      }
    } catch (err) {
      console.error("Failed to update PO status:", err);
      alert(err.response?.data?.message || "Status update failed.");
    }
  };

  // Generate Invoice form submit
  const onCreateInvoiceSubmit = async (data) => {
    try {
      const res = await generateInvoice({
        poId: po.id,
        dueDate: data.dueDate,
      });

      if (res.data?.success) {
        setIsInvoiceModalOpen(false);
        const invoice = res.data.data;
        navigate(`/invoices/${invoice.id}`);
      }
    } catch (err) {
      console.error("Invoice creation error:", err);
      alert(err.response?.data?.message || "Failed to create invoice.");
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/purchase-orders")}
            className="p-2 bg-white rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Purchase Order Details</h1>
            <p className="text-xs text-gray-400 mt-0.5">PO Number: {po.poNumber}</p>
          </div>
        </div>

        {/* Dynamic Action Buttons */}
        <div className="flex items-center gap-2">
          {isOfficer && po.status === "GENERATED" && (
            <Button size="sm" onClick={() => handleUpdateStatus("SENT")} className="gap-1.5">
              <Send className="w-4 h-4" /> Send to Vendor
            </Button>
          )}

          {isVendor && (po.status === "GENERATED" || po.status === "SENT") && (
            <Button size="sm" variant="success" onClick={() => handleUpdateStatus("ACCEPTED")} className="gap-1.5">
              <Check className="w-4 h-4" /> Accept PO
            </Button>
          )}

          {/* Create Invoice button */}
          {isOfficer && po.status === "ACCEPTED" && (
            <Button size="sm" variant="success" onClick={() => { reset(); setIsInvoiceModalOpen(true); }} className="gap-1.5">
              <Receipt className="w-4 h-4" /> Generate Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Metadata */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardBody className="p-6 space-y-5">
              <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider">Order Metadata</h3>

              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">ORDER STATUS</span>
                <span
                  className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    STATUS_COLORS[po.status] || "bg-gray-100 text-gray-800"
                  }`}
                >
                  {po.status}
                </span>
              </div>

              <div className="space-y-3.5 text-xs text-gray-600 border-t border-gray-100 pt-4">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Order Date</span>
                  <span className="font-semibold text-gray-800 mt-0.5 block">
                    {new Date(po.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Supplier Supplier</span>
                  <Link to={`/vendors/${po.vendorId}`} className="font-semibold text-primary-600 hover:underline mt-0.5 block">
                    {po.vendor?.companyName}
                  </Link>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Procurement Officer</span>
                  <span className="font-semibold text-gray-800 mt-0.5 block">
                    {po.generatedBy?.name || "System"}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Linked Invoices */}
          {po.invoices?.length > 0 && (
            <Card>
              <CardBody className="p-5 space-y-3">
                <h4 className="font-bold text-xs text-gray-900 uppercase tracking-wider">Linked Invoices</h4>
                <div className="space-y-2.5">
                  {po.invoices.map((inv) => (
                    <Link
                      key={inv.id}
                      to={`/invoices/${inv.id}`}
                      className="p-3 bg-slate-50 hover:bg-gray-100 transition-colors border border-gray-100 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-gray-800">{inv.invoiceNumber}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Due: {new Date(inv.dueDate).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${STATUS_COLORS[inv.status]}`}>
                        {inv.status}
                      </span>
                    </Link>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Invoice Grid items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardBody className="p-6 space-y-6">
              <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-500" /> Line Items
              </h3>

              {/* Table */}
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 font-semibold uppercase text-gray-500">Item Name</th>
                      <th className="px-6 py-3 font-semibold uppercase text-gray-500">Quantity</th>
                      <th className="px-6 py-3 font-semibold uppercase text-gray-500">Unit Price</th>
                      <th className="px-6 py-3 font-semibold uppercase text-gray-500 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-700">
                    <tr>
                      <td className="px-6 py-4 font-semibold text-gray-900">{po.itemName}</td>
                      <td className="px-6 py-4 font-medium">{po.quantity}</td>
                      <td className="px-6 py-4">Rs. {po.unitPrice.toLocaleString()}</td>
                      <td className="px-6 py-4 font-bold text-gray-900 text-right">
                        Rs. {(po.unitPrice * po.quantity).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end pt-4">
                <div className="w-64 space-y-2.5 text-xs">
                  <div className="flex justify-between text-gray-500">
                    <span>Tax (GST) Amount:</span>
                    <span className="font-semibold text-gray-800">Rs. {po.taxAmount.toLocaleString()}</span>
                  </div>
                  <hr className="border-gray-100" />
                  <div className="flex justify-between text-sm font-bold text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <span>Gross Total:</span>
                    <span className="text-primary-600">Rs. {po.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Generate Invoice Modal */}
      <Modal isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} title="Generate Invoice Billing" maxWidth="max-w-md">
        <form onSubmit={handleSubmit(onCreateInvoiceSubmit)} className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-gray-100 text-xs space-y-2">
            <p className="font-semibold text-gray-700">Purchase Order summary:</p>
            <div className="flex justify-between">
              <span className="text-gray-400">PO Ref:</span>
              <span className="font-bold text-gray-900">{po.poNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total Billed:</span>
              <span className="font-bold text-primary-600">Rs. {po.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <Input
            label="Payment Due Date"
            type="date"
            error={errors.dueDate?.message}
            {...register("dueDate", { required: "Payment Due Date is required" })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setIsInvoiceModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="success">
              Create & Generate PDF
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
