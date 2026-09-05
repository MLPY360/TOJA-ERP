# TOJA ERP System — Architectural & Functional Deep-Dive & Strategic Feature Roadmap

**Author:** Lead Product Manager & Senior ERP Architect  
**Domain:** Apparel Supply Chain, E-Commerce & Omnichannel Retail Operations  
**Platform:** TOJA Selling System (React, Zustand, Firebase Firestore, Tailwind CSS)  
**Date:** September 2026  
**Document Version:** 1.0 (Production Blueprint)

---

## Executive Summary

The **TOJA Selling System** has established a solid, clean, and modern foundation for managing inventory, manual/online orders, financial expenses, and partner settlements. Built on React, Zustand, and Firestore real-time listeners, it features dynamic discounting, localized English/Arabic interfaces, WhatsApp dispatch messaging, and responsive desktop/mobile layouts.

However, as apparel e-commerce operations scale—particularly within the Cash-on-Delivery (COD) and fragmented courier ecosystem prevalent in Egypt and the MENA region—operational friction quickly emerges. The current system exhibits critical architectural gaps in:
1. **Returns, Exchanges, and Partial Deliveries** (all-or-nothing order states).
2. **Courier Cash Reconciliation** (lack of bulk settlement imports and courier payout tracking).
3. **Inventory Audit Trails & Flexible Variants** (hardcoded size matrices, missing stock adjustment logs, unrecorded shrinkage).
4. **CRM & COD Fraud Prevention** (absence of customer entities, blacklisting, and LTV metrics).
5. **Security & Granular Governance** (unrestricted hard deletions, lack of Role-Based Access Control).

This document delivers a comprehensive operational audit and actionable roadmap structured into **High Priority**, **Medium Priority**, and **Future Horizon** initiatives, paired with concrete Firestore schemas and architectural recommendations.

---

## 1. Current State Assessment

### Core Strengths of the Existing Platform
- **Real-Time Synchronous State:** Zustand integrated with Firestore `onSnapshot` listeners delivers instantaneous updates across orders, inventory, expenses, and audit logs without manual page refreshes.
- **End-to-End Financial Discount Engine:** Dynamic percentage and fixed discount calculations with sanity clamps (0–100%, subtotal caps), complete breakdown rendering, and net-profit revenue deductions.
- **Mobile-First Responsive UX:** Dual-mode layout featuring a full desktop table and dedicated portrait mobile cards displaying complete itemized product badges, one-touch WhatsApp messaging, and in-place status switches.
- **Integrated Partner Profit Ledger:** Native support for partner capital accounts, profit-share percentages, and withdrawal tracking directly linked to net operating profit.
- **Localized Bilingual Support:** Full English and Egyptian Arabic RTL/LTR toggling across all screens, inputs, and printable invoices.

---

## 2. Deep-Dive Domain Analysis & Critical Gaps

```
+----------------------------------------------------------------------------------------------------+
|                                    TOJA ERP ARCHITECTURAL DOMAINS                                  |
+---------------------------------+---------------------------------+--------------------------------+
| 1. LOGISTICS & ORDER LIFECYCLE  | 2. INVENTORY & SUPPLY CHAIN     | 3. CRM & COD RISK ENGINE       |
| - Courier Reconciliation        | - Multi-Variant Matrix          | - Customer Master Ledger       |
| - Returns & Exchanges (RMA)     | - Stock Adjustment Logs         | - Blacklisting & Fraud Score   |
| - 1-Click WhatsApp Pipelines    | - Low-Stock & Reorder Triggers  | - Customer Lifetime Value      |
+---------------------------------+---------------------------------+--------------------------------+
| 4. ADVANCED FINANCIALS          | 5. GOVERNANCE & RBAC            | 6. ANALYTICS & WAREHOUSING     |
| - Defect / Shrinkage Write-off  | - Soft Deletes & Tamper Audits  | - Blended ROAS & CAC Analysis  |
| - Multi-Batch Unit Costing      | - Role-Based Permissions (RBAC) | - SKU Velocity & ABC Analysis  |
+---------------------------------+---------------------------------+--------------------------------+
```

---

### Domain 1: Order Lifecycle & Logistics Operations

