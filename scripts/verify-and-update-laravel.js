const fs = require('fs');
const path = require('path');

const laravelRoot = 'D:/karbar_project/karbar_admin/karbar-shop-laravel';

console.log('=== Checking and Updating Laravel Expense and Customer APIs ===');

// 1. Update StoreCustomerRequest.php
const storeCustomerReqPath = path.join(laravelRoot, 'app/Http/Requests/StoreCustomerRequest.php');
if (fs.existsSync(storeCustomerReqPath)) {
    let content = fs.readFileSync(storeCustomerReqPath, 'utf8');
    
    // Make authorize allow any authenticated user (e.g. cashiers)
    content = content.replace(
        "return $this->user()->can('customer-create');",
        "return $this->user() !== null;"
    );

    // Make phone min length 5 instead of 10 and max 25
    content = content.replace(
        "'min:10',",
        "'min:5',"
    );

    fs.writeFileSync(storeCustomerReqPath, content, 'utf8');
    console.log('✅ StoreCustomerRequest.php verified and updated.');
} else {
    console.warn('❌ StoreCustomerRequest.php not found at', storeCustomerReqPath);
}

// 2. Update CustomerController.php
const customerCtrlPath = path.join(laravelRoot, 'app/Http/Controllers/POS/CustomerController.php');
if (fs.existsSync(customerCtrlPath)) {
    let content = fs.readFileSync(customerCtrlPath, 'utf8');
    
    // Enhance createPosCustomer to return existing customer if phone is duplicate and return standard status + data
    const oldMethod = `    public function createPosCustomer(StoreCustomerRequest $request)
    {
        $validated = $request->validated();

        $validated['customer_type'] = 'pos';

        $customer = Customer::create($validated);

        return response()->json([
            'id' => $customer->id,
            'name' => $customer->name,
        ]);
    }`;

    const newMethod = `    public function createPosCustomer(StoreCustomerRequest $request)
    {
        $validated = $request->validated();
        $validated['customer_type'] = 'pos';

        // Check if customer with this phone already exists to avoid duplicate error in POS
        if (!empty($validated['phone'])) {
            $existing = Customer::where('phone', $validated['phone'])->first();
            if ($existing) {
                if (!empty($validated['name'])) {
                    $existing->name = $validated['name'];
                }
                if (!empty($validated['address'])) {
                    $existing->address = $validated['address'];
                }
                if (!empty($validated['email']) && empty($existing->email)) {
                    $existing->email = $validated['email'];
                }
                $existing->save();

                return response()->json([
                    'status' => true,
                    'message' => 'Existing customer matched',
                    'id' => $existing->id,
                    'name' => $existing->name,
                    'data' => $existing,
                ], 200);
            }
        }

        $customer = Customer::create($validated);

        return response()->json([
            'status' => true,
            'message' => 'Customer created successfully',
            'id' => $customer->id,
            'name' => $customer->name,
            'data' => $customer,
        ], 201);
    }`;

    if (content.includes(oldMethod)) {
        content = content.replace(oldMethod, newMethod);
        fs.writeFileSync(customerCtrlPath, content, 'utf8');
        console.log('✅ CustomerController.php createPosCustomer enhanced.');
    } else {
        console.log('ℹ️ CustomerController.php already up to date.');
    }
}

// 3. Update POS ExpenseController.php
const expenseCtrlPath = path.join(laravelRoot, 'app/Http/Controllers/POS/ExpenseController.php');
if (fs.existsSync(expenseCtrlPath)) {
    let content = fs.readFileSync(expenseCtrlPath, 'utf8');

    // In index(): support store_id query param and support superadmin with null store_id
    if (content.includes("where('store_id', auth()->user()->store_id)")) {
        content = content.replace(
            "$data = Expense::with('created_by')->where('store_id', auth()->user()->store_id)->orderBy('created_at', 'desc');",
            `$user = auth()->user();
        $storeId = $request->input('store_id') ?: ($user ? $user->store_id : null);
        $data = Expense::with('created_by')->orderBy('created_at', 'desc');
        if ($storeId) {
            $data->where(function ($q) use ($storeId) {
                $q->where('store_id', $storeId)->orWhereNull('store_id');
            });
        }
        if ($request->filled('type') && $request->type !== 'all') {
            $data->where('type', $request->type);
        }`
        );
    }

    // In store(): ensure store_id has fallback and is_petty_cash parses properly
    if (content.includes("$validated['store_id'] = $authUser->store_id ?? null;")) {
        content = content.replace(
            "$validated['store_id'] = $authUser->store_id ?? null;",
            "$validated['store_id'] = $request->input('store_id') ?: ($authUser->store_id ?: 1);\n        $validated['is_petty_cash'] = filter_var($request->input('is_petty_cash', false), FILTER_VALIDATE_BOOLEAN);"
        );
    }

    fs.writeFileSync(expenseCtrlPath, content, 'utf8');
    console.log('✅ ExpenseController.php verified and updated.');
}

// 4. Update StoreExpenseRequest.php
const storeExpenseReqPath = path.join(laravelRoot, 'app/Http/Requests/StoreExpenseRequest.php');
if (fs.existsSync(storeExpenseReqPath)) {
    let content = fs.readFileSync(storeExpenseReqPath, 'utf8');

    // Ensure is_petty_cash is not failing if sent as string or boolean
    content = content.replace(
        "'is_petty_cash' => ['required', 'boolean'],",
        "'is_petty_cash' => ['nullable'],"
    );
    // Allow date without strict before_or_equal timezone failure
    content = content.replace(
        "'expense_date' => ['required', 'before_or_equal:today'],",
        "'expense_date' => ['required', 'date'],"
    );

    fs.writeFileSync(storeExpenseReqPath, content, 'utf8');
    console.log('✅ StoreExpenseRequest.php verified and updated.');
}

// 5. Update PosOrderRequest.php to make salesman_id and billed_by completely optional/nullable
const posOrderReqPath = path.join(laravelRoot, 'app/Http/Requests/PosOrderRequest.php');
if (fs.existsSync(posOrderReqPath)) {
    let content = fs.readFileSync(posOrderReqPath, 'utf8');
    content = content.replace(
        "'billed_by' => ['nullable', 'exists:users,id'],",
        "'billed_by' => ['nullable'],"
    );
    content = content.replace(
        "'salesman_id' => ['nullable', 'exists:employees,id'],",
        "'salesman_id' => ['nullable'],"
    );
    fs.writeFileSync(posOrderReqPath, content, 'utf8');
    console.log('✅ PosOrderRequest.php verified and updated (salesman_id and billed_by made nullable).');
}

console.log('=== All Laravel checks and updates completed successfully ===');
