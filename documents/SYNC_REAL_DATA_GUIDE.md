# Sync Real Data from API with Images

## ✅ What's Been Fixed

1. **Sync Service Updated** - Now properly saves products with:
   - `category_id` - For category filtering
   - `preview_image` - Product image URLs
   - `image_preview_style` - Image display style
   - `store_id` - Store association
   - `available_stock` - Stock levels

2. **Database Schema** - Already has all required fields:
   - Products table includes `category_id`, `preview_image`, `store_id`
   - Foreign key relationships properly set up

3. **POS Page** - Already displays:
   - Product images (or placeholder if no image)
   - Category filtering
   - Stock levels with color coding
   - Proper product information

## 🚀 How to Sync Real Data

### Step 1: Clear Old Mock Data (Optional)
```bash
npm run clear-db
```

This will:
- Clear all products from database
- Reset sync history
- Prepare for fresh sync from API

### Step 2: Start the App
The app should already be running. If not:
```bash
npm run dev
```

### Step 3: Login with Real Credentials
1. Open the app
2. Go to Login page
3. Enter your credentials for `admin.karbar.shop`
4. Click Login

### Step 4: Trigger Sync
**Option A: Using Menu**
1. Click on `Database` menu
2. Select `Sync from API`
3. Wait for sync to complete

**Option B: Using Keyboard Shortcut**
- Press `Ctrl+S` (or `Cmd+S` on Mac)

### Step 5: View Products
1. Go to POS page
2. You should now see real products with:
   - ✅ Product images from API
   - ✅ Real categories
   - ✅ Actual stock levels
   - ✅ Correct prices

## 📊 What Gets Synced

### From API to Local Database:
- **Products** - All products with images, prices, stock
- **Categories** - Product categories for filtering
- **Customers** - Customer list
- **Payment Methods** - Available payment options

### API Endpoints Used:
- `GET /api/pos/pos-products` - Products with pagination
- `GET /api/pos/pos-categories` - Categories
- `GET /api/pos/pos-customers` - Customers
- `GET /api/pos/pos-payment-method` - Payment methods

## 🖼️ Image Display

Products will display images in two ways:

1. **With Image**: Shows actual product image from `preview_image` field
2. **Without Image**: Shows placeholder with 📦 icon

The POS page automatically handles both cases.

## 🔄 Auto-Sync

The app can be configured to auto-sync at intervals:
- Default: Manual sync only
- Can be enabled in settings (future feature)

## 🐛 Troubleshooting

### No Products Showing?
1. Check if you're logged in (token required)
2. Check console for sync errors
3. Try manual sync from Database menu

### Images Not Loading?
1. Check if `preview_image` field has valid URL
2. Check network connectivity
3. Verify image URLs are accessible

### Authentication Errors?
1. Re-login with valid credentials
2. Check if token is expired
3. Verify API endpoint is accessible

## 📝 Database Location

Your local database is stored at:
- **Windows**: `%APPDATA%/electron-pos/pos.db`
- **Mac**: `~/Library/Application Support/electron-pos/pos.db`
- **Linux**: `~/.config/electron-pos/pos.db`

## 🎯 Next Steps

After syncing real data:
1. ✅ Products display with images
2. ✅ Category filtering works
3. ✅ Search by name/SKU works
4. ✅ Barcode scanning works
5. ✅ Stock levels are accurate
6. ✅ Offline mode works (data cached locally)

## 💡 Tips

- **First Sync**: May take a few minutes depending on product count
- **Incremental Sync**: Subsequent syncs are faster (only updates)
- **Offline Mode**: Once synced, app works completely offline
- **Manual Refresh**: Use Database menu to sync anytime

## 🔐 Security

- Authentication token stored securely in electron-store
- All API calls use Bearer token authentication
- Token automatically cleared on 401 errors
- Re-login required if token expires