#### Current State:
- Orders have linear statuses: `Pending` → `Shipped` → `Delivered - Pending Cash` → `Delivered - Collected` (or `Delivered`, `Returned`, `Cancelled`).
- WhatsApp is triggered solely when switching to `Shipped`.
- A return simply restores sold units to inventory and adds shipping fee to `returnLosses`.

#### Critical Operational Bottlenecks:
1. **Exchanges (الاستبدال) Are Unrepresented:**
   - In apparel e-commerce, sizing exchanges represent **12% to 20%** of all orders. Currently, admins must either manually overwrite the existing order (distorting historical sales) or create a duplicate order with 0 shipping.
   - There is no concept of an **Exchange Order (RMA)** linked to an original order ID that simultaneously restocks the incoming returned size and deducts the outgoing replacement size.
2. **Partial Deliveries (استلام جزئي):**
   - If a customer orders 2 hoodies and only accepts 1 at the doorstep, the status cannot reflect partial fulfillment. Admins must choose between marking the whole order as Delivered or Returned.
3. **Courier / Shipping Reconciliation (تسوية تحصيلات شركات الشحن):**
   - Currently, orders sit in `Delivered - Pending Cash` until someone clicks each one individually to mark it `Delivered - Collected`.
   - Courier companies (Bosta, Mylerz, Aramex, J&T, Quick) provide settlement sheets (CSV/Excel) containing tracking numbers, collected amounts, and courier fees. Without a **Bulk Reconciliation Uploader**, matching 200 daily orders against courier payouts takes hours and leaves uncollected cash undetected.
4. **Limited WhatsApp Workflow:**
   - Only a single shipping notification exists. Critical conversion stages lack 1-click WhatsApp actions:
     - *Order Confirmation* (تاكيد الطلب قبل الشحن لتقليل نسبة المرتجعات).
     - *Out for Delivery Alert* (تذكير بالاستلام والمبلغ المطلوب).
     - *Failed Delivery Attempt Follow-up* (متابعة محاولة التسليم الفاشلة).

---

### Domain 2: Inventory & Stock Management

#### Current State:
- Fixed size schema `{ M, L, XL, XXL }`.
- Manual defect reporting (`reportDefectiveItem`) decrements `initialStock` by 1.
- Editing a product directly updates the `initialStock` numbers.

#### Critical Operational Bottlenecks:
1. **Rigid Size Matrix:**
   - Apparel lines frequently include `S`, `3XL`, `4XL`, `Oversized Free Size`, or accessories/caps that do not conform to `M–XXL`. Hardcoding sizes limits catalog expansion.
2. **Absence of Stock Adjustment History (سجل حركات المخزون):**
   - When stock changes from 50 to 45, there is zero record of *why*. Was it a count discrepancy? Theft? Gift to an influencer? Supplier shortage?
   - Any ERP must enforce an **Inventory Movement Ledger** (`inventory_movements`) tracking: `Type (Sale, Return, Manual Adjustment, Defect, Purchase Order)`, `Delta (+/-)`, `Reason`, `Timestamp`, and `Admin UID`.
3. **No Low-Stock / Stockout Warnings:**
   - Admins only notice an item is out of stock when trying to pack an order. There are no visual badges or threshold notifications (e.g. alert when `sizeStock <= 2`).
4. **Single Static Cost Price:**
   - Fabric and manufacturing costs fluctuate per production run (e.g. Run 1 cost 180 EGP, Run 2 cost 220 EGP). Relying on a single flat `costPrice` skews gross profit margins over time.

---

### Domain 3: Customer Relationship Management (CRM) & COD Fraud Engine

#### Current State:
- Customer data is unstructured plain text duplicated on each order (`customerName`, `phone`, `address`, `governorate`).
- No standalone `customers` collection exists.

#### Critical Operational Bottlenecks:
1. **COD Return-to-Origin (RTO) Risk & Fraud Prevention:**
   - In Egyptian Cash-on-Delivery, non-serious buyers, serial rejectors, and fake phone numbers cause substantial shipping losses (30–90 EGP wasted per return).
   - Currently, an abusive customer who rejected 3 orders can place a 4th order without any warning in the ERP.
