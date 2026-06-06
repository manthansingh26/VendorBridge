import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getInvoiceById, emailInvoice, updateInvoiceStatus, getInvoicePDFUrl } from "../../api/invoice.api";
import { useAuth } from "../../context/AuthContext";
import { ROLES, STATUS_COLORS } from "../../utils/constants";
import Card, { CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import {
  ArrowLeft,
  Calendar,
  Printer,
  Mail,
  Download,
  CheckCircle,
  AlertCircle,
  Receipt,
  ExternalLink,
} from "lucide-react";

export default function InvoiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  const fetchInvoice = async () => {
    try {
      const res = await getInvoiceById(id);
      if (res.data?.success) {
        setInvoice(res.data.data);
      } else {
        setError(res.data?.message || "Failed to load invoice details.");
      }
    } catch (err) {
      console.error("Error loading invoice details:", err);
      setError(err.message || "Network error loading invoice details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchInvoice();
  }, [id]);

  if (loading) {
    return <div className="py-12 text-center text-gray-500">Loading invoice details...</div>;
  }

  if (error) {
    return (
      <div className="py-12 text-center text-rose-500 space-y-4">
        <p className="font-semibold">Error: {error}</p>
        <Button onClick={() => { setError(null); fetchInvoice(); }}>
          Retry
        </Button>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p className="mb-4">Invoice not found.</p>
        <Button onClick={() => navigate("/invoices")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
        </Button>
      </div>
    );
  }

  const isManager = user?.role === ROLES.MANAGER || user?.role === ROLES.ADMIN;

  const handleEmailInvoice = async () => {
    setEmailLoading(true);
    setEmailSuccess(false);
    try {
      const res = await emailInvoice(invoice.id);
      if (res.data?.success) {
        setEmailSuccess(true);
      }
    } catch (err) {
      console.error("Failed to email invoice:", err);
      alert(err.response?.data?.message || "Email delivery failed.");
    } finally {
      setEmailLoading(false);
    }
  };



  const handleMarkPaid = async () => {
    try {
      const res = await updateInvoiceStatus(invoice.id, "PAID");
      if (res.data?.success) {
        fetchInvoice();
      }
    } catch (err) {
      console.error("Failed to mark invoice paid:", err);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/invoices")}
            className="p-2 bg-white rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Invoice Billing</h1>
            <p className="text-xs text-gray-400 mt-0.5">Invoice Ref: {invoice.invoiceNumber}</p>
          </div>
        </div>

        {/* Print / Download / Email Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Email button */}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={handleEmailInvoice}
            isLoading={emailLoading}
          >
            <Mail className="w-4 h-4" /> {emailSuccess ? "Sent!" : "Email PDF"}
          </Button>

          {/* Download/View PDF */}
          <a
            href={`${getInvoicePDFUrl(invoice.id)}?token=${localStorage.getItem("token")}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2 h-9 gap-1.5"
          >
            <Download className="w-4 h-4" /> View PDF
          </a>

          {/* Pay button */}
          {isManager && invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
            <Button size="sm" variant="success" onClick={handleMarkPaid} className="gap-1.5">
              <CheckCircle className="w-4 h-4" /> Mark Paid
            </Button>
          )}
        </div>
      </div>

      {/* Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar Metadata */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardBody className="p-6 space-y-5">
              <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider">Billing Status</h3>

              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">INVOICE STATUS</span>
                <span
                  className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    STATUS_COLORS[invoice.status] || "bg-gray-100 text-gray-800"
                  }`}
                >
                  {invoice.status}
                </span>
              </div>

              <div className="space-y-3.5 text-xs text-gray-600 border-t border-gray-100 pt-4">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Invoice Date</span>
                  <span className="font-semibold text-gray-800 mt-0.5 block">
                    {new Date(invoice.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Due Date</span>
                  <span className="font-semibold text-rose-600 mt-0.5 block">
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Associated Purchase Order</span>
                  <Link to={`/purchase-orders/${invoice.poId}`} className="font-semibold text-primary-600 hover:underline mt-0.5 block">
                    {invoice.purchaseOrder?.poNumber || "PO Link"}
                  </Link>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Supplier Supplier</span>
                  <Link to={`/vendors/${invoice.vendorId}`} className="font-semibold text-primary-600 hover:underline mt-0.5 block">
                    {invoice.vendor?.companyName}
                  </Link>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Invoice Itemized display */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardBody className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-indigo-500" /> Billed Items
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-400">GSTIN</p>
                  <p className="text-xs font-mono font-bold text-gray-800 mt-0.5">{invoice.vendor?.gstNumber}</p>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 font-semibold uppercase text-gray-500">Item Name</th>
                      <th className="px-6 py-3 font-semibold uppercase text-gray-500">Quantity</th>
                      <th className="px-6 py-3 font-semibold uppercase text-gray-500">Unit Cost</th>
                      <th className="px-6 py-3 font-semibold uppercase text-gray-500 text-right">Tax Cost</th>
                      <th className="px-6 py-3 font-semibold uppercase text-gray-500 text-right">Gross Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-700">
                    <tr>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {invoice.purchaseOrder?.itemName}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {invoice.purchaseOrder?.quantity}
                      </td>
                      <td className="px-6 py-4">
                        Rs. {invoice.purchaseOrder?.unitPrice?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        Rs. {invoice.taxAmount?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900 text-right">
                        Rs. {invoice.totalAmount?.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end pt-4">
                <div className="w-64 space-y-2.5 text-xs">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-gray-800">
                      Rs. {((invoice?.totalAmount || 0) - (invoice?.taxAmount || 0)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400 pl-3 border-l border-gray-200">
                    <span>CGST (5%):</span>
                    <span className="font-mono text-gray-700">Rs. {((invoice?.taxAmount || 0) / 2).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-gray-400 pl-3 border-l border-gray-200">
                    <span>SGST (5%):</span>
                    <span className="font-mono text-gray-700">Rs. {((invoice?.taxAmount || 0) / 2).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 font-semibold">
                    <span>Total GST Amount:</span>
                    <span className="text-gray-800 font-mono">Rs. {(invoice?.taxAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <hr className="border-gray-100" />
                  <div className="flex justify-between text-sm font-bold text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <span>Gross Invoice:</span>
                    <span className="text-primary-600">Rs. {(invoice?.totalAmount || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
