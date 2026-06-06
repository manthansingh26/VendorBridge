import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getVendorById } from "../../api/vendor.api";
import Card, { CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import { STATUS_COLORS } from "../../utils/constants";
import { ArrowLeft, Star, Phone, Mail, MapPin, ShieldAlert, Award, ClipboardList } from "lucide-react";

export default function VendorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getVendorById(id)
      .then((res) => {
        if (res.data?.success) {
          setVendor(res.data.data);
        }
      })
      .catch((err) => {
        console.error("Error loading vendor details:", err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="py-12 text-center text-gray-500">Loading vendor profile...</div>;
  }

  if (!vendor) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p className="mb-4">Vendor not found.</p>
        <Button onClick={() => navigate("/vendors")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
        </Button>
      </div>
    );
  }

  // Aggregate stats
  const totalQuotations = vendor.quotations?.length || 0;
  const approvedQuotes = vendor.quotations?.filter((q) => q.status === "APPROVED").length || 0;
  const totalPOs = vendor.purchaseOrders?.length || 0;
  const totalSpending = vendor.purchaseOrders?.reduce((sum, po) => sum + po.totalAmount, 0) || 0;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/vendors")}
          className="p-2 bg-white rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{vendor.companyName}</h1>
          <p className="text-xs text-gray-400 mt-0.5">Supplier ID: {vendor.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="space-y-6">
          <Card>
            <CardBody className="p-6 space-y-6">
              {/* Supplier Identity */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-700 font-extrabold text-lg border border-primary-200">
                  {vendor.companyName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{vendor.companyName}</h3>
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    {vendor.category}
                  </span>
                </div>
              </div>

              {/* Status & Star Ratings */}
              <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-100 py-4">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">STATUS</span>
                  <span
                    className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      STATUS_COLORS[vendor.status] || "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {vendor.status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">RATING</span>
                  <div className="flex items-center gap-1 mt-1 text-yellow-500 font-bold text-sm">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{vendor.rating.toFixed(1)} / 5.0</span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-3.5 text-xs text-gray-600">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{vendor.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{vendor.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-4 h-4 text-gray-400" />
                  <span className="font-mono">{vendor.gstNumber} (GSTIN)</span>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <span>
                    {vendor.address}, <br />
                    {vendor.city}, {vendor.state} - {vendor.pincode}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Supplier Statistics */}
          <Card>
            <CardBody className="p-5 space-y-4">
              <h4 className="font-bold text-xs text-gray-900 uppercase tracking-wider">Performance metrics</h4>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400">Total Quotations</span>
                  <span className="font-bold text-gray-900">{totalQuotations}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400">Approved Quotes</span>
                  <span className="font-bold text-emerald-600">{approvedQuotes}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400">Success Rate</span>
                  <span className="font-bold text-gray-900">
                    {totalQuotations > 0 ? ((approvedQuotes / totalQuotations) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400">Purchase Orders</span>
                  <span className="font-bold text-gray-900">{totalPOs}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-400">Total Business Value</span>
                  <span className="font-bold text-primary-600">
                    {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(totalSpending)}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* History Tables */}
        <div className="lg:col-span-2 space-y-6">
          {/* Purchase Orders List */}
          <Card>
            <CardBody className="p-5">
              <h3 className="font-bold text-sm text-gray-900 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-500" /> Purchase Orders from Supplier
              </h3>
              {(!vendor.purchaseOrders || vendor.purchaseOrders.length === 0) ? (
                <p className="text-xs text-gray-400 py-4 text-center">No Purchase Orders generated yet.</p>
              ) : (
                <Table headers={["PO Number", "Item Name", "Quantity", "Total Amount", "Status"]}>
                  {vendor.purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3 font-semibold text-gray-800">{po.poNumber}</td>
                      <td className="px-6 py-3 font-medium">{po.itemName}</td>
                      <td className="px-6 py-3">{po.quantity}</td>
                      <td className="px-6 py-3 font-semibold text-primary-600">
                        Rs. {po.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                            STATUS_COLORS[po.status] || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {po.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </Table>
              )}
            </CardBody>
          </Card>

          {/* Quotations List */}
          <Card>
            <CardBody className="p-5">
              <h3 className="font-bold text-sm text-gray-900 mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-500" /> Quotations History
              </h3>
              {(!vendor.quotations || vendor.quotations.length === 0) ? (
                <p className="text-xs text-gray-400 py-4 text-center">No quotations submitted yet.</p>
              ) : (
                <Table headers={["RFQ", "Unit Price", "Tax %", "Total Price", "Timeline", "Status"]}>
                  {vendor.quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3 font-medium text-gray-800">{q.rfq?.title || "RFQ Ref"}</td>
                      <td className="px-6 py-3">Rs. {q.price.toLocaleString()}</td>
                      <td className="px-6 py-3 font-mono text-xs text-gray-400">{q.taxPercentage}%</td>
                      <td className="px-6 py-3 font-bold text-primary-600">
                        Rs. {q.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-xs">{q.deliveryTimeline}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                            STATUS_COLORS[q.status] || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </Table>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
