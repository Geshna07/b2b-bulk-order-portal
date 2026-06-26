# Firestore Database Schema

This document details the complete Firestore schema for **Ganga Maxx B2B Bulk Order Portal**. The schema consists of 8 main collections designed for optimal query performance, transactional integrity, and clear segregation of roles and duties.

---

## 1. `users` Collection
Stores user profiles and roles for customers, staff members, and administrators.

* **Document ID:** Same as Firebase Auth `uid`

| Field Name | Type | Description |
|---|---|---|
| `uid` | String | Unique identifier matching Firebase Auth UID |
| `name` | String | Full name of the user / contact person |
| `email` | String | Registered email address |
| `phone` | String | Contact telephone number |
| `whatsappNumber` | String | Active WhatsApp number for notifications |
| `role` | String | Primary role: `"customer"` \| `"staff"` \| `"admin"` |
| `subRole` | String \| Null | Sub-role for staff. `null` for `"customer"` and `"admin"`. For staff, must be one of: `"salesAdmin"`, `"warehouseStaff"`, `"salesman"`, `"deliveryCoordinator"`, `"accountsManager"`, `"complianceAdmin"` |
| `institutionName` | String | Name of the hospital, pharmacy, or wholesaling institution |
| `institutionType` | String | Type of institution (e.g. `"Hospital"`, `"Pharmacy"`, `"Wholesaler"`, `"Clinic"`) |
| `address` | Map | Physical shipping / billing location |
| `address.street` | String | Street address, building, suite |
| `address.city` | String | City name |
| `address.state` | String | State |
| `address.pincode` | String | Postal/ZIP pincode |
| `status` | String | Status: `"pending"` (needs approval) \| `"active"` \| `"rejected"` |
| `createdAt` | Timestamp | User account registration timestamp |

---

## 2. `products` Collection
Stores bulk product details and general catalogs.

* **Document ID:** Auto-generated `productId`

| Field Name | Type | Description |
|---|---|---|
| `productId` | String | Unique product identifier |
| `name` | String | Product / Chemical / Medical supply name |
| `category` | String | Category (e.g., `"Surgicals"`, `"Disinfectants"`, `"Pharmaceuticals"`) |
| `sku` | String | Stock Keeping Unit (Unique SKU number) |
| `description` | String | Rich text or plain text product description |
| `unit` | String | Selling unit (e.g. `"Box of 100"`, `"Pack of 10"`, `"5-Litre Canister"`) |
| `pricePerUnit` | Number | Wholesale base price per unit (INR) |
| `stock` | Number | Total real-time warehouse stock count |
| `minOrderQty` | Number | Minimum amount allowed for a bulk purchase |
| `images` | Array (String) | URLs to product display images |
| `isActive` | Boolean | Whether the product is currently visible in the active catalog |
| `createdBy` | String | UID of the staff/admin who created the product listing |
| `createdAt` | Timestamp | Date and time the product listing was created |

---

## 3. `orders` Collection
Main transaction storage containing bulk purchasing records and operational histories.

* **Document ID:** Auto-generated `orderId` or structured prefix (e.g. `GMX-ORD-XXXXX`)

| Field Name | Type | Description |
|---|---|---|
| `orderId` | String | Unique identifier for the order |
| `customerId` | String | UID of the customer (from `users` collection) |
| `customerName` | String | Cached full name of the customer |
| `institutionName` | String | Cached name of the buyer's institution |
| `items` | Array (Map) | List of products included in the order |
| `items[].productId` | String | Link to `products` collection |
| `items[].productName` | String | Product name |
| `items[].qty` | Number | Quantity ordered |
| `items[].unit` | String | Selling unit |
| `items[].pricePerUnit`| Number | Negotiated / bulk-pricing per unit |
| `items[].totalPrice` | Number | Row total (`qty * pricePerUnit`) |
| `orderTotal` | Number | Grand sum of all items in the order |
| `status` | String | Order stage: `"pending"` \| `"approved"` \| `"packed"` \| `"dispatched"` \| `"delivered"` \| `"cancelled"` |
| `paymentStatus` | String | Billing status: `"unpaid"` \| `"partial"` \| `"paid"` |
| `assignedSalesman` | String \| Null | Salesman name or staff ID assigned to manage the account |
| `deliveryAddress` | Map | Copied address at the time of order placement |
| `deliveryAddress.street`| String | Delivery street |
| `deliveryAddress.city` | String | Delivery city |
| `deliveryAddress.state`| String | Delivery state |
| `deliveryAddress.pincode`|String | Delivery pincode |
| `notes` | String | Special customer instructions or order annotations |
| `createdAt` | Timestamp | Timestamp when order was placed |
| `updatedAt` | Timestamp | Timestamp of the last status or detail modification |
| `statusHistory` | Array (Map) | Audit trail of order status progression |
| `statusHistory[].status`| String | Status changed to |
| `statusHistory[].updatedBy`| String | Name or ID of staff member executing change |
| `statusHistory[].timestamp`| Timestamp | Time of state transition |
| `statusHistory[].note` | String | Contextual remark for the status transition |

