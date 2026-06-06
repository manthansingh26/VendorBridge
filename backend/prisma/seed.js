const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding started...");

  // Clear existing logs & transactions (safest order)
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.rFQVendor.deleteMany();
  await prisma.rFQ.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();

  console.log("Existing data cleared.");

  // Password hashing
  const adminPassword = await bcrypt.hash("admin123", 12);
  const procurementPassword = await bcrypt.hash("procurement123", 12);
  const managerPassword = await bcrypt.hash("manager123", 12);
  const vendorPassword = await bcrypt.hash("vendor123", 12);

  // 1. Create Users
  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@admin.com",
      username: "admin",
      phone: "9999999999",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  const procurement = await prisma.user.create({
    data: {
      name: "Procurement Officer",
      email: "procurement@vendorbridge.com",
      username: "procurement",
      phone: "8888888888",
      password: procurementPassword,
      role: "PROCUREMENT_OFFICER",
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: "Manager User",
      email: "manager@vendorbridge.com",
      username: "manager",
      phone: "7777777777",
      password: managerPassword,
      role: "MANAGER",
    },
  });

  // Create 3 Vendor Users
  const vendorUser1 = await prisma.user.create({
    data: {
      name: "Acme Corp Agent",
      email: "vendor@vendorbridge.com",
      username: "vendor",
      phone: "6666666666",
      password: vendorPassword,
      role: "VENDOR",
    },
  });

  const vendorUser2 = await prisma.user.create({
    data: {
      name: "Techno Solutions Agent",
      email: "techno@vendorbridge.com",
      username: "techno",
      phone: "5555555555",
      password: vendorPassword,
      role: "VENDOR",
    },
  });

  const vendorUser3 = await prisma.user.create({
    data: {
      name: "Future Systems Agent",
      email: "future@vendorbridge.com",
      username: "future",
      phone: "4444444444",
      password: vendorPassword,
      role: "VENDOR",
    },
  });

  console.log("Users seeded successfully.");

  // 2. Create Vendor Profiles
  const vendorAcme = await prisma.vendor.create({
    data: {
      companyName: "Acme Corporation",
      contactPerson: "John Doe",
      email: "vendor@vendorbridge.com",
      phone: "6666666666",
      gstNumber: "27AAAAA1111A1Z1",
      category: "IT Equipment",
      address: "123 Technology Way",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      status: "ACTIVE",
      rating: 4.8,
    },
  });

  const vendorTechno = await prisma.vendor.create({
    data: {
      companyName: "Techno Solutions Ltd",
      contactPerson: "Sarah Connor",
      email: "techno@vendorbridge.com",
      phone: "5555555555",
      gstNumber: "27BBBBB2222B2Z2",
      category: "IT Equipment",
      address: "456 Silicon Valley",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      status: "ACTIVE",
      rating: 4.2,
    },
  });

  const vendorFuture = await prisma.vendor.create({
    data: {
      companyName: "Future Systems",
      contactPerson: "Mark Marcus",
      email: "future@vendorbridge.com",
      phone: "4444444444",
      gstNumber: "27CCCCC3333C3Z3",
      category: "IT Equipment",
      address: "789 Cyber Plaza",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560001",
      status: "ACTIVE",
      rating: 4.5,
    },
  });

  console.log("Vendor profiles seeded successfully.");

  // 3. Seed RFQ 1 (Completed Cycle: RFQ -> Quotes -> Approved -> PO -> Paid Invoice)
  const rfq1 = await prisma.rFQ.create({
    data: {
      title: "Procurement of Laptops for Engineering Team",
      description: "We require 15 high-performance laptops with 32GB RAM and 1TB SSD.",
      itemName: "Developer Laptops",
      quantity: 15,
      unit: "Units",
      category: "IT Equipment",
      deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Ended 2 days ago
      status: "APPROVED",
      createdById: procurement.id,
    },
  });

  // Assignments
  await prisma.rFQVendor.createMany({
    data: [
      { rfqId: rfq1.id, vendorId: vendorAcme.id },
      { rfqId: rfq1.id, vendorId: vendorTechno.id },
      { rfqId: rfq1.id, vendorId: vendorFuture.id },
    ],
  });

  // Quotations for RFQ 1
  const quoteAcme = await prisma.quotation.create({
    data: {
      rfqId: rfq1.id,
      vendorId: vendorAcme.id,
      price: 85000,
      taxPercentage: 18.0,
      totalAmount: 1504500, // (85000 * 15) * 1.18
      deliveryTimeline: "7 Days",
      paymentTerms: 30,
      notes: "Acme special batch discount applied.",
      status: "APPROVED",
    },
  });

  const quoteTechno = await prisma.quotation.create({
    data: {
      rfqId: rfq1.id,
      vendorId: vendorTechno.id,
      price: 92000,
      taxPercentage: 18.0,
      totalAmount: 1628400,
      deliveryTimeline: "10 Days",
      paymentTerms: 45,
      notes: "Includes 2 year onsite hardware warranty.",
      status: "REJECTED",
    },
  });

  const quoteFuture = await prisma.quotation.create({
    data: {
      rfqId: rfq1.id,
      vendorId: vendorFuture.id,
      price: 89000,
      taxPercentage: 18.0,
      totalAmount: 1575300,
      deliveryTimeline: "5 Days",
      paymentTerms: 30,
      notes: "Quick dispatch systems ready in warehouse.",
      status: "REJECTED",
    },
  });

  // Approval Request for Quote 1 (Approved)
  const approval1 = await prisma.approval.create({
    data: {
      rfqId: rfq1.id,
      quotationId: quoteAcme.id,
      requestedById: procurement.id,
      approverId: manager.id,
      status: "APPROVED",
      remarks: "Authorized. Acme offered the lowest bid value and satisfies all hardware parameters.",
    },
  });

  // Purchase Order
  const po1 = await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-2026-001",
      rfqId: rfq1.id,
      quotationId: quoteAcme.id,
      vendorId: vendorAcme.id,
      generatedById: procurement.id,
      itemName: "Developer Laptops",
      quantity: 15,
      unitPrice: 85000,
      taxAmount: 229500,
      totalAmount: 1504500,
      status: "COMPLETED",
    },
  });

  // Paid Invoice
  const invoice1 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2026-001",
      poId: po1.id,
      vendorId: vendorAcme.id,
      amount: 1275000,
      taxAmount: 229500,
      totalAmount: 1504500,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: "PAID",
    },
  });


  // 4. Seed RFQ 2 (Pending Cycle: RFQ -> Quotes -> Pending Manager Approval)
  const rfq2 = await prisma.rFQ.create({
    data: {
      title: "Procurement of Gigabit Networking Switches",
      description: "We require 5 units of managed gigabit switches for server room upgrade.",
      itemName: "Gigabit Switches",
      quantity: 5,
      unit: "Units",
      category: "IT Equipment",
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Ends in 5 days
      status: "APPROVAL_PENDING",
      createdById: procurement.id,
    },
  });

  // Assignments
  await prisma.rFQVendor.createMany({
    data: [
      { rfqId: rfq2.id, vendorId: vendorAcme.id },
      { rfqId: rfq2.id, vendorId: vendorTechno.id },
    ],
  });

  // Quotations for RFQ 2
  const quoteAcme2 = await prisma.quotation.create({
    data: {
      rfqId: rfq2.id,
      vendorId: vendorAcme.id,
      price: 12000,
      taxPercentage: 18.0,
      totalAmount: 70800, // (12000 * 5) * 1.18
      deliveryTimeline: "3 Days",
      paymentTerms: 15,
      notes: "Standard Cisco switches pricing.",
      status: "SHORTLISTED",
    },
  });

  const quoteTechno2 = await prisma.quotation.create({
    data: {
      rfqId: rfq2.id,
      vendorId: vendorTechno.id,
      price: 15000,
      taxPercentage: 18.0,
      totalAmount: 88500,
      deliveryTimeline: "4 Days",
      paymentTerms: 30,
      notes: "Includes setup and network configurations support.",
      status: "SUBMITTED",
    },
  });

  // Pending Approval Request
  const approval2 = await prisma.approval.create({
    data: {
      rfqId: rfq2.id,
      quotationId: quoteAcme2.id,
      requestedById: procurement.id,
      status: "PENDING",
      remarks: "Shortlisted Acme as they are cheaper and provide faster turnaround time.",
    },
  });


  // 5. Seed Activity Logs
  await prisma.activityLog.createMany({
    data: [
      {
        userId: procurement.id,
        action: "CREATE",
        module: "RFQ",
        description: "Created Request for Quotation (RFQ) for Developer Laptops",
      },
      {
        userId: vendorUser1.id,
        action: "SUBMIT",
        module: "RFQ",
        description: "Submitted quotation bid of Rs. 1,504,500 for Developer Laptops",
      },
      {
        userId: procurement.id,
        action: "SUBMIT",
        module: "APPROVAL",
        description: "Requested manager approval sign-off on Acme Corp bid for Developer Laptops",
      },
      {
        userId: manager.id,
        action: "APPROVE",
        module: "APPROVAL",
        description: "Approved Acme Corp quotation for Developer Laptops and generated PO-2026-001",
      },
      {
        userId: vendorUser1.id,
        action: "CREATE",
        module: "INVOICE",
        description: "Submitted Invoice INV-2026-001 for Purchase Order PO-2026-001",
      },
    ],
  });

  console.log("Activity logs and full transaction cycle seeded successfully.");
  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
