# Order Sync Fix - API Upload Format

## 🐛 Problem
When syncing orders to the API, the following errors occurred:
```
The total quantity field is required.
The sub total field is required.
The total amount field is required.
The products.0.price field is required.
```

## ✅ What Was Fixed

### 1. Order Creation Format (POSPage.tsx)
**Before:**
```javascript
{
  customer_id: null,
  customer_name: 'Guest',
  subtotal,
  discount,
  tax,
  total,
  // Missing required fields
}
```

**After:**
```javascript
{
  customer_id: 1,
  customer_name: 'Walk in Customer',
  store_id: 2,
  sub_total: subtotal,           // ✅ Correct field name
  discount_amount: discount,
  discount_type: 'flat',
  vat: '0',
  vat_amount: tax,
  total_quantity: totalQuantity, // ✅ Added
  total_amount: total,           // ✅ Correct field name
  payment_method: 'cash',
  paid_amount: total,
  change_amount: 0,
  payment_status: 'paid',
  status: 'completed',
  order_type: 'pos',
  shipping_address: '',
  note: '',
  items: [...]
}
```

### 2. API Payload Format (sync.service.ts)
**Improvements:**
- ✅ Added `parseFloat()` and `parseInt()` for numeric fields
- ✅ Added default values for optional fields
- ✅ Ensured all required fields are present
- ✅ Added detailed logging for debugging

**Payload Structure:**
```javascript
{
  products: [
    {
      product_id: 123,
      product_name: "Product Name",
      product_variant_id: null,
      quantity: 2,              // ✅ Integer
      price: 99.99,             // ✅ Float
      total: 199.98             // ✅ Float
    }
  ],
  customer_id: 1,
  store_id: 2,
  sub_total: 199.98,            // ✅ Float
  vat_amount: 0,                // ✅ Float
  vat: "0",
  discount_amount: 0,           // ✅ Float
  discount_type: "flat",
  total_quantity: 2,            // ✅ Integer
  total_amount: 199.98,         // ✅ Float
  payment_method: "cash",
  paid_amount: 199.98,          // ✅ Float
  change_amount: 0,             // ✅ Float
  shipping_address: "",
  note: "",
  billed_by: 1,
  order_type: "pos",
  transaction_id: null
}
```

### 3. Order Items Format
**Fixed:**
- Changed `unit_price` → `price`
- Added `product_variant_id`
- Ensured proper data types

## 🚀 How to Test

### Step 1: Clear Failed Sync Queue
```bash
npm run clear-sync-queue
```

This removes any failed order sync attempts.

### Step 2: Create a New Order
1. Open the POS page
2. Add products to cart
3. Click "Checkout"
4. Order will be saved locally

### Step 3: Sync to API
**Option A: Menu**
- Click `Database > Sync from API`

**Option B: Keyboard**
- Press `Ctrl+S` (or `Cmd+S` on Mac)

### Step 4: Verify
Check the console output:
```
📤 Uploading order: <order-id>
📦 Order payload: { ... }
✅ Order uploaded successfully
✅ Order synced successfully: <order-id>
```

## 📊 API Endpoint

**Endpoint:** `POST /api/pos/pos-product-order`

**Required Fields:**
- `products` (array)
  - `product_id` (integer)
  - `quantity` (integer)
  - `price` (float)
- `total_quantity` (integer)
- `sub_total` (float)
- `total_amount` (float)
- `customer_id` (integer)
- `store_id` (integer)
- `payment_method` (string)

## 🔍 Debugging

### View Sync Queue
```sql
SELECT * FROM sync_queue WHERE synced_at IS NULL;
```

### View Orders
```sql
SELECT * FROM orders WHERE synced_at IS NULL;
```

### View Order Items
```sql
SELECT * FROM order_items WHERE order_local_id = '<local-id>';
```

## 🛠️ Scripts Added

1. **`npm run clear-sync-queue`** - Clear failed sync attempts
2. **`npm run clear-db`** - Clear entire database (products, orders, etc.)

## ✨ Benefits

1. ✅ Orders sync successfully to API
2. ✅ Proper data type conversion
3. ✅ All required fields included
4. ✅ Better error handling
5. ✅ Detailed logging for debugging
6. ✅ Offline-first still works (orders saved locally first)

## 📝 Notes

- Orders are always saved locally first (offline-first)
- Sync happens in background when online
- Failed syncs are retried automatically
- You can manually trigger sync anytime
- Order data is preserved even if sync fails

## 🎯 Next Steps

After this fix:
1. Create test orders in POS
2. Verify they sync to API successfully
3. Check remote dashboard for synced orders
4. Test offline mode (orders saved locally)
5. Test sync after coming back online
