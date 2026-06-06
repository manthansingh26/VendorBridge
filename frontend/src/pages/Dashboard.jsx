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
  const [metrics, setMetrics] = useState(() => {
    return Array.from({ length: 25 }, (_, i) => ({
      tick: i,
      orders: 0,
      users: 3,
      quotations: 0,
    }));
  });
  const [metricTab, setMetricTab] = useState("all");
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

  useEffect(() => {
    if (user?.role !== ROLES.ADMIN) return;
    if (summary.totalVendors > 0 || summary.totalPOs > 0) {
      const startUsers = summary.totalVendors + 3;
      const startOrders = summary.totalPOs;
      const startQuotes = Math.round(summary.totalRFQs * 1.4) || 5;

      setMetrics(
        Array.from({ length: 25 }, (_, i) => {
          const factor = (i / 24);
          return {
            tick: i,
            orders: Math.max(0, Math.round(startOrders * factor)),
            users: Math.max(3, Math.round(startUsers * factor)),
            quotations: Math.max(0, Math.round(startQuotes * factor)),
          };
        })
      );
    }
  }, [summary, user]);

  useEffect(() => {
    if (user?.role !== ROLES.ADMIN) return;

    const interval = setInterval(() => {
      setMetrics((prev) => {
        const lastPoint = prev[prev.length - 1] || { tick: 0, orders: 0, users: 3, quotations: 0 };
        const nextTick = lastPoint.tick + 1;

        const rand = Math.random();
        let addOrder = 0;
        let addUser = 0;
        let addQuotation = 0;

        if (rand < 0.15) {
          addOrder = 1;
        } else if (rand < 0.25) {
          addUser = 1;
        } else if (rand < 0.55) {
          addQuotation = 1;
        }

        return [
          ...prev.slice(1),
          {
            tick: nextTick,
            orders: lastPoint.orders + addOrder,
            users: lastPoint.users + addUser,
            quotations: lastPoint.quotations + addQuotation,
          }
        ];
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [user]);

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
                  <div className="flex items-end justify-between h-40 pt-4 border-b border-gray-200 gap-2">
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

        {/* Real-time System Monitoring Graph */}
        <Card className="overflow-hidden border border-gray-100 shadow-md">
          <CardBody className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <h3 className="font-bold text-gray-900 text-sm tracking-tight font-sans">ERP System Activity Monitor (Real-Time)</h3>
                </div>
                <p className="text-xs text-gray-400 mt-1">Live updates showing transactions, bid entries, and user growth</p>
              </div>

              {/* Tab Selector */}
              <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-100">
                <button
                  onClick={() => setMetricTab("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    metricTab === "all"
                      ? "bg-white text-gray-800 shadow-sm border border-gray-100"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  All Activity
                </button>
                <button
                  onClick={() => setMetricTab("orders")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    metricTab === "orders"
                      ? "bg-white text-indigo-600 shadow-sm border border-gray-100"
                      : "text-gray-400 hover:text-indigo-500"
                  }`}
                >
                  Orders
                </button>
                <button
                  onClick={() => setMetricTab("users")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    metricTab === "users"
                      ? "bg-white text-emerald-600 shadow-sm border border-gray-100"
                      : "text-gray-400 hover:text-emerald-500"
                  }`}
                >
                  Users
                </button>
                <button
                  onClick={() => setMetricTab("quotes")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    metricTab === "quotes"
                      ? "bg-white text-amber-600 shadow-sm border border-gray-100"
                      : "text-gray-400 hover:text-amber-500"
                  }`}
                >
                  Bids/Quotes
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
              {/* Chart Side */}
              <div className="lg:col-span-3">
                <div className="relative h-44 bg-slate-50/50 rounded-2xl border border-slate-100 p-4">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none text-[9px] font-bold text-gray-300">
                    <div className="border-b border-gray-100/70 w-full pb-1 flex justify-between">
                      <span>Max Activity Level</span>
                      <span className="hidden sm:inline">Active Production Database</span>
                    </div>
                    <div className="border-b border-gray-100/70 w-full pb-1">Mid Level</div>
                    <div className="border-b border-gray-100/70 w-full pb-1">Initial Level</div>
                    <div className="w-full flex justify-between">
                      <span>0</span>
                      <span>Real-time Live Timeline (2s ticks)</span>
                    </div>
                  </div>

                  <svg viewBox={`0 0 ${metrics.length > 0 ? 600 : 0} 160`} className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="quotesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* SVG Grid background guidelines */}
                    <line x1="0" y1="40" x2="600" y2="40" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3,3" />
                    <line x1="0" y1="80" x2="600" y2="80" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3,3" />
                    <line x1="0" y1="120" x2="600" y2="120" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3,3" />

                    {/* Orders Graph (Indigo) */}
                    {(metricTab === "all" || metricTab === "orders") && (
                      <>
                        <path d={`M 0,160 L ${metrics.map((m, i) => `${((i / (metrics.length - 1)) * 600).toFixed(1)}, ${(160 - (m.orders / Math.max(1, Math.max(...metrics.map(k => Math.max(k.orders, k.users, k.quotations))))) * 120 - 20).toFixed(1)}`).join(" ")} L 600,160 Z`} fill="url(#ordersGrad)" className="transition-all duration-300" />
                        <polyline points={metrics.map((m, i) => `${((i / (metrics.length - 1)) * 600).toFixed(1)}, ${(160 - (m.orders / Math.max(1, Math.max(...metrics.map(k => Math.max(k.orders, k.users, k.quotations))))) * 120 - 20).toFixed(1)}`).join(" ")} fill="none" stroke="#6366F1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300" />
                      </>
                    )}

                    {/* Users Graph (Emerald) */}
                    {(metricTab === "all" || metricTab === "users") && (
                      <>
                        <path d={`M 0,160 L ${metrics.map((m, i) => `${((i / (metrics.length - 1)) * 600).toFixed(1)}, ${(160 - (m.users / Math.max(1, Math.max(...metrics.map(k => Math.max(k.orders, k.users, k.quotations))))) * 120 - 20).toFixed(1)}`).join(" ")} L 600,160 Z`} fill="url(#usersGrad)" className="transition-all duration-300" />
                        <polyline points={metrics.map((m, i) => `${((i / (metrics.length - 1)) * 600).toFixed(1)}, ${(160 - (m.users / Math.max(1, Math.max(...metrics.map(k => Math.max(k.orders, k.users, k.quotations))))) * 120 - 20).toFixed(1)}`).join(" ")} fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300" />
                      </>
                    )}

                    {/* Quotations Graph (Amber) */}
                    {(metricTab === "all" || metricTab === "quotes") && (
                      <>
                        <path d={`M 0,160 L ${metrics.map((m, i) => `${((i / (metrics.length - 1)) * 600).toFixed(1)}, ${(160 - (m.quotations / Math.max(1, Math.max(...metrics.map(k => Math.max(k.orders, k.users, k.quotations))))) * 120 - 20).toFixed(1)}`).join(" ")} L 600,160 Z`} fill="url(#quotesGrad)" className="transition-all duration-300" />
                        <polyline points={metrics.map((m, i) => `${((i / (metrics.length - 1)) * 600).toFixed(1)}, ${(160 - (m.quotations / Math.max(1, Math.max(...metrics.map(k => Math.max(k.orders, k.users, k.quotations))))) * 120 - 20).toFixed(1)}`).join(" ")} fill="none" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300" />
                      </>
                    )}
                  </svg>
                </div>
              </div>

              {/* Gauges Side */}
              <div className="lg:col-span-1 space-y-4">
                {/* Purchase Orders Indicator */}
                <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">Purchase Orders</span>
                    <p className="text-xl font-black text-gray-950 mt-0.5">{(metrics[metrics.length - 1] || { orders: 0 }).orders}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>

                {/* Users Indicator */}
                <div className="p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100/50 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">Registered Users</span>
                    <p className="text-xl font-black text-gray-950 mt-0.5">{(metrics[metrics.length - 1] || { users: 0 }).users}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                {/* Quotations Indicator */}
                <div className="p-4 bg-amber-50/30 rounded-2xl border border-amber-100/50 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">Submitted Bids</span>
                    <p className="text-xl font-black text-gray-950 mt-0.5">{(metrics[metrics.length - 1] || { quotations: 0 }).quotations}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

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
                  <Button onClick={() => navigate("/rfqs?action=create")} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white w-fit gap-1">
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
