import { useState, useEffect } from "react";
import { getActivityLogs } from "../../api/report.api";
import Table from "../../components/ui/Table";
import EmptyState from "../../components/common/EmptyState";
import { History } from "lucide-react";

const MODULE_TABS = [
  { id: "ALL", label: "All Logs" },
  { id: "RFQ", label: "RFQs" },
  { id: "APPROVAL", label: "Approvals" },
  { id: "INVOICE", label: "Invoices" },
  { id: "VENDOR", label: "Vendors" },
];

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState("ALL");

  const fetchLogs = () => {
    setLoading(true);
    const params = {};
    if (selectedModule !== "ALL") {
      params.module = selectedModule;
    }

    getActivityLogs(params)
      .then((res) => {
        if (res.data?.success) {
          setLogs(res.data.data);
        }
      })
      .catch((err) => console.error("Error loading activity logs:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedModule]);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">System Activity Logs</h1>
          <p className="text-gray-500 text-sm mt-1">Audit log records representing operations, changes, and authentication requests.</p>
        </div>

        {/* Pill Tabs */}
        <div className="flex flex-wrap items-center bg-gray-100 p-1 rounded-xl gap-0.5 border border-gray-200 self-start md:self-auto">
          {MODULE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedModule(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                selectedModule === tab.id
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 hover:bg-white/40"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table grid */}
      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading audit trail logs...</div>
      ) : logs.length === 0 ? (
        <EmptyState
          title="No Logs Available"
          description="Activities will show up once operations occur under this filter."
          icon={History}
        />
      ) : (
        <Table headers={["User", "Action", "Description", "IP Address", "Timestamp"]}>
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <p className="font-semibold text-gray-900 leading-tight">{log.user?.name || "System"}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{log.user?.role}</p>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200 uppercase font-mono">
                  {log.action}
                </span>
              </td>
              <td className="px-6 py-4 text-xs text-gray-600 max-w-xs truncate" title={log.description}>
                {log.description}
              </td>
              <td className="px-6 py-4 font-mono text-xs text-gray-400">
                {log.ipAddress || "127.0.0.1"}
              </td>
              <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                {new Date(log.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
