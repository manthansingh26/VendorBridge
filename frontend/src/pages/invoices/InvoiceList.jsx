import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getInvoices } from "../../api/invoice.api";
import { useAuth } from "../../context/AuthContext";
import { ROLES, STATUS_COLORS } from "../../utils/constants";
import Table from "../../components/ui/Table";
import EmptyState from "../../components/common/EmptyState";
import { Receipt, Eye, Calendar } from "lucide-react";

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    getInvoices()
      .then((res) => {
        if (res.data?.success) {
          setInvoices(res.data.data);
        }
      })
      .catch((err) => console.error("Error loading invoices:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">Billing & Invoices</h1>
        <p className="text-gray-500 text-sm mt-1">
          {user?.role === ROLES.VENDOR 
            ? "Track your submitted invoices, payment cycles, and remittance statuses." 
            : "Review invoices, dispatch payments, and verify GST records."}
        </p>
      </div>

      {/* Table grid */}
      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading invoices...</div>
      ) : invoices.length === 0 ? (
        <EmptyState
          title="No Invoices"
          description="Invoices will appear once they are generated from accepted POs."
          icon={Receipt}
        />
      ) : (
        <Table headers={["Invoice Number", "PO Ref", "Supplier", "Total Amount", "Due Date", "Status", "Created Date", "Action"]}>
          {invoices.map((inv) => (
            <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">
                {inv.invoiceNumber}
              </td>
              <td className="px-6 py-4 font-semibold text-gray-500">
                {inv.purchaseOrder?.poNumber || "PO Ref"}
              </td>
              <td className="px-6 py-4">
                {inv.vendor?.companyName}
              </td>
              <td className="px-6 py-4 font-bold text-primary-600">
                Rs. {inv.totalAmount.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-xs">
                <div className="flex items-center gap-1.5 text-rose-600 font-semibold">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(inv.dueDate).toLocaleDateString()}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    STATUS_COLORS[inv.status] || "bg-gray-100 text-gray-800"
                  }`}
                >
                  {inv.status}
                </span>
              </td>
              <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                {new Date(inv.createdAt).toLocaleDateString()}
              </td>
              <td className="px-6 py-4">
                <button
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                  className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  title="View Details"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
