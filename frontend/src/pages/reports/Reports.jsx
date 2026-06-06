import { useState, useEffect } from "react";
import {
  getVendorPerformanceReport,
  getMonthlySpendingReport,
  getProcurementStatsReport,
  getSummaryReport
} from "../../api/report.api";
import Card, { CardBody } from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { BarChart3, TrendingUp, Users, Star, PieChart, Landmark, FileDown, Calendar, Printer } from "lucide-react";

export default function Reports() {
  const [vendors, setVendors] = useState([]);
  const [spending, setSpending] = useState([]);
  const [stats, setStats] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Date Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchReportsData = () => {
    setLoading(true);
    Promise.all([
      getVendorPerformanceReport(),
      getMonthlySpendingReport(),
      getProcurementStatsReport(),
      getSummaryReport(),
    ])
      .then(([resVendors, resSpending, resStats, resSummary]) => {
        if (resVendors.data?.success) setVendors(resVendors.data.data || []);
        if (resSpending.data?.success) setSpending(resSpending.data.data || []);
        if (resStats.data?.success) setStats(resStats.data.data || null);
        if (resSummary.data?.success) setSummary(resSummary.data.data || null);
      })
      .catch((err) => console.error("Error loading analytics data:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-gray-500">Loading procurement intelligence...</div>;
  }

  // Find max monthly spending to scale graph height
  const maxSpendingVal = spending.length > 0
    ? Math.max(...spending.map((s) => s.spending))
    : 100000;

  // Find max category spending
  const maxCategorySpend = summary?.spendByCategory?.length > 0
    ? Math.max(...summary.spendByCategory.map((c) => c.amount))
    : 100000;

  // Find max vendor spending
  const maxVendorSpend = summary?.spendByVendor?.length > 0
    ? Math.max(...summary.spendByVendor.map((v) => v.amount))
    : 100000;

  const handleExport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-slide-up print:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">Analytics & Intelligence</h1>
          <p className="text-gray-500 text-sm mt-1">Audit spend data, supplier scorecards, and system conversions.</p>
        </div>

        {/* Date Filter Inputs & Print Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-150 shadow-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs text-gray-700 bg-transparent border-0 focus:ring-0 p-0 w-28"
            />
            <span className="text-xs text-gray-400 font-bold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs text-gray-700 bg-transparent border-0 focus:ring-0 p-0 w-28"
            />
          </div>

          <Button onClick={handleExport} variant="outline" size="sm" className="gap-1.5">
            <Printer className="w-4 h-4" /> Export/Print
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardBody className="p-5">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Total Audited Spend</span>
            <p className="text-xl font-extrabold text-gray-900 mt-1">Rs. {summary?.totalSpending?.toLocaleString() || 0}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-5">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Overdue Invoices</span>
            <p className="text-xl font-extrabold text-rose-600 mt-1">{summary?.overdueInvoices || 0}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-5">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Onboarded Vendors</span>
            <p className="text-xl font-extrabold text-gray-900 mt-1">{summary?.totalVendors || 0} ({summary?.activeVendors || 0} Active)</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-5">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Pending Approvals</span>
            <p className="text-xl font-extrabold text-amber-600 mt-1">{summary?.pendingApprovals || 0}</p>
          </CardBody>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending Monthly bar charts */}
        <Card className="lg:col-span-2">
          <CardBody className="p-6 space-y-6">
            <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Landmark className="w-5 h-5 text-primary-500" /> Spend Analysis (Monthly)
            </h3>

            {spending.length === 0 ? (
              <p className="text-xs text-gray-400 py-12 text-center">No monthly spending logs recorded.</p>
            ) : (
              <div className="space-y-4">
                {/* CSS Bar Chart */}
                <div className="flex items-end justify-between h-48 pt-6 border-b border-gray-100 px-4 gap-2">
                  {spending.map((s, idx) => {
                    const percentage = (s.spending / maxSpendingVal) * 100;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center group relative">
                        {/* Tooltip */}
                        <span className="absolute -top-7 scale-0 group-hover:scale-100 transition-transform bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow font-semibold">
                          Rs. {s.spending.toLocaleString()}
                        </span>
                        {/* Bar */}
                        <div
                          style={{ height: `${Math.max(5, percentage)}%` }}
                          className="w-full bg-primary-600 rounded-t-lg group-hover:bg-primary-500 transition-colors"
                        />
                        <span className="text-[10px] font-bold text-gray-400 mt-2 whitespace-nowrap">
                          {s.month}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* General conversion stats */}
        <Card className="lg:col-span-1">
          <CardBody className="p-6 space-y-6">
            <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <PieChart className="w-5 h-5 text-indigo-500" /> RFQ Conversion
            </h3>

            {(!stats) ? (
              <p className="text-xs text-gray-400 py-12 text-center">No conversion records found.</p>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-slate-50 border border-gray-100 rounded-xl space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total RFQs Created:</span>
                    <span className="font-bold text-gray-900">{summary?.totalRFQs || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Purchase Orders:</span>
                    <span className="font-bold text-gray-900">{summary?.totalPOs || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Approved RFQs:</span>
                    <span className="font-bold text-emerald-600">{summary?.approvedRFQs || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rejected RFQs:</span>
                    <span className="font-bold text-rose-600">{summary?.rejectedRFQs || 0}</span>
                  </div>
                </div>

                {/* RFQs by status listing */}
                <div className="space-y-2">
                  <p className="font-bold text-gray-700">Demand pipeline</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 border border-gray-100 rounded-lg">
                      <span className="text-gray-400 block text-[10px]">APPROVED RFQs</span>
                      <span className="text-sm font-bold text-emerald-600">{summary?.approvedRFQs || 0}</span>
                    </div>
                    <div className="p-2 border border-gray-100 rounded-lg">
                      <span className="text-gray-400 block text-[10px]">PENDING APPROVAL</span>
                      <span className="text-sm font-bold text-amber-600">{summary?.pendingApprovals || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Spend breakdowns: Category Spend & Top Vendors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spend by Category List */}
        <Card>
          <CardBody className="p-6 space-y-4">
            <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" /> Spend by Category Breakdown
            </h3>

            {!summary?.spendByCategory || summary.spendByCategory.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No spend data categorized.</p>
            ) : (
              <div className="space-y-3.5">
                {summary.spendByCategory.map((cat, idx) => {
                  const percentage = maxCategorySpend > 0 ? (cat.amount / maxCategorySpend) * 100 : 0;
                  return (
                    <div key={idx} className="space-y-1.5 text-xs">
                      <div className="flex justify-between font-semibold">
                        <span className="text-gray-700">{cat.category}</span>
                        <span className="text-gray-900">Rs. {cat.amount.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          style={{ width: `${percentage}%` }}
                          className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Top Vendors Spending Bar Chart */}
        <Card>
          <CardBody className="p-6 space-y-4">
            <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500" /> Spend by Supplier (Top 5)
            </h3>

            {!summary?.spendByVendor || summary.spendByVendor.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No spend logs by vendor recorded.</p>
            ) : (
              <div className="space-y-3.5">
                {summary.spendByVendor.map((v, idx) => {
                  const percentage = maxVendorSpend > 0 ? (v.amount / maxVendorSpend) * 100 : 0;
                  return (
                    <div key={idx} className="space-y-1.5 text-xs">
                      <div className="flex justify-between font-semibold">
                        <span className="text-gray-700">{v.vendorName}</span>
                        <span className="text-gray-900">Rs. {v.amount.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          style={{ width: `${percentage}%` }}
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Supplier Scorecards */}
      <Card>
        <CardBody className="p-6">
          <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-500" /> Supplier Scorecards
          </h3>

          {vendors.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">No active suppliers onboarded.</p>
          ) : (
            <Table headers={["Supplier", "Rating Score", "Purchase Orders", "Success Rate"]}>
              {vendors.map((v, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-900 leading-tight">{v.companyName}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{v.category}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-yellow-500 font-bold text-xs">
                      <Star className="w-4 h-4 fill-current" />
                      <span>{v.rating.toFixed(1)} / 5.0</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-700">
                    {v.purchaseOrdersCount || 0} Orders
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {/* CSS progress bar */}
                      <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          style={{ width: `${v.successRate || 75}%` }}
                          className="bg-emerald-500 h-full rounded-full"
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-800">{(v.successRate || 75).toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
