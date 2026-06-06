import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPurchaseOrders } from "../../api/purchaseOrder.api";
import { useAuth } from "../../context/AuthContext";
import { ROLES, STATUS_COLORS } from "../../utils/constants";
import Table from "../../components/ui/Table";
import EmptyState from "../../components/common/EmptyState";
import { ShoppingBag, Eye, Calendar } from "lucide-react";

export default function POList() {
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    getPurchaseOrders()
      .then((res) => {
        if (res.data?.success) {
          setPOs(res.data.data);
        }
      })
      .catch((err) => console.error("Error loading purchase orders:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">Purchase Orders (PO)</h1>
        <p className="text-gray-500 text-sm mt-1">
          {user?.role === ROLES.VENDOR 
            ? "View purchase authorizations, accept terms, and create invoices." 
            : "Monitor active orders, procurement commitments, and supplier acceptances."}
        </p>
      </div>

      {/* Table grid */}
      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading purchase orders...</div>
      ) : pos.length === 0 ? (
        <EmptyState
          title="No Purchase Orders"
          description="Purchase orders will appear once quotations are approved."
          icon={ShoppingBag}
        />
      ) : (
        <Table headers={["PO Number", "Item Name", "Supplier", "Quantity", "Total Amount", "Status", "Date", "Action"]}>
          {pos.map((po) => (
            <tr key={po.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">
                {po.poNumber}
              </td>
              <td className="px-6 py-4 font-medium text-gray-800">
                {po.itemName}
              </td>
              <td className="px-6 py-4">
                {po.vendor?.companyName}
              </td>
              <td className="px-6 py-4">
                {po.quantity}
              </td>
              <td className="px-6 py-4 font-bold text-primary-600">
                Rs. {po.totalAmount.toLocaleString()}
              </td>
              <td className="px-6 py-4">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    STATUS_COLORS[po.status] || "bg-gray-100 text-gray-800"
                  }`}
                >
                  {po.status}
                </span>
              </td>
              <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>{new Date(po.createdAt).toLocaleDateString()}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <button
                  onClick={() => navigate(`/purchase-orders/${po.id}`)}
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
