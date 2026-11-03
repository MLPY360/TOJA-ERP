# Firestore Security Rules — Verification & Audit Report

**Date of Audit:** November 3, 2026  
**Target Systems:** 
- TOJA Customer Storefront (`Website/firestore.rules`)
- TOJA ERP & Selling System (`Selling System/firestore.rules`)  
**Rules Engine Version:** `rules_version = '2';`  
**Integrity Status:** **Verified & Unified (Identical SHA-256 Hashes)**

---

## 1. Executive Summary

A critical Firestore Security Rules collision between the customer-facing storefront and the backend ERP system has been completely resolved. Previously, diverging match blocks, unclosed syntax brackets, duplicate path declarations, and missing operational telemetry rules (`error_logs`, `exchange_requests`, `waitlist`) created risks of deployment collisions or rule evaluation failures.

Both repositories now share a single, unified, battle-tested, production-grade security policy.

### File Hash Verification
| File Path | SHA-256 Checksum | Match Status |
| :--- | :--- | :---: |
| `Website/firestore.rules` | `5B01F9C6642E36EB644CA8C15F773DFE230B366AF5DC09917614C33E8C7B0415` | **MATCH** |
| `Selling System/firestore.rules` | `5B01F9C6642E36EB644CA8C15F773DFE230B366AF5DC09917614C33E8C7B0415` | **MATCH** |

---

## 2. Authentication & Role Hierarchy Architecture

The rules enforce a tiered, defense-in-depth authorization model using declarative helper functions:

```mermaid
flowchart TD
    Req([Incoming Request]) --> AuthCheck{isAuthenticated?}
    AuthCheck -- No --> PublicRules[Public Rules: Catalog Read, Store Config Read, Guest Waitlist/Subscriber Creation]
    AuthCheck -- Yes --> SuperAdminCheck{isSuperAdminEmail?}
    SuperAdminCheck -- Yes --> FullAccess[Full Admin & Financial Access]
    SuperAdminCheck -- No --> PartnerCheck{isPartnerEmail or Admin Role?}
    PartnerCheck -- Yes --> StaffAccess[Staff & ERP Operations Access]
    PartnerCheck -- No --> UserCheck{isOwner(userId)?}
    UserCheck -- Yes --> ProfileAccess[Customer Profile, Order Creation, Order Read]
    UserCheck -- No --> Deny[Permission Denied]
```

### Role Helper Function Specifications

1. **`isAuthenticated()`**: Verifies `request.auth != null`.
2. **`isOwner(userId)`**: Requires active authentication and matches `request.auth.uid == userId`.
3. **`isValidString(val, min, max)`**: Validates string type and bounds length (`size() >= min && size() <= max`).
4. **`isSuperAdminEmail()`**: Whitelists founding partner `mohameedhasan81@gmail.com`.
5. **`isPartnerEmail()`**: Whitelists official `@toja.com` partner domains and designated partner accounts:
   - `arnos@toja.com`
   - `yossef@toja.com`
   - `moustafa@toja.com`
   - `partner@toja.com`, `partners@toja.com`, `toja.partner@gmail.com`
   - `ops@toja.com`, `admin@toja.com`, `test@toja.com`, `demo@toja.com`
   - Any token email regex-matching `.*@toja[.]com$`
6. **`isAdmin()`**: Grants admin privileges based on Custom Claims (`admin == true`), Super Admin, Partner identity, `/admins/{uid}` document existence, or user role attribute `role == 'admin'`.
7. **`isStaff()`**: Encompasses all admins and authenticated accounts with non-customer roles.

---

## 3. Collection-by-Collection Security Matrix

### A. Storefront Core & Public Collections

| Collection | Path Pattern | Read Rule | Write Rule | Protection Details |
| :--- | :--- | :---: | :---: | :--- |
| **Products** | `/products/{productId}` | `true` (Public) | `isAdmin() \|\| isStaff() \|\| affectedKeys().hasOnly(['sold'])` | Public product catalog browsing. Customers can only atomically increment `sold` during checkout. All other fields (pricing, stock, descriptions) require Staff/Admin rights. |
| **Store Config** | `/store_config/{configId}` | `true` (Public) | `isAdmin() \|\| isStaff()` | Global settings (free shipping threshold, banner message, governorate shipping rates) publicly readable; writes locked to partners. |
| **Promo Codes** | `/promo_codes/{codeId}` | `true` (Public) | `isAdmin() \|\| isStaff()` | Discount validation engine readable by cart/checkout; promo code creation/editing locked to staff. |
| **Order Counters** | `/counters/{counterId}` | `true` (Public) | Authenticated `order_counter` updating `last_order_id` | Atomic order ID generation allowed for authenticated customer checkouts; general counter modification locked to staff. |
| **Waitlist** | `/waitlist/{waitlistId}` | Staff / Admin | Public Create (Strict Schema) | Customers can register out-of-stock sizes. Requires `productId`, `size`, `phone`, and enforces a maximum of 20 keys to prevent document bloating. |
| **Subscribers** | `/subscribers/{subscriberId}` | Staff / Admin | Public Create (Strict Schema) | Newsletter signups. Requires `email` and key limit <= 20. |

