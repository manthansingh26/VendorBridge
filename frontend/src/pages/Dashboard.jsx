import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Card, { CardBody } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { getSummaryReport, getMonthlySpendingReport } from "../api/report.api";
import { getPurchaseOrders } from "../api/purchaseOrder.api";
import { ROLES } from "../utils/constants";
import {
  Users,
  ClipboardList,
  IndianRupee,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  FileText,
  CheckCircle,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [recentPOs, setRecentPOs] = useState([]);
  const [spendingTrend, setSpendingTrend] = useState([]);
  const [summary, setSummary] = useState({
    totalVendors: 0,
    totalRFQs: 0,
    approvedRFQs: 0,
    rejectedRFQs: 0,
    totalPOs: 0,
    totalInvoices: 0,
    overdueInvoices: 0,
    pendingApprovals: 0,
    totalSpending: 0,
    topVendors: [],
  });

  const isVendor = user?.role === ROLES.VENDOR;

  useEffect(() => {
    if (!isVendor) {
      setLoading(true);
      Promise.all([
        getSummaryReport(),
        getPurchaseOrders({ take: 5 }),
        getMonthlySpendingReport(),
      ])
        .then(([resSummary, resPOs, resSpending]) => {
          if (resSummary.data?.success) {
            setSummary(resSummary.data.data);
          }
          if (resPOs.data?.success) {
            setRecentPOs(resPOs.data.data.slice(0, 5));
          }
          if (resSpending.data?.success) {
            setSpendingTrend(resSpending.data.data || []);
          }
        })
        .catch((err) => console.error("Error loading dashboard data:", err))
        .finally(() => setLoading(false));
    }
  }, [isVendor]);

  // Format currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const maxSpendingVal = spendingTrend.length > 0
    ? Math.max(...spendingTrend.map((s) => s.spending))
    : 100000;

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header section with profile overview */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Procurement Dashboard
          </h1>
          <p className="text-gray-500 mt-1">
            Welcome back, <span className="font-semibold text-primary-600">{user?.name}</span>. 
            You are logged in as <span className="capitalize font-semibold text-gray-800">{user?.role?.toLowerCase()?.replace("_", " ")}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">System Time:</span>
          <span className="text-xs bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600 font-mono">
            {new Date().toLocaleDateString("en-IN", { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Metrics Grid (Only for Admin, Officer, Manager) */}
      {!isVendor && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="hover:shadow-md transition-shadow">
            <CardBody className="flex items-center gap-4">
              <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl">
                <IndianRupee className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Spending</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">
                  {loading ? "..." : formatCurrency(summary.totalSpending)}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardBody className="flex items-center gap-4">
              <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pending Approvals</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">
                  {loading ? "..." : summary.pendingApprovals}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardBody className="flex items-center gap-4">
              <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active RFQs</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">
                  {loading ? "..." : summary.totalRFQs}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardBody className="flex items-center gap-4">
              <div className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Overdue Invoices</p>
                <p className="text-xl font-bold text-gray-950 mt-0.5">
                  {loading ? "..." : summary.overdueInvoices || 0}
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Main layout splitting quick links and notifications/summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Actions, PO Table, Charts */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardBody className="p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-500" />
                Quick Actions
              </h3>

              {/* PROCUREMENT_OFFICER actions */}
              {user?.role === ROLES.PROCUREMENT_OFFICER && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-gray-100 flex flex-col justify-between h-36">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-800">Request Quotations</h4>
                      <p className="text-xs text-gray-400 mt-1">Draft a new Request for Quotation (RFQ) and invite vendors.</p>
                    </div>
                    <Button onClick={() => navigate("/rfqs")} size="sm" className="w-fit gap-1">
                      New RFQ <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-gray-100 flex flex-col justify-between h-36">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-800">Add New Vendor</h4>
                      <p className="text-xs text-gray-400 mt-1">Onboard a new supplier profile with contact and tax parameters.</p>
                    </div>
                    <Button onClick={() => navigate("/vendors?action=create")} size="sm" className="w-fit gap-1">
                      Add Vendor <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* MANAGER actions */}
              {user?.role === ROLES.MANAGER && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-gray-100 flex flex-col justify-between h-36">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-800">Pending Approvals</h4>
                      <p className="text-xs text-gray-400 mt-1">Review quotation selections and authorize purchase orders.</p>
                    </div>
                    <Button onClick={() => navigate("/approvals")} size="sm" className="w-fit gap-1">
                      Authorizations <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-gray-100 flex flex-col justify-between h-36">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-800">Procurement Reports</h4>
                      <p className="text-xs text-gray-400 mt-1">Analyze department performance, vendor ratings, and spend lines.</p>
                    </div>
                    <Button onClick={() => navigate("/reports")} size="sm" className="w-fit gap-1">
                      Open Charts <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* VENDOR actions */}
              {isVendor && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-gray-100 flex flex-col justify-between h-36">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-800">Active RFQs</h4>
                      <p className="text-xs text-gray-400 mt-1">View invitation requests and submit price quotations before deadline.</p>
                    </div>
                    <Button onClick={() => navigate("/rfqs")} size="sm" className="w-fit gap-1">
                      Assigned RFQs <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-gray-100 flex flex-col justify-between h-36">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-800">Invoices</h4>
                      <p className="text-xs text-gray-400 mt-1">Submit invoices for accepted Purchase Orders and track payments.</p>
                    </div>
                    <Button onClick={() => navigate("/invoices")} size="sm" className="w-fit gap-1">
                      Billing Panel <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ADMIN actions */}
              {user?.role === ROLES.ADMIN && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Link to="/admin/users" className="p-4 bg-slate-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors flex flex-col items-center text-center">
                    <Users className="w-6 h-6 text-primary-500 mb-2" />
                    <span className="font-semibold text-xs text-gray-800">Manage Users</span>
                  </Link>

                  <Link to="/activity-logs" className="p-4 bg-slate-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors flex flex-col items-center text-center">
                    <Clock className="w-6 h-6 text-indigo-500 mb-2" />
                    <span className="font-semibold text-xs text-gray-800">Activity Logs</span>
                  </Link>

                  <Link to="/rfqs" className="p-4 bg-slate-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors flex flex-col items-center text-center">
                    <ClipboardList className="w-6 h-6 text-emerald-500 mb-2" />
                    <span className="font-semibold text-xs text-gray-800">All RFQs</span>
                  </Link>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Recent Purchase Orders Table */}
          {!isVendor && (
            <Card>
              <CardBody className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-semibold text-gray-900">Recent Purchase Orders</h3>
                  <Link to="/purchase-orders" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                    View All <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                {recentPOs.length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">No purchase orders generated yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase">
                          <th className="py-2">PO#</th>
                          <th className="py-2">Vendor</th>
                          <th className="py-2">Amount</th>
                          <th className="py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-gray-700">
                        {recentPOs.map((po) => (
                          <tr key={po.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => navigate(`/purchase-orders/${po.id}`)}>
                            <td className="py-3 font-semibold text-primary-600">{po.poNumber}</td>
                            <td className="py-3 font-medium">{po.vendor?.companyName}</td>
                            <td className="py-3 font-bold">Rs. {po.totalAmount.toLocaleString()}</td>
                            <td className="py-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-150">
                                {po.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        {/* Right 1 Column: Top Rated Suppliers / Spend Trends CSS Chart */}
        <div className="space-y-6">
          {!isVendor && spendingTrend.length > 0 && (
            <Card>
              <CardBody className="p-5">
                <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider">Spending Trend</h3>
                <div className="flex items-end justify-between h-36 pt-4 border-b border-gray-100 gap-2">
                  {spendingTrend.slice(-4).map((trend, idx) => {
                    const percentage = (trend.spending / maxSpendingVal) * 100;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center group relative">
                        <span className="absolute -top-7 scale-0 group-hover:scale-100 transition-transform bg-gray-900 text-white text-[9px] px-1.5 py-0.5 rounded shadow font-semibold">
                          Rs.{Math.round(trend.spending/1000)}k
                        </span>
                        <div
                          style={{ height: `${Math.max(10, percentage)}%` }}
                          className="w-full bg-primary-500 hover:bg-primary-600 rounded-t transition-all"
                        />
                        <span className="text-[9px] font-bold text-gray-400 mt-1.5 whitespace-nowrap">
                          {trend.month.split(" ")[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          )}

          {!isVendor ? (
            <Card>
              <CardBody className="p-5">
                <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider">Top Rated Suppliers</h3>
                <div className="divide-y divide-gray-100">
                  {loading ? (
                    <p className="text-xs text-gray-400 py-3">Loading top suppliers...</p>
                  ) : summary.topVendors.length === 0 ? (
                    <p className="text-xs text-gray-400 py-3">No suppliers onboarded yet.</p>
                  ) : (
                    summary.topVendors.map((vendor) => (
                      <div key={vendor.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-gray-800">{vendor.companyName}</p>
                          <p className="text-gray-400 mt-0.5">{vendor.category}</p>
                        </div>
                        <span className="px-2 py-1 rounded bg-yellow-50 text-yellow-700 font-bold border border-yellow-200">
                          ★ {vendor.rating.toFixed(1)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CardBody>
            </Card>
          ) : (
            <Card className="bg-primary-600 border-none text-white">
              <CardBody className="p-6 flex flex-col justify-between h-48">
                <div>
                  <AlertCircle className="w-8 h-8 text-primary-200" />
                  <h3 className="font-bold text-base mt-2">Vendor Bridge Portal</h3>
                  <p className="text-xs text-primary-100 mt-1 leading-relaxed">
                    Access all assigned quotation requests, billing invoices, and purchase authorizations directly from your dashboard.
                  </p>
                </div>
                <div className="text-[10px] text-primary-200 font-mono">
                  Connected to Odoo ERP Node
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
