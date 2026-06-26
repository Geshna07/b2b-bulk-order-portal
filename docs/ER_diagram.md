# Entity-Relationship (ER) Diagram Description

This document defines the relational architecture, primary/foreign keys, cardinality, and data flows of the **Ganga Maxx B2B Bulk Order Portal** database schema implemented in Firebase Firestore.

---

```
                       +-------------------+
                       |       users       |
                       +-------------------+
                       | PK: uid           |
                       +-------------------+
                                 |
         +-----------------------+------------------------+
         | 1                     | 1                      | 1
         |                       |                        |
         | 1..*                  | 0..*                   | 0..1
+-------------------+   +-------------------+    +--------------------+
|      orders       |   |    quotations     |    |   creditAccounts   |
+-------------------+   +-------------------+    +--------------------+
| PK: orderId       |   | PK: quotationId   |    | PK: creditId       |
| FK: customerId    |   | FK: customerId    |    | FK: customerId     |
+-------------------+   +-------------------+    +--------------------+
         | 1
         |
         | 0..1
+-------------------+
|    deliveries     |
+-------------------+
| PK: deliveryId    |
| FK: orderId       |
+-------------------+

                                 +--------------------+
                                 |      products      |
                                 +--------------------+
                                 | PK: productId      |
                                 +--------------------+
                                           |
                    +----------------------+----------------------+
                    | 1                                           | 1
                    |                                             |
                    | 0..*                                        | 0..*
          +--------------------+                        +----------------------+
          |     inventory      |                        |  complianceRecords   |
          +--------------------+                        +----------------------+
          | PK: inventoryId    |                        | PK: complianceId     |
          | FK: productId      |                        | FK: productId        |
          +--------------------+                        +----------------------+
```

---

## 1. Primary Entities & Keys

### `users` (Key Entity)
* **Primary Identifier:** `uid` (Matches Firebase Auth standard UID)
* **Relations:**
  * Has a **one-to-many (1:N)** relationship with `orders` (via `orders.customerId`).
  * Has a **one-to-many (1:N)** relationship with `quotations` (via `quotations.customerId`).
  * Has a **one-to-one (1:1)** relationship with `creditAccounts` (via `creditAccounts.customerId`).
  * Internal self-joins: Staff members with roles like `salesman` are referenced in `orders.assignedSalesman`.

### `products` (Core Catalog)
* **Primary Identifier:** `productId`
* **Relations:**
  * Has a **one-to-many (1:N)** relationship with batches in `inventory` (via `inventory.productId`).
  * Has a **one-to-many (1:N)** relationship with `complianceRecords` (via `complianceRecords.productId`).
  * Ordered inside items array: Nested as structured inline maps inside `orders.items` and `quotations.items` for historical transactional pricing audit compliance.

### `orders` (Transaction Core)
* **Primary Identifier:** `orderId`
* **Relations:**
  * Belongs to **one (1)** customer in `users` (via `customerId`).
  * Linked **one-to-one (1:1)** to `deliveries` tracking entries (via `deliveries.orderId`).
  * Items inside `orders` copy `products.productId`, `name`, and negotiated `pricePerUnit` to ensure records remain static even if products change pricing later.

### `quotations` (Sales Negotiator)
* **Primary Identifier:** `quotationId`
* **Relations:**
  * Belongs to **one (1)** customer in `users` (via `customerId`).
  * Created by **one (1)** staff salesman (via `createdBy`).

### `inventory` (Warehouse Batches)
* **Primary Identifier:** `inventoryId`
* **Relations:**
  * Belongs to **one (1)** specific product in `products` (via `productId`).

### `deliveries` (Logistics Tracker)
* **Primary Identifier:** `deliveryId`
* **Relations:**
  * Maps directly to **one (1)** specific order in `orders` (via `orderId`).
  * Assigned to **one (1)** dispatch coordinator in `users` (via `assignedCoordinator` matching `uid`).

### `creditAccounts` (Wholesale Ledger)
* **Primary Identifier:** `creditId`
* **Relations:**
  * Maps **one-to-one (1:1)** to a customer profile in `users` (via `customerId`).

### `complianceRecords` (Product Security)
* **Primary Identifier:** `complianceId`
* **Relations:**
  * Connects to **one (1)** product record in `products` (via `productId`).

---

## 2. Cardinality and Structural Constraints

1. **User Role Enforcement:**
   * Only documents in `users` with `role == "customer"` can have matching `creditAccounts`.
   * Only documents with `role == "staff"` and `subRole == "salesman"` can be assigned to `orders.assignedSalesman` or `quotations.createdBy`.

2. **Order & Delivery Coupling:**
   * Every delivery document MUST refer to an existing active `orderId` with `orders.status == "approved"`. 
   * A single delivery process tracks a single physical order.

3. **Product & Safety Compliance:**
   * Products belonging to chemical categories (tracked via `products.category`) MUST contain corresponding `complianceRecords` detailing material handling instructions and SDS links.
