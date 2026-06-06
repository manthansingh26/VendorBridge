import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { getRFQById } from "../../api/rfq.api";
import { submitQuotation, shortlistQuotation } from "../../api/quotation.api";
import { requestApproval } from "../../api/approval.api";
import { generatePurchaseOrder } from "../../api/purchaseOrder.api";
import { useAuth } from "../../context/AuthContext";
import { ROLES, STATUS_COLORS } from "../../utils/constants";
import Card, { CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Textarea from "../../components/ui/Textarea";
import Modal from "../../components/ui/Modal";
import Table from "../../components/ui/Table";
import {
  ArrowLeft,
  Calendar,
  Layers,
  ChevronRight,
  TrendingDown,
  ShoppingBag,
  Award,
  Sparkles,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";

export default function RFQDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isSubmitQuoteOpen, setIsSubmitQuoteOpen] = useState(false);
  const [isRequestApprovalOpen, setIsRequestApprovalOpen] = useState(false);
  const [selectedQuotationForApproval, setSelectedQuotationForApproval] = useState(null);

  // Form hooks
  const { register: regQuote, handleSubmit: handleQuoteSubmit, watch: watchQuote, formState: { errors: errorsQuote }, reset: resetQuote } = useForm({
    defaultValues: { taxPercentage: 18.0 }
  });
  
  const { register: regApprove, handleSubmit: handleApproveSubmit, formState: { errors: errorsApprove }, reset: resetApprove } = useForm();

  const fetchRFQ = async () => {
    try {
      const res = await getRFQById(id);
      if (res.data?.success) {
        setRfq(res.data.data);
      }
    } catch (err) {
      console.error("Error loading RFQ details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchRFQ();
  }, [id]);

  if (loading) {
    return <div className="py-12 text-center text-gray-500">Loading RFQ details...</div>;
  }

  if (!rfq) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p className="mb-4">RFQ not found.</p>
        <Button onClick={() => navigate("/rfqs")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
        </Button>
      </div>
    );
  }

  const isVendor = user?.role === ROLES.VENDOR;
  const isOfficer = user?.role === ROLES.PROCUREMENT_OFFICER || user?.role === ROLES.ADMIN;

  // Watch unit price and calculate estimate total
  const watchPrice = watchQuote("price");
  const watchTax = watchQuote("taxPercentage");
  const estimatedTotal = (Number(watchPrice || 0) * rfq.quantity) * (1 + Number(watchTax || 18) / 100);

  // Vendor quotation submission
  const onSubmitQuotation = async (data) => {
    try {
      const res = await submitQuotation({
        rfqId: rfq.id,
        price: Number(data.price),
        taxPercentage: Number(data.taxPercentage),
        deliveryTimeline: data.deliveryTimeline,
        notes: data.notes,
        attachmentUrl: data.attachmentUrl || null,
      });

      if (res.data?.success) {
        setIsSubmitQuoteOpen(false);
        fetchRFQ();
      }
    } catch (err) {
      console.error("Quotation submission error:", err);
      alert(err.response?.data?.message || "Failed to submit quotation.");
    }
  };

  // Shortlist quotation
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

  // Trigger PO generation
  const handleGeneratePO = async (quotationId) => {
    try {
      const res = await generatePurchaseOrder({
        rfqId: rfq.id,
        quotationId,
      });

      if (res.data?.success) {
        const po = res.data.data;
        navigate(`/purchase-orders/${po.id}`);
      }
    } catch (err) {
      console.error("Generate PO error:", err);
      alert(err.response?.data?.message || "Failed to generate Purchase Order.");
    }
  };

  // Find vendor's own quotation if role is VENDOR
  const ownQuotation = isVendor
    ? rfq.quotations?.find((q) => q.vendor?.email === user?.email)
    : null;

  // Find lowest price quotation
  const lowestQuotation = (!isVendor && rfq.quotations?.length > 0)
    ? [...rfq.quotations].sort((a, b) => a.totalAmount - b.totalAmount)[0]
    : null;

  // Find approved quotation
  const approvedQuotation = rfq.quotations?.find((q) => q.status === "APPROVED");

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/rfqs")}
          className="p-2 bg-white rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{rfq.title}</h1>
          <p className="text-xs text-gray-400 mt-0.5">RFQ ID: {rfq.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RFQ details card */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardBody className="p-6 space-y-5">
              <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider">Specifications</h3>
              
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">STATUS</span>
                <span
                  className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    STATUS_COLORS[rfq.status] || "bg-gray-100 text-gray-800"
                  }`}
                >
                  {rfq.status}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold">Description</span>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{rfq.description}</p>
              </div>

              {rfq.attachmentUrl && (
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Attachment Reference</span>
                  <a
                    href={rfq.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary-600 hover:underline font-semibold flex items-center gap-1 mt-1 break-all"
                  >
                    View Attachment Spec
                  </a>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-100 py-4 text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Item Name</span>
                  <span className="font-semibold text-gray-800 block mt-0.5">{rfq.itemName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Category</span>
                  <span className="font-semibold text-gray-800 block mt-0.5">{rfq.category}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Demand Quantity</span>
                  <span className="font-semibold text-gray-800 block mt-0.5">{rfq.quantity} {rfq.unit}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Deadline Date</span>
                  <span className="font-semibold text-rose-600 block mt-0.5">
                    {new Date(rfq.deadline).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {isVendor && !ownQuotation && new Date() < new Date(rfq.deadline) && (
                <Button onClick={() => { resetQuote(); setIsSubmitQuoteOpen(true); }} className="w-full gap-2">
                  <ShoppingBag className="w-4 h-4" /> Submit quotation
                </Button>
              )}
            </CardBody>
          </Card>

          {/* Pending Approval Remarks info if any */}
          {rfq.approvals?.length > 0 && (
            <Card className="border-l-4 border-l-amber-500">
              <CardBody className="p-5 space-y-3">
                <h4 className="font-bold text-xs text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" /> Workflow Logs
                </h4>
                <div className="space-y-3 text-xs">
                  {rfq.approvals.map((app) => (
                    <div key={app.id} className="p-3 bg-slate-50 border border-gray-100 rounded-xl">
                      <div className="flex justify-between items-center font-semibold text-gray-700">
                        <span>Approval: {app.status}</span>
                        <span className="text-[10px] text-gray-400">{new Date(app.createdAt).toLocaleDateString()}</span>
                      </div>
                      {app.remarks && <p className="text-gray-500 mt-1">Remarks: "{app.remarks}"</p>}
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Vendor/Owner views */}
        <div className="lg:col-span-2 space-y-6">
          {isVendor ? (
            <Card>
              <CardBody className="p-6">
                <h3 className="font-bold text-sm text-gray-900 mb-4 uppercase tracking-wider">Your Submitted Quotation</h3>
                {!ownQuotation ? (
                  <div className="py-6 text-center text-xs text-gray-400 border border-dashed rounded-xl">
                    You have not submitted a quotation for this RFQ yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-gray-100 text-xs">
                      <div>
                        <span className="text-gray-400 block font-semibold uppercase">Unit Price Offer</span>
                        <span className="text-sm font-bold text-gray-800 mt-1 block">Rs. {ownQuotation.price.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-semibold uppercase">Tax Rate</span>
                        <span className="text-sm font-bold text-gray-800 mt-1 block">{ownQuotation.taxPercentage}%</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-semibold uppercase">Total Bid</span>
                        <span className="text-sm font-bold text-primary-600 mt-1 block">Rs. {ownQuotation.totalAmount.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-semibold uppercase">Quotation Status</span>
                        <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[ownQuotation.status]}`}>
                          {ownQuotation.status}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block font-semibold uppercase">Delivery Timeline</span>
                      <p className="text-xs text-gray-700 mt-1 font-medium">{ownQuotation.deliveryTimeline}</p>
                    </div>
                    {ownQuotation.notes && (
                      <div>
                        <span className="text-xs text-gray-400 block font-semibold uppercase">Remarks/Notes</span>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed italic">"{ownQuotation.notes}"</p>
                      </div>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          ) : (
            // Quotations side-by-side comparison for managers and officers
            <Card>
              <CardBody className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider">Quotation bids</h3>
                  {rfq.quotations?.length > 1 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5" /> Best Bid analysis enabled
                    </span>
                  )}
                </div>

                {(!rfq.quotations || rfq.quotations.length === 0) ? (
                  <div className="py-8 text-center text-xs text-gray-400 border border-dashed rounded-xl">
                    No supplier quotations received yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Table headers={["Supplier", "Unit Price", "Tax %", "Total Bid", "Timeline", "Status", "Actions"]}>
                      {rfq.quotations.map((quote) => {
                        const isLowest = lowestQuotation && quote.id === lowestQuotation.id;
                        const isApproved = quote.status === "APPROVED";
                        return (
                          <tr
                            key={quote.id}
                            className={`hover:bg-gray-50/50 transition-colors ${
                              isLowest ? "bg-emerald-50/20" : ""
                            } ${isApproved ? "bg-blue-50/25" : ""}`}
                          >
                            <td className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span>{quote.vendor?.companyName}</span>
                                {isLowest && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold flex items-center gap-0.5">
                                    ★ Lowest
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">Rs. {quote.price.toLocaleString()}</td>
                            <td className="px-6 py-4 text-xs text-gray-400 font-mono">{quote.taxPercentage}%</td>
                            <td className="px-6 py-4 font-bold text-primary-600">Rs. {quote.totalAmount.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">{quote.deliveryTimeline}</td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                                  STATUS_COLORS[quote.status] || "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {quote.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5">
                                {/* Shortlist button */}
                                {isOfficer && quote.status === "SUBMITTED" && (
                                  <Button size="xs" onClick={() => handleShortlist(quote.id)}>
                                    Shortlist
                                  </Button>
                                )}

                                {/* Request Approval button */}
                                {isOfficer && quote.status === "SHORTLISTED" && (
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedQuotationForApproval(quote);
                                      resetApprove();
                                      setIsRequestApprovalOpen(true);
                                    }}
                                  >
                                    Ask Approval
                                  </Button>
                                )}

                                {/* Generate PO button */}
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
                            </td>
                          </tr>
                        );
                      })}
                    </Table>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* Submit Quotation Modal */}
      <Modal isOpen={isSubmitQuoteOpen} onClose={() => setIsSubmitQuoteOpen(false)} title="Submit Quotation Bid" maxWidth="max-w-lg">
        <form onSubmit={handleQuoteSubmit(onSubmitQuotation)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Unit Price offer (Rs.)"
              type="number"
              placeholder="e.g. 45000"
              error={errorsQuote.price?.message}
              {...registerQuote("price", { required: "Price offer is required" })}
            />
            <Input
              label="Tax Rate Percentage (%)"
              type="number"
              step="0.1"
              placeholder="18"
              error={errorsQuote.taxPercentage?.message}
              {...registerQuote("taxPercentage", { required: "Tax Percentage is required" })}
            />
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between text-xs font-semibold">
            <span className="text-gray-500">Estimated Total (Qty: {rfq.quantity}):</span>
            <span className="text-primary-600 text-sm font-bold">Rs. {estimatedTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>

          <Input
            label="Delivery Timeline"
            placeholder="e.g. 5 business days after PO"
            error={errorsQuote.deliveryTimeline?.message}
            {...registerQuote("deliveryTimeline", { required: "Delivery timeline is required" })}
          />

          <Textarea
            label="Additional Notes / Remarks (Optional)"
            placeholder="Warranty details, payment queries, etc."
            {...registerQuote("notes")}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setIsSubmitQuoteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Submit Quotation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Request Approval Modal */}
      <Modal isOpen={isRequestApprovalOpen} onClose={() => setIsRequestApprovalOpen(false)} title="Request Manager Approval" maxWidth="max-w-lg">
        <form onSubmit={handleApproveSubmit(onSubmitApprovalRequest)} className="space-y-4">
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
            error={errorsApprove.remarks?.message}
            {...registerApprove("remarks", { required: "Rationale remarks are required for audit logs" })}
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
