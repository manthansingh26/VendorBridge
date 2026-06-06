import api from "./axios";

export const getInvoices = (params) => api.get("/invoices", { params });
export const getInvoiceById = (id) => api.get(`/invoices/${id}`);
export const generateInvoice = (data) => api.post("/invoices", data);
export const emailInvoice = (id) => api.post(`/invoices/${id}/send-email`);
export const updateInvoiceStatus = (id, status) => api.patch(`/invoices/${id}/status`, { status });
export const getInvoicePDFUrl = (id) => `${api.defaults.baseURL}/invoices/${id}/pdf`;
export const getInvoicePDF = (id) => api.get(`/invoices/${id}/pdf`, { responseType: "blob" });