2. **Missing Customer Metrics (LTV, AOV, Order Frequency):**
   - The team cannot identify VIP customers (e.g. bought > 5 times) to offer free shipping or priority fulfillment, nor can they filter by acquisition source.

---

### Domain 4: Financials, Accounting & Cost Attribution

#### Current State:
- Operating expenses (Ads, Packaging, Fixed, Other) are logged and subtracted from delivered orders gross profit.
- Partner settlements calculate payout balances based on net operating profit.

#### Critical Operational Bottlenecks:
1. **Defective Items & Shrinkage Cost Unaccounted:**
   - When `reportDefectiveItem` reduces stock, the lost cost price is not posted as a write-off expense in the financial ledger. The profit statement fails to reflect damaged goods losses.
2. **Courier Shipping Discrepancies:**
   - If the customer was charged 50 EGP shipping, but the courier invoiced 65 EGP due to overweight or remote zones, the 15 EGP difference is lost in the current calculation.
3. **Marketing ROI & Blended CAC:**
   - Ad expenses are recorded as an aggregate number, unconnected to order volume or dates, preventing calculation of Customer Acquisition Cost (CAC) per order or Return on Ad Spend (ROAS).

---

### Domain 5: Security, Governance & Audit Trails

#### Current State:
- Any logged-in user has unrestricted access to all modules, including partner financials, profit figures, and database deletion.
- Orders can be permanently deleted with `deleteDoc` without restoring stock or maintaining an audit log.

#### Critical Operational Bottlenecks:
1. **Destructive Hard Deletes Without Inventory Rollback:**
   - Clicking "Delete Order" wipes the document from Firestore. The items deducted from inventory remain deducted, creating an invisible stock phantom.
   - Deletions must be converted to **Soft Deletes** (`isDeleted: true`) with automated inventory reversal and mandatory audit logging.
2. **Missing Role-Based Access Control (RBAC):**
   - Operations teams (packers, customer service reps) need access to Orders and Inventory, but should **never** see partner profit shares, treasury balances, product cost prices, or net profit margins.
   - A multi-tier permission structure (`Admin`, `Operations / Order Fulfillment`, `Finance / Partner`, `Customer Service`) is essential.

---

## 3. Prioritized Strategic Roadmap

```
+----------------------------------------------------------------------------------------------------+
|                                      IMPLEMENTATION ROADMAP                                        |
+----------------------------------------------------------------------------------------------------+
| PHASE 1: IMMEDIATE STABILIZATION (Weeks 1-3)                                                      |
| [P0] Soft Deletes & Inventory Integrity on Order Cancellation/Deletion                             |
| [P0] Low-Stock Alerts & Stockout Badges on Inventory Table & Order Modals                          |
| [P0] Customer COD Blacklist & Fraud Prevention Badges                                              |
| [P0] WhatsApp Multi-Template Pipeline (Confirmation, Dispatch, Follow-up)                         |
+----------------------------------------------------------------------------------------------------+
| PHASE 2: OPERATIONAL EFFICIENCY (Weeks 4-7)                                                       |
| [P1] Dedicated Exchange (RMA) & Partial Delivery Workflow                                         |
| [P1] Bulk Courier Cash Settlement Import (Excel/CSV reconciliation)                                |
| [P1] Stock Movement Audit Ledger (Manual adjustment reasons & defective item write-offs)           |
| [P1] Role-Based Access Control (RBAC) hiding costs/profits from fulfillment agents                |
+----------------------------------------------------------------------------------------------------+
| PHASE 3: ADVANCED SCALE & AUTOMATION (Weeks 8-12)                                                  |
| [P2] Customer Master Profile (LTV, Order History, Repeat Buyer Badging)                            |
| [P2] Flexible Product Variants (Dynamic sizes & colors beyond M-XXL)                               |
| [P2] Automated Courier API Integrations (Bosta / Mylerz AWB generation)                            |
| [P2] Advanced Financial Analytics (Unit Economics, Blended CAC, Ad-spend ROI)                      |
+----------------------------------------------------------------------------------------------------+
```

---

## 4. Detailed Feature Specifications

### 4.1. Phase 1: Immediate Stabilization (High Priority)

