import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRFQById } from "../../api/rfq.api";
import { shortlistQuotation } from "../../api/quotation.api";
import { requestApproval } from "../../api/approval.api";
import { generatePurchaseOrder } from "../../api/purchaseOrder.api";
import { useAuth } from "../../context/AuthContext";
import { ROLES, STATUS_COLORS } from "../../utils/constants";
import Card, { CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Textarea from "../../components/ui/Textarea";
import { useForm } from "react-hook-form";
import { ArrowLeft, Star, Clock, AlertTriangle, ShieldCheck, ShoppingBag, TrendingDown, ArrowRight } from "lucide-react";

export default function QuotationCompare() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);

  // Approval modal states
  const [isRequestApprovalOpen, setIsRequestApprovalOpen] = useState(false);
  const [selectedQuotationForApproval, setSelectedQuotationForApproval] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchRFQ = async () => {
    try {
      const res = await getRFQById(id);
      if (res.data?.success) {
        setRfq(res.data.data);
      }
    } catch (err) {
      console.error("Error loading RFQ for comparison:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRFQ();
  }, [id]);

  if (loading) {
    return <div className="py-12 text-center text-gray-500">Loading quotation matrix...</div>;
  }

  if (!rfq || !rfq.quotations || rfq.quotations.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p className="mb-4">No quotations found to compare.</p>
        <Button onClick={() => navigate(`/rfqs/${id}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to RFQ
        </Button>
      </div>
    );
  }

  const isOfficer = user?.role === ROLES.PROCUREMENT_OFFICER || user?.role === ROLES.ADMIN;

  // Find lowest price quotation
  const lowestQuotation = [...rfq.quotations].sort((a, b) => a.totalAmount - b.totalAmount)[0];

  // Shortlist quotation handler
  const handleShortlist = async (quoteId) => {
    try {
      const res = await shortlistQuotation(quoteId);
      if (res.data?.success) {
        fetchRFQ();
      }
    } catch (err) {
      console.error("Shortlist error:", err);
    }
  };

  // Submit approval request to manager
  const onSubmitApprovalRequest = async (data) => {
    try {
      const res = await requestApproval({
        rfqId: rfq.id,
        quotationId: selectedQuotationForApproval.id,
        remarks: data.remarks,
      });

      if (res.data?.success) {
        setIsRequestApprovalOpen(false);
        fetchRFQ();
      }
    } catch (err) {
      console.error("Approval request error:", err);
      alert(err.response?.data?.message || "Failed to request approval.");
    }
  };

  // PO Generation
  const handleGeneratePO = async (quotationId) => {
    try {
      const res = await generatePurchaseOrder({
        rfqId: rfq.id,
        quotationId,
      });
      if (res.data?.success) {
        navigate(`/purchase-orders/${res.data.data.id}`);
      }
    } catch (err) {
      console.error("PO generation error:", err);
      alert(err.response?.data?.message || "Failed to generate PO.");
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/rfqs/${id}`)}
          className="p-2 bg-white rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quotation Comparison Matrix</h1>
          <p className="text-xs text-gray-500 mt-0.5">RFQ: {rfq.title} (Qty: {rfq.quantity} {rfq.unit})</p>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rfq.quotations.map((quote) => {
          const isLowest = quote.id === lowestQuotation.id;
          const taxVal = (quote.price * rfq.quantity) * (quote.taxPercentage / 100);
          const cgstVal = taxVal / 2;
          const sgstVal = taxVal / 2;

          return (
            <Card
              key={quote.id}
              className={`relative overflow-hidden transition-all duration-300 ${
                isLowest
                  ? "border-2 border-emerald-500 shadow-md ring-2 ring-emerald-500/10"
                  : "border border-gray-200 hover:border-gray-300 hover:shadow-sm"
              }`}
            >
              {isLowest && (
                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <TrendingDown className="w-3.5 h-3.5" /> Best Bid
                </div>
              )}

              <CardBody className="p-6 space-y-5">
                {/* Supplier Detail */}
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{quote.vendor?.companyName}</h3>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-gray-400 font-semibold uppercase">{quote.vendor?.category}</span>
                    <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded border border-yellow-200 flex items-center gap-1">
                      ★ {quote.vendor?.rating.toFixed(1)}
                    </span>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Pricing Breakdown */}
                <div className="space-y-2.5">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Offered Unit Price</span>
                    <span className="font-semibold text-gray-800">Rs. {quote.price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Base Amount ({rfq.quantity} units)</span>
                    <span className="font-semibold text-gray-800">Rs. {(quote.price * rfq.quantity).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 pl-3 border-l-2 border-slate-100">
                    <span>CGST (50% of {quote.taxPercentage}%)</span>
                    <span className="font-mono">Rs. {cgstVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 pl-3 border-l-2 border-slate-100 mb-2">
                    <span>SGST (50% of {quote.taxPercentage}%)</span>
                    <span className="font-mono">Rs. {sgstVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <hr className="border-gray-100 border-dashed" />
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-xs font-bold text-gray-800">Total Bid Amount</span>
                    <span className="text-base font-extrabold text-primary-600">Rs. {quote.totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Operations & Terms */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[9px] text-gray-400 uppercase font-semibold block">Delivery Lead Time</span>
                    <span className="font-bold text-gray-700 block mt-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" /> {quote.deliveryTimeline}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 uppercase font-semibold block">Payment Terms</span>
                    <span className="font-bold text-gray-700 block mt-1">
                      {quote.paymentTerms ? `Net ${quote.paymentTerms} Days` : "Immediate"}
                    </span>
                  </div>
                </div>

                {quote.notes && (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[9px] text-gray-400 uppercase font-semibold block mb-1">Remarks / Notes</span>
                    <p className="text-xs text-gray-600 italic">"{quote.notes}"</p>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[quote.status]}`}>
                    {quote.status}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Shortlist action */}
                    {isOfficer && quote.status === "SUBMITTED" && (
                      <Button size="xs" onClick={() => handleShortlist(quote.id)}>
                        Shortlist
                      </Button>
                    )}

                    {/* Ask Approval action */}
                    {isOfficer && quote.status === "SHORTLISTED" && (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          setSelectedQuotationForApproval(quote);
                          reset();
                          setIsRequestApprovalOpen(true);
                        }}
                      >
                        Ask Approval
                      </Button>
                    )}

                    {/* Generate PO action */}
                    {isOfficer && quote.status === "APPROVED" && rfq.status === "APPROVED" && (
                      <Button
                        size="xs"
                        variant="success"
                        className="gap-1.5"
                        onClick={() => handleGeneratePO(quote.id)}
                      >
                        <ShoppingBag className="w-3.5 h-3.5" /> Order
                      </Button>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Request Approval Modal */}
      <Modal isOpen={isRequestApprovalOpen} onClose={() => setIsRequestApprovalOpen(false)} title="Request Manager Approval" maxWidth="max-w-lg">
        <form onSubmit={handleSubmit(onSubmitApprovalRequest)} className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-gray-100 text-xs space-y-2">
            <p className="font-semibold text-gray-800">Selected supplier bid details:</p>
            <div className="flex justify-between">
              <span className="text-gray-400">Supplier:</span>
              <span className="font-bold text-gray-900">{selectedQuotationForApproval?.vendor?.companyName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total Bid:</span>
              <span className="font-bold text-primary-600">Rs. {selectedQuotationForApproval?.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <Textarea
            label="Audit Remarks / Rationale"
            placeholder="Justification for selecting this vendor bid (e.g. lowest quotation pricing)."
            error={errors.remarks?.message}
            {...register("remarks", { required: "Rationale remarks are required for audit logs" })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setIsRequestApprovalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Send to Manager
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