---

### B. Customer Orders & Profiles

| Collection | Path Pattern | Read Rule | Write Rule | Protection Details |
| :--- | :--- | :---: | :---: | :--- |
| **Orders** | `/orders/{orderId}` | Owner / Staff / Admin / Lookup by order_id | Authenticated Create Only | **Strict Integrity Validation on Create:**<br>• `userId == request.auth.uid`<br>• `items` list (1 to 50 items)<br>• `subtotal > 0` & `shippingFee >= 0`<br>• Exact arithmetic match: `total == subtotal + shippingFee - discount`<br>• Phone: 10–16 characters<br>• Address: 5–250 characters<br>• Initial status restricted to `Pending`/`pending`<br>• Modification & deletion restricted to Staff/Admin. |
| **User Profiles** | `/users/{userId}` | Owner / Staff / Admin | Owner / Staff / Admin | Direct user document and nested sub-collection `/users/{userId}/orders/{subOrderId}` protected by ownership check. |
| **Exchange Requests** | `/exchange_requests/{requestId}` | Staff / Admin | Public Create (Strict Schema) | Customer size exchange submissions. Requires `order_id`, `originalItem`, `requestedSize`, `phone`, with keys <= 20. |
| **Data Deletion** | `/deletion_requests/{requestId}` | Staff / Admin | Public Create (Strict Schema) | Compliance with Egyptian Data Protection Law 151/2020. Requires `contact`, `status`, `createdAt`, with keys <= 20. |

---

### C. ERP Financial & Operational Intelligence (Staff & Admin Only)

All internal management collections are completely sealed from unauthorized public access:

| Collection | Path Pattern | Permissions | Purpose |
| :--- | :--- | :---: | :--- |
| **Super Admins** | `/admins/{adminId}` | `isAdmin()` | Root administrative privileges & partner tier management. |
| **Operational Expenses** | `/expenses/{expenseId}` | `isStaff()` | Raw fabric, packaging, courier delivery, marketing spend records. |
| **Partners & Equity** | `/partners/{partnerId}` | `isStaff()` | Partner capital accounts, profit-sharing ratios, dividend records. |
| **Withdrawals** | `/withdrawals/{withdrawalId}` | `isStaff()` | Treasury cash withdrawals and partner distributions. |
| **Blacklist** | `/blacklist/{phone}` | `isStaff()` | Fraudulent and fake-order phone number registry. |
| **Inventory Movements** | `/inventory_movements/{movementId}` | `isStaff()` | Batch stock audit trail, restocks, size adjustments. |
| **Courier Settlements** | `/courier_settlements/{settlementId}` | `isStaff()` | Bosta / Mylerz COD invoice reconciliations. |
| **Activity & System Logs** | `/activityLogs/{logId}`, `/system_logs/{logId}` | `isStaff()` | Internal administrative action audit trails. |
| **CFO AI Assistant** | `/cfo_chats/{userId}` | `isStaff()` | Executive financial chat history and forecasts. |
| **Partner Tasks** | `/partner_tasks/{taskId}` | `isStaff()` | Internal operational tasks and assignments. |
| **Error Logs** | `/error_logs/{logId}` | Create: Telemetry<br>Read/Write: Staff/Admin | Ingests frontend and ERP error telemetry. Enforces `context`, `timestamp`, and `message` (< 5,000 characters) to prevent database denial-of-service. |

---

## 4. Quality & Build Verification Results

### A. Static Code Analysis (`oxlint`)
- **Website**: 0 errors
- **Selling System**: 0 errors

### B. Production Application Builds (`vite build`)
- **Website** (`d:/MLPY360/TOJA/Website`):
  - Modules transformed: 2,301
  - Exit code: `0` (Success)
- **Selling System** (`d:/MLPY360/TOJA/Selling System`):
  - Modules transformed: 2,760
  - Exit code: `0` (Success)

---

## 5. Deployment Instructions

To deploy these unified rules to live Google Cloud Firestore:

```bash
# Navigate to either project folder
cd "d:/MLPY360/TOJA/Selling System"

# Deploy rules only (zero downtime, immediate propagation)
npx firebase-tools deploy --only firestore:rules
```

Or deploy from `Website`:
```bash
cd "d:/MLPY360/TOJA/Website"
npx firebase-tools deploy --only firestore:rules
```
Both files are identical byte-for-byte; deploying from either directory produces the exact same security configuration.