#### Feature 1.1: Customer Blacklist & Fraud Prevention System (سجل الحظر ومكافحة الأوردرات الوهمية)
- **Problem:** Fake orders and frequent rejectors drain logistics budgets with return shipping fees.
- **Functional Behavior:**
  - Introduce a blacklist toggle on any customer or order with reasons (e.g. "Refused delivery twice", "Fake address", "Non-responsive").
  - In `AddOrderModal`, entering a blacklisted phone number triggers an immediate prominent warning banner:  
    `⚠️ تحذير: هذا العميل مسجل في القائمة السوداء (نسبة استلام سابقة 0%). يتطلب دفع مسبق.`
  - In `OrdersView`, orders with suspicious or blacklisted phone numbers display a red warning badge `High Return Risk`.

#### Feature 1.2: Low-Stock Alerts & Depletion Badges (تنبيهات نقص المخزون)
- **Problem:** Orders are created for items that are depleted, causing customer friction and cancellations.
- **Functional Behavior:**
  - Each size with `currentStock <= 2` displays a vibrant warning badge in `InventoryTable` (amber for low stock, red for sold out).
  - Top metric card on Dashboard: `Low Stock Items` showing total SKUs requiring replenishment.
  - In `AddOrderModal`, selecting a size with 0 available stock disables the item and shows `Out of stock / غير متوفر`.

#### Feature 1.3: Expanded 1-Click WhatsApp Pipeline (منظومة رسائل الواتساب السريعة)
- **Problem:** Currently, WhatsApp is only accessible after shipping. Confirmation before dispatch is the single highest-impact tool to reduce COD return rates.
- **Templates Added:**
  1. **Order Confirmation (Pending):**  
     `أهلاً يا {name} 👋 بخصوص طلبك من TOJA رقم {orderId} بقيمة {total} ج.م. برجاء تأكيد المقاسات والعنوان لشحن الطلب.`
  2. **Dispatched (Shipped):**  
     `أوردرك من TOJA خرج مع مندوب الشحن وبإذن الله يوصلك خلال 48 ساعة! الإجمالي المطلوب: {total} ج.م.`
  3. **Delivery Follow-up / Post-Delivery:**  
     `أهلاً يا {name}! نتمنى يكون الأوردر عجبك واستلمته تمام. لو محتاج استبدال مقاس إحنا معاك دائماً!`

#### Feature 1.4: Safe Soft-Deletes & Inventory Rollback
- **Problem:** Deleting an order leaves stock permanently deducted and leaves no audit trail.
- **Functional Behavior:**
  - Replace `deleteDoc` with `updateDoc(orderRef, { isDeleted: true, deletedAt, deletedBy })`.
  - Automatically revert the `sold` counts for all items in the deleted order if the order was active.
  - Write an entry to `activityLogs`: `User X soft-deleted Order ORD-1234 (Inventory restored)`.

---

### 4.2. Phase 2: Operational Efficiency (Medium Priority)

#### Feature 2.1: Formal Returns, Exchanges & Partial Delivery Workflow (نظام الاستبدال والمرتجع الجزئي)
- **Problem:** Exchanges represent 15%+ of apparel operations and cannot be handled cleanly.
- **Functional Behavior:**
  - Add action: `Create Exchange / استبدال`:
    - Select incoming item (e.g. Hoodie Black Size M) → automatically added back to stock once marked "Received".
    - Select outgoing replacement item (e.g. Hoodie Black Size L) → deducted from stock immediately.
    - Set exchange shipping fee (e.g. 35 EGP or free).
    - Links the exchange order directly to the original order ID.
  - Add action: `Partial Delivery / تسليم جزئي`:
    - Checkbox next to each line item: `Accepted` or `Returned`.
    - Automatically updates order total, deducts only kept items' revenue, and restocks rejected items.

