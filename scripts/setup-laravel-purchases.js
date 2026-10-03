const fs = require('fs');
const path = require('path');

const laravelRoot = 'D:/karbar_project/karbar_admin/karbar-shop-laravel';

console.log('=== Adding PurchaseController and Route to Laravel ===');

// 1. Create PurchaseController.php
const purchaseCtrlDir = path.join(laravelRoot, 'app/Http/Controllers/POS');
if (!fs.existsSync(purchaseCtrlDir)) {
    fs.mkdirSync(purchaseCtrlDir, { recursive: true });
}

const purchaseCtrlPath = path.join(purchaseCtrlDir, 'PurchaseController.php');
const purchaseCtrlCode = `<?php

declare(strict_types=1);

namespace App\\Http\\Controllers\\POS;

use App\\Http\\Controllers\\Controller;
use App\\Models\\PurchaseOrder;
use Illuminate\\Http\\Request;

class PurchaseController extends Controller
{
    public function index(Request $request)
    {
        $query = PurchaseOrder::with(['supplier:id,name', 'items'])
            ->latest('id');

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('created_at', [$request->start_date, $request->end_date]);
        }

        $purchases = $query->take(100)->get()->map(function ($po) {
            return [
                'id' => $po->id,
                'remote_id' => $po->id,
                'challan_no' => $po->challan_no,
                'supplier_name' => $po->supplier ? $po->supplier->name : 'General Supplier',
                'status' => $po->status,
                'purchase_type' => $po->purchase_type,
                'total_quantity' => (int) $po->items->sum('quantity'),
                'total_amount' => (float) $po->items->sum('total_cost'),
                'created_at' => $po->created_at ? $po->created_at->toDateTimeString() : date('Y-m-d H:i:s'),
            ];
        });

        $totalPurchaseAmount = $purchases->sum('total_amount');

        return response()->json([
            'status' => true,
            'data' => $purchases,
            'summary' => [
                'total_purchase' => $totalPurchaseAmount,
                'total_orders' => $purchases->count(),
            ]
        ]);
    }
}
`;

fs.writeFileSync(purchaseCtrlPath, purchaseCtrlCode, 'utf8');
console.log('✅ Created POS/PurchaseController.php');

// 2. Add route to routes/api.php
const apiRoutePath = path.join(laravelRoot, 'routes/api.php');
if (fs.existsSync(apiRoutePath)) {
    let apiContent = fs.readFileSync(apiRoutePath, 'utf8');
    if (!apiContent.includes('pos-purchases')) {
        apiContent = apiContent.replace(
            "Route::get('pos-expense-types', [\\App\\Http\\Controllers\\POS\\ExpenseController::class, 'getExpenseTypes']);",
            "Route::get('pos-expense-types', [\\App\\Http\\Controllers\\POS\\ExpenseController::class, 'getExpenseTypes']);\n    Route::get('pos-purchases', [\\App\\Http\\Controllers\\POS\\PurchaseController::class, 'index']);"
        );
        fs.writeFileSync(apiRoutePath, apiContent, 'utf8');
        console.log('✅ Added pos-purchases route to routes/api.php');
    } else {
        console.log('ℹ️ pos-purchases route already exists');
    }
}

console.log('=== Laravel purchases setup complete ===');