---

## 4. `quotations` Collection
Tracks customized price proposals requested by customers or constructed by salesmen.

* **Document ID:** Auto-generated `quotationId`

| Field Name | Type | Description |
|---|---|---|
| `quotationId` | String | Unique identifier of the quotation |
| `customerId` | String | UID of the customer |
| `customerName` | String | Full name of the customer |
| `items` | Array (Map) | Requested products, quantities, and quoted tiered prices |
| `totalAmount` | Number | Calculated total proposed price |
| `validUntil` | Timestamp | Expiration date of the quotation's pricing tiers |
| `status` | String | Current status: `"draft"` \| `"sent"` \| `"accepted"` \| `"rejected"` |
| `createdBy` | String | UID of the salesman or salesAdmin who generated the quote |
| `createdAt` | Timestamp | Creation timestamp |

---

## 5. `inventory` Collection
Stores granular warehouse storage details, batches, and availability markers.

* **Document ID:** Auto-generated `inventoryId` or linked directly to `productId`

| Field Name | Type | Description |
|---|---|---|
| `inventoryId` | String | Unique identifier |
| `productId` | String | ID of the linked product |
| `productName` | String | Product Name |
| `warehouseLocation` | String | Warehouse coordinates (e.g. `"Aisle 4, Shelf B, Rack 2"`) |
| `batchNumber` | String | Manufacturing or import batch label (e.g. `"B-2026-F12"`) |
| `currentStock` | Number | Physical stock present in the warehouse location |
| `reservedStock` | Number | Stock allocated to pending/approved orders but not yet packed |
| `reorderLevel` | Number | Threshold count where alerts should be issued to replenish stock |
| `lastUpdated` | Timestamp | Date and time of last stock adjustment |
| `updatedBy` | String | Name / staff ID of the editor |

---

## 6. `deliveries` Collection
Manages shipping tracking, route assignment, and dispatch handoffs.

* **Document ID:** Auto-generated `deliveryId`

| Field Name | Type | Description |
|---|---|---|
| `deliveryId` | String | Unique identifier for delivery assignment |
| `orderId` | String | Linked order ID |
| `assignedCoordinator`| String | Name or UID of the delivery coordinator in charge |
| `vehicleNumber` | String | License plate number of the logistics vehicle |
| `driverName` | String | Driver's name |
| `estimatedDate` | Timestamp | Target delivery arrival date |
| `actualDate` | Timestamp \| Null| Dispatch handoff arrival date (`null` if pending) |
| `status` | String | Status: `"scheduled"` \| `"inTransit"` \| `"delivered"` \| `"failed"` |
| `trackingNotes` | Array (String) | Chronological log of route checkpoint updates |
| `createdAt` | Timestamp | Dispatch assignment creation date |

---

## 7. `creditAccounts` Collection
Stores credit ledger structures, credit approvals, and net-term billing balances.

* **Document ID:** Auto-generated `creditId` or linked directly to `customerId`

| Field Name | Type | Description |
|---|---|---|
| `creditId` | String | Unique identifier |
| `customerId` | String | Linked customer UID |
| `customerName` | String | Customer name |
| `creditLimit` | Number | Total approved credit allowance limit (INR) |
| `usedCredit` | Number | Currently consumed credit on unpaid orders |
| `balance` | Number | Outstanding balance / Remaining credit safety (`creditLimit - usedCredit`) |
| `paymentTermDays` | Number | Permitted net delay for invoices (e.g., `30` for Net-30, `45` for Net-45) |
| `agingBuckets` | Map | Debt aging intervals |
| `agingBuckets.current` | Number | Outstanding balance within normal payment terms |
| `agingBuckets.days30`| Number | Balance outstanding by 1-30 days |
| `agingBuckets.days60`| Number | Balance outstanding by 31-60 days |
| `agingBuckets.days90plus`| Number| Balance outstanding over 60 days (highly critical) |
| `lastPaymentDate` | Timestamp \| Null| Date of last transaction payments |
| `status` | String | Credit state: `"active"` (Good standing) \| `"overdue"` \| `"suspended"` |

---

## 8. `complianceRecords` Collection
Tracks chemical handling logs, MSDS documents, and legal safety clearances.

* **Document ID:** Auto-generated `complianceId`

| Field Name | Type | Description |
|---|---|---|
| `complianceId` | String | Unique identifier |
| `productId` | String | Linked product ID |
| `productName` | String | Product Name |
| `msdsDocumentUrl` | String | URL path to the Material Safety Data Sheet PDF |
| `chemicalHandlingNotes`| String | Safety directives, storage temperatures, and handling classes |
| `lastReviewDate` | Timestamp | Date of last safety and certifications review |
| `reviewedBy` | String | Name or ID of complianceAdmin staff in charge |
| `acknowledgements` | Array (Map) | Signature logs of warehouse handlers |
| `acknowledgements[].staffId`| String | Staff member ID |
| `acknowledgements[].acknowledgedAt`| Timestamp | Signature confirmation date |
| `status` | String | Status: `"compliant"` \| `"review_required"` |