#### Feature 2.2: Courier Cash Reconciliation Module (تسوية حسابات شركات الشحن)
- **Problem:** Hundreds of orders in `Delivered - Pending Cash` require manual verification against courier cash transfers.
- **Functional Behavior:**
  - **Upload Settlement Sheet (Excel/CSV):** Admin uploads courier payout sheet.
  - System matches orders by Tracking Number or Custom Order ID.
  - Generates a **Reconciliation Audit Report**:
    - Orders matched & marked `Delivered - Collected`.
    - Discrepancies flagged (e.g. Courier collected 600 EGP instead of 650 EGP).
    - Courier shipping fee variances logged directly to expenses.
  - One-click confirmation transfers pending cash directly to treasury.

#### Feature 2.3: Stock Adjustment & Defect Write-off Ledger (سجل حركات المخزون والمصروفات التالفة)
- **Problem:** Manual stock changes have no accountability, and defective garment costs are not logged as financial losses.
- **Functional Behavior:**
  - Clicking "Adjust Stock" opens a modal requiring: `Size`, `Quantity Change (+/-)`, `Reason (Restock, Defective, Inventory Count Correction, Sample/Gift)`.
  - When marking an item as defective, the system logs an automatic expense in `expenses`:
    - Category: `Defective Stock Write-Off`
    - Amount: `product.costPrice * qty`
    - Deducted directly from Net Operating Profit.

#### Feature 2.4: Role-Based Access Control (RBAC) (صلاحيات المستخدمين)
- **Problem:** Operational staff can view partner payouts, net profit, and product manufacturing costs.
- **Roles Defined:**
  1. **Super Admin / Owner:** Full access to all modules, partners, finance, margins, and settings.
  2. **Operations & Fulfillment:** Can view/edit orders, update shipping statuses, view stock counts, but **cannot view** Cost Price, Gross/Net Profit, or Finance tab.
  3. **Finance & Accounting:** Access to Orders, Expenses, Cash Treasury, Courier Reconciliation, and Partner Reports.

---

### 4.3. Phase 3: Advanced Scale & Automation (Future Horizon)

#### Feature 3.1: Customer 360 Master Profile (الملف التعريفي الشامل للعميل)
- Automatic aggregation of orders by customer phone number into a dedicated `customers` collection.
- Displays:
  - Total Orders Placed vs Total Delivered (Delivery Success Rate %).
  - Total Lifetime Value (LTV in EGP).
  - Preferred sizes (e.g. "Usually orders XL").
  - Behavioral tags: `VIP (عميل مميز)`, `Reliable (ملتزم)`, `At-Risk (مرتجع متكرر)`, `Blacklisted (محظور)`.

#### Feature 3.2: Automated Courier API Integration (Bosta / Mylerz / J&T)
- Direct API integration with courier services:
  - 1-click `Create Courier Shipment (بوليصة الشحن)` directly from `OrdersView`.
  - Automated tracking number generation and printable Air Waybill (AWB) thermal stickers (4x6 format).
  - Webhook listener updating order status to `Delivered` or `Returned` automatically upon courier scan.

#### Feature 3.3: Advanced Unit Economics & Marketing Attribution
- Input daily ad spend per platform (Meta Ads, TikTok Ads).
- Live calculation of **Customer Acquisition Cost (CAC)**:  
  $$\text{CAC} = \frac{\text{Total Ad Spend}}{\text{Delivered Orders}}$$
- **Return on Ad Spend (ROAS)** and True Net Contribution Margin after ad costs and return losses.

---

## 5. Concrete Technical & Database Schema Specifications

To implement these recommendations without breaking backward compatibility, the following Firestore schemas should be adopted:

### 5.1. New Collection: `customers`
```typescript
interface CustomerDocument {
  id: string;                      // Normalized Phone Number (e.g., "01012345678")
  fullName: string;
  phone: string;
  whatsappPhone: string;
  governorate: string;
  defaultAddress: string;
  metrics: {
    totalOrdersCount: number;
    deliveredOrdersCount: number;
    returnedOrdersCount: number;
    cancelledOrdersCount: number;
    deliverySuccessRate: number;   // (delivered / total) * 100
    totalSpendLTV: number;         // Net delivered spending
    averageOrderValue: number;
  };
  riskStatus: 'trusted' | 'neutral' | 'high_risk' | 'blacklisted';
  blacklistReason?: string;
  internalNotes: string[];
  createdAt: string;               // ISO 8601
  updatedAt: string;
}
```

