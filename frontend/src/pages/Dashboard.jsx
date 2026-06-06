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
  ShieldAlert,
  Server,
  Mail,
  Database,
  Building,
  Star,
  CheckSquare
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [recentPOs, setRecentPOs] = useState([]);
  const [spendingTrend, setSpendingTrend] = useState([]);
  const [summary, setSummary] = useState({
    totalVendors: 0,
    activeVendors: 0,
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

  // Format currency helper
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

  // --- RENDER 1: VENDOR VIEW ---
  if (user?.role === ROLES.VENDOR) {
    return (
      <div className="space-y-6 animate-slide-up">
        {/* Header Banner - Emerald Theme */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 rounded-3xl text-white shadow-lg shadow-emerald-500/10">
          <div className="flex items-center gap-3">
            <Building className="w-8 h-8 text-emerald-200" />
            <h1 className="text-2xl font-extrabold tracking-tight">Supplier Collaboration Portal</h1>
          </div>
          <p className="text-emerald-100 mt-2 max-w-xl text-sm leading-relaxed">
            Welcome, <span className="font-bold underline">{user.name}</span>. Submit quotes, deliver invoices, and review active purchase contracts.
          </p>
        </div>

        {/* Vendor Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-md transition-shadow border-t-4 border-emerald-500">
            <CardBody className="p-6 flex flex-col justify-between h-44">
              <div>
                <ClipboardList className="w-7 h-7 text-emerald-600" />
                <h3 className="font-bold text-gray-800 mt-3 text-sm">Assigned RFQ Bidding</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Review specifications and submit your delivery timeline & price offer before the deadline.
                </p>
              </div>
              <Button onClick={() => navigate("/rfqs")} variant="success" size="sm" className="w-fit gap-1 mt-4">
                View Requests <ArrowRight className="w-4 h-4" />
              </Button>
            </CardBody>
          </Card>

          <Card className="hover:shadow-md transition-shadow border-t-4 border-teal-500">
            <CardBody className="p-6 flex flex-col justify-between h-44">
              <div>
                <FileText className="w-7 h-7 text-teal-600" />
                <h3 className="font-bold text-gray-800 mt-3 text-sm">Billing & Invoices</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Generate digital invoices for authorized Purchase Orders and track outstanding payments.
                </p>
              </div>
              <Button onClick={() => navigate("/invoices")} size="sm" className="bg-teal-600 hover:bg-teal-700 text-white w-fit gap-1 mt-4">
                Open Billing <ArrowRight className="w-4 h-4" />
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  // --- RENDER 2: MANAGER VIEW ---
  if (user?.role === ROLES.MANAGER) {
    return (
      <div className="space-y-6 animate-slide-up">
        {/* Executive Header Banner - Charcoal Gold Theme */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 p-8 rounded-3xl text-white shadow-xl shadow-slate-950/15">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-8 h-8 text-amber-400" />
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-100">Management & Approvals Console</h1>
          </div>
          <p className="text-slate-400 mt-2 max-w-xl text-sm leading-relaxed">
            Logged in as manager <span className="font-semibold text-amber-400">{user.name}</span>. Perform audit authorization checks on pending procurement requests.
          </p>
        </div>

        {/* Manager KPI Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow border-l-4 border-amber-500">
            <CardBody className="flex items-center gap-4">
              <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl animate-pulse">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pending Authorizations</p>
                <p className="text-2xl font-black text-gray-900 mt-0.5">{summary.pendingApprovals}</p>
              </div>
            </CardBody>
          </Card>

          <Card className="hover:shadow-md transition-shadow border-l-4 border-blue-500">
            <CardBody className="flex items-center gap-4">
              <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl">
                <IndianRupee className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Audited Spend</p>
                <p className="text-xl font-black text-gray-900 mt-0.5">{formatCurrency(summary.totalSpending)}</p>
              </div>
            </CardBody>
          </Card>

          <Card className="hover:shadow-md transition-shadow border-l-4 border-rose-500">
            <CardBody className="flex items-center gap-4">
              <div className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Overdue Bills</p>
                <p className="text-2xl font-black text-rose-600 mt-0.5">{summary.overdueInvoices}</p>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Grid content split: Recent approvals queue & Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardBody className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Pending Action Items</h3>
                  <Link to="/approvals" className="text-xs text-amber-600 font-bold hover:underline">
                    Manage Queue &rarr;
                  </Link>
                </div>
                {summary.pendingApprovals === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">All procurement requests have been audited and signed.</p>
                ) : (
                  <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-amber-900">Signatures Required ({summary.pendingApprovals})</p>
                      <p className="text-amber-700 mt-0.5">Please review unit price quotes and authorize Purchase Orders.</p>
                    </div>
                    <Button onClick={() => navigate("/approvals")} size="sm" variant="warning" className="gap-1 font-bold">
                      Audit Bids <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Monthly Trend Chart */}
            {spendingTrend.length > 0 && (
              <Card>
                <CardBody className="p-6">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Spend Statistics Trend</h3>
                  <div className="flex items-end justify-between h-40 pt-4 border-b border-gray-150 gap-2">
                    {spendingTrend.map((trend, idx) => {
                      const percentage = (trend.spending / maxSpendingVal) * 100;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center group relative">
                          <span className="absolute -top-7 scale-0 group-hover:scale-100 transition-transform bg-gray-900 text-white text-[9px] px-1.5 py-0.5 rounded shadow font-semibold">
                            Rs.{Math.round(trend.spending/1000)}k
                          </span>
                          <div
                            style={{ height: `${Math.max(10, percentage)}%` }}
                            className="w-full bg-slate-800 hover:bg-amber-500 rounded-t transition-all duration-200"
                          />
                          <span className="text-[9px] font-bold text-gray-400 mt-2 whitespace-nowrap">
                            {trend.month}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardBody className="p-6 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Quick Executive Controls</h3>
                <div className="space-y-2 text-xs">
                  <Button onClick={() => navigate("/reports")} variant="outline" className="w-full justify-start gap-2">
                    <TrendingUp className="w-4 h-4 text-slate-500" /> Procurement Analytics
                  </Button>
                  <Button onClick={() => navigate("/invoices")} variant="outline" className="w-full justify-start gap-2">
                    <FileText className="w-4 h-4 text-slate-500" /> Billed Invoices list
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER 3: ADMIN VIEW ---
  if (user?.role === ROLES.ADMIN) {
    return (
      <div className="space-y-6 animate-slide-up">
        {/* Admin Header Banner - Purple/Indigo theme */}
        <div className="bg-gradient-to-r from-purple-800 to-indigo-900 p-8 rounded-3xl text-white shadow-lg shadow-purple-500/10">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-purple-200" />
            <h1 className="text-2xl font-extrabold tracking-tight">Core System Administration Portal</h1>
          </div>
          <p className="text-purple-100 mt-2 max-w-xl text-sm leading-relaxed">
            Logged in as global administrator <span className="font-bold underline">{user.name}</span>. Monitor core database services and control user privileges.
          </p>
        </div>

        {/* System Health Diagnostics Card Grid */}
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">System Resource Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-t-4 border-emerald-500">
            <CardBody className="flex items-center justify-between p-5 text-xs">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-500" />
                <span className="font-bold text-gray-700">Database Engine</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[10px]">CONNECTED (HEALTHY)</span>
            </CardBody>
          </Card>
          <Card className="border-t-4 border-emerald-500">
            <CardBody className="flex items-center justify-between p-5 text-xs">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-emerald-500" />
                <span className="font-bold text-gray-700">API Server Gateway</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[10px]">ONLINE</span>
            </CardBody>
          </Card>
          <Card className="border-t-4 border-emerald-500">
            <CardBody className="flex items-center justify-between p-5 text-xs">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-emerald-500" />
                <span className="font-bold text-gray-700">Mailer (SMTP Config)</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[10px]">SMTP READY</span>
            </CardBody>
          </Card>
        </div>

        {/* Admin Console Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardBody className="p-5 flex flex-col justify-between h-36">
              <div>
                <h4 className="font-bold text-gray-800 text-sm">Account Authorizations</h4>
                <p className="text-xs text-gray-400 mt-1">Configure profile mappings, user passwords, and role updates.</p>
              </div>
              <Button onClick={() => navigate("/admin/users")} size="sm" className="bg-purple-700 hover:bg-purple-800 text-white w-fit gap-1">
                Manage Users <ArrowRight className="w-4 h-4" />
              </Button>
            </CardBody>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardBody className="p-5 flex flex-col justify-between h-36">
              <div>
                <h4 className="font-bold text-gray-800 text-sm">Audit Activity Logs</h4>
                <p className="text-xs text-gray-400 mt-1">Audit raw logs showing updates, creations, logins, and API triggers.</p>
              </div>
              <Button onClick={() => navigate("/activity-logs")} size="sm" variant="outline" className="w-fit gap-1">
                View Logs <ArrowRight className="w-4 h-4" />
              </Button>
            </CardBody>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardBody className="p-5 flex flex-col justify-between h-36">
              <div>
                <h4 className="font-bold text-gray-800 text-sm">Global RFQ Index</h4>
                <p className="text-xs text-gray-400 mt-1">Monitor all Requests for Quotations generated by officers.</p>
              </div>
              <Button onClick={() => navigate("/rfqs")} size="sm" variant="secondary" className="w-fit gap-1">
                Open Index <ArrowRight className="w-4 h-4" />
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  // --- RENDER 4: PROCUREMENT OFFICER VIEW (DEFAULT) ---
  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header - Indigo/Blue Theme */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-8 rounded-3xl text-white shadow-lg shadow-indigo-500/10">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-8 h-8 text-indigo-200" />
          <h1 className="text-2xl font-extrabold tracking-tight">Procurement Command Center</h1>
        </div>
        <p className="text-indigo-100 mt-2 max-w-xl text-sm leading-relaxed">
          Welcome back, <span className="font-bold underline">{user.name}</span>. Initiate stepper RFQs, invite category-matched vendors, and review Quotation bids.
        </p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="hover:shadow-md transition-shadow border-l-4 border-indigo-600">
          <CardBody className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active RFQs</p>
              <p className="text-xl font-black text-gray-900 mt-0.5">{summary.totalRFQs}</p>
            </div>
          </CardBody>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-blue-500">
          <CardBody className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Suppliers</p>
              <p className="text-xl font-black text-gray-900 mt-0.5">{summary.totalVendors}</p>
            </div>
          </CardBody>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-emerald-500">
          <CardBody className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Completed POs</p>
              <p className="text-xl font-black text-gray-900 mt-0.5">{summary.totalPOs}</p>
            </div>
          </CardBody>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-rose-500">
          <CardBody className="flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Overdue Invoices</p>
              <p className="text-xl font-black text-rose-600 mt-0.5">{summary.overdueInvoices}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Main split grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column POs & actions */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardBody className="p-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Operations Console</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-indigo-50/20 rounded-2xl border border-indigo-100 flex flex-col justify-between h-36">
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">New Quotation Request</h4>
                    <p className="text-xs text-gray-400 mt-1">Initiate a stepper RFQ with specs document and matched suppliers.</p>
                  </div>
                  <Button onClick={() => navigate("/rfqs")} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white w-fit gap-1">
                    Create RFQ <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="p-4 bg-blue-50/20 rounded-2xl border border-blue-100 flex flex-col justify-between h-36">
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">Register Vendor</h4>
                    <p className="text-xs text-gray-400 mt-1">Add a supplier with contact details, status, and category.</p>
                  </div>
                  <Button onClick={() => navigate("/vendors?action=create")} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white w-fit gap-1">
                    Onboard Vendor <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Recent POs */}
          <Card>
            <CardBody className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Recent Purchase Orders</h3>
                <Link to="/purchase-orders" className="text-xs text-indigo-600 font-semibold hover:underline">
                  View All &rarr;
                </Link>
              </div>
              {recentPOs.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">No purchase orders generated yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase">
                        <th className="py-2">PO Number</th>
                        <th className="py-2">Vendor Name</th>
                        <th className="py-2">Amount</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-gray-700">
                      {recentPOs.map((po) => (
                        <tr key={po.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => navigate(`/purchase-orders/${po.id}`)}>
                          <td className="py-3 font-semibold text-indigo-600">{po.poNumber}</td>
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
        </div>

        {/* Right sidebars */}
        <div className="space-y-6">
          {spendingTrend.length > 0 && (
            <Card>
              <CardBody className="p-5">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">Spending trend</h3>
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
                          className="w-full bg-indigo-500 hover:bg-indigo-600 rounded-t transition-all"
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

          <Card>
            <CardBody className="p-5">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Top Rated Suppliers</h3>
              <div className="divide-y divide-gray-100">
                {summary.topVendors.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3">No suppliers onboarded yet.</p>
                ) : (
                  summary.topVendors.map((vendor) => (
                    <div key={vendor.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-gray-800">{vendor.companyName}</p>
                        <p className="text-gray-400 text-[10px] mt-0.5">{vendor.category}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-yellow-50 text-yellow-700 font-bold border border-yellow-200 text-[10px]">
                        ★ {vendor.rating.toFixed(1)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
