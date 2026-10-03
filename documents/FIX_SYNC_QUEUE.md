# Fix Sync Queue - Clear Old Orders

## Problem
Old orders in the sync queue have `null` values for required fields because they were created before the fix was applied.

## Solution

### Option 1: Use Database Menu (Recommended)
1. Click `Database` menu in the app
2. Select `Clear Sync Queue`
3. Confirm the action
4. Old failed sync items will be removed

### Option 2: Manual SQL (Advanced)
If you have database access:
```sql
DELETE FROM sync_queue WHERE synced_at IS NULL;
```

## After Clearing

1. **Create a new test order:**
   - Go to POS page
   - Add products to cart
   - Click Checkout

2. **Verify the order data:**
   - Check that all fields are filled
   - Especially: `sub_total`, `total_quantity`, `total_amount`, `paid_amount`

3. **Sync to API:**
   - Click `Database > Sync from API`
   - Check console for success message

## Expected Console Output

```
📤 Uploading order: <order-id>
📦 Order payload: {
  "products": [
    {
      "product_id": 14,
      "product_name": "Product Name",
      "product_variant_id": null,
      "quantity": 1,              ✅ Not null
      "price": 2500,              ✅ Not null
      "total": 2500               ✅ Not null
    }
  ],
  "customer_id": 1,
  "store_id": 2,
  "sub_total": 2500,              ✅ Not null
  "vat_amount": 0,
  "vat": "0",
  "discount_amount": 0,
  "discount_type": "flat",
  "total_quantity": 1,            ✅ Not null
  "total_amount": 2500,           ✅ Not null
  "payment_method": "cash",
  "paid_amount": 2500,            ✅ Not null
  "change_amount": 0,
  ...
}
✅ Order uploaded successfully
✅ Order synced successfully: <order-id>
```

## Why This Happened

Old orders were created with the old POSPage format that didn't include:
- `sub_total` (was `subtotal`)
- `total_quantity` (wasn't calculated)
- `total_amount` (was `total`)
- `paid_amount` (wasn't included)
- `price` in items (was `unit_price`)

The fix updated POSPage.tsx to use the correct field names and include all required data.

## Prevention

Going forward, all new orders will have the correct format because:
1. ✅ POSPage.tsx now sends correct field names
2. ✅ All required fields are calculated and included
3. ✅ Data types are properly converted (parseFloat, parseInt)
4. ✅ Default values are provided for optional fields

## Database Location

Your database is at:
- **Windows**: `%APPDATA%\electron-pos\data\pos.db`
- **Mac**: `~/Library/Application Support/electron-pos/data/pos.db`
- **Linux**: `~/.config/electron-pos/data/pos.db`