### 5.2. New Collection: `inventory_movements`
```typescript
interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  size: string;                    // 'M' | 'L' | 'XL' | 'XXL' | string
  changeType: 'ORDER_SALE' | 'ORDER_RETURN' | 'EXCHANGE_IN' | 'EXCHANGE_OUT' | 'MANUAL_RESTOCK' | 'DEFECT_WRITEOFF' | 'AUDIT_CORRECTION';
  quantityDelta: number;           // e.g., -1, +5
  previousStock: number;
  newStock: number;
  relatedOrderId?: string;
  reason?: string;
  costImpactEGP?: number;          // costPrice * delta for write-offs
  performedBy: {
    uid: string;
    name: string;
    email: string;
  };
  timestamp: string;               // ISO 8601
}
```

### 5.3. Updated Collection: `orders` (Schema Additions)
```typescript
interface OrderAdditions {
  // Existing fields: customerName, phone, items, subtotal, discount, total, status, etc.
  
  // New Fields:
  orderType: 'standard' | 'exchange' | 'partial_return';
  parentOrderId?: string;          // If this is an exchange or replacement order
  
  courierDetails?: {
    carrierName: 'Bosta' | 'Mylerz' | 'Aramex' | 'J&T' | 'Internal' | string;
    trackingNumber: string;
    airWaybillUrl?: string;
    settlementBatchId?: string;    // ID of courier reconciliation batch
    courierActualShippingCost?: number;
    cashCollectedByCourier?: number;
  };

  items: Array<{
    productId: string;
    productName?: string;
    size: string;
    qty: number;
    unitPrice: number;
    itemStatus: 'accepted' | 'returned' | 'exchanged' | 'pending'; // For partial deliveries
  }>;

  isDeleted?: boolean;             // Soft delete flag
  deletedAt?: string;
  deletedBy?: string;
  
  customerRiskScore?: 'low' | 'medium' | 'high';
}
```

### 5.4. New Collection: `courier_settlements`
```typescript
interface CourierSettlement {
  id: string;
  carrierName: string;
  batchNumber: string;
  settlementDate: string;
  totalOrdersIncluded: number;
  totalCollectedCash: number;
  totalCarrierFees: number;
  netPayoutToTreasury: number;
  status: 'draft' | 'reconciled' | 'disputed';
  reconciledOrders: string[];      // Array of order IDs
  unmatchedRows: Array<{
    trackingNumber: string;
    amount: number;
    reason: string;
  }>;
  uploadedBy: string;
  createdAt: string;
}
```

---

## 6. Implementation Architecture & Execution Sequence

```
  [WEEK 1] ─── Safety & Fraud Mitigation
    ├── Implement Soft Deletes & Inventory Auto-Restoration on Order Deletion
    ├── Implement Customer Blacklist Flagging & Phone-Check in AddOrderModal
    └── Add Low-Stock Thresholds & Badges (< 3 units) on Inventory Table

  [WEEK 2] ─── Logistics Communication & Accuracy
    ├── Implement 1-Click Pre-Dispatch WhatsApp Confirmation Template
    ├── Implement 1-Click Post-Dispatch & Tracking Message
    └── Auto-Expense Logging for Defective Item Write-offs in FinanceView

  [WEEK 3-4] ─── RMA & Courier Operations
    ├── Build Exchange (استبدال) Flow linking new orders to parent orders
    ├── Build Courier Settlement CSV Reconciliation Upload Tool
    └── Implement Partial Deliveries Line-Item Checkboxes

  [WEEK 5+] ─── Governance & Intelligence
    ├── Implement Role-Based Access Control (RBAC) in Store & UI
    ├── Develop Customer 360 Master View (LTV, Success Rate)
    └── Integrate Courier API (Bosta / Mylerz AWB Sticker Generator)
```

---

## Conclusion & Next Steps

The TOJA ERP is well-positioned to evolve from a basic selling system into an enterprise-grade apparel operations platform. Implementing **Phase 1** immediately addresses the daily friction of COD fraud, depleted sizes, and stock discrepancies, directly saving cash and protecting net margins.

The development team can proceed with Phase 1 feature implementation sequentially as outlined in the technical architecture above.
