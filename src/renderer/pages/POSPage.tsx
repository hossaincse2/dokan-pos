import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchProducts, searchProducts, clearSearch } from '../store/slices/productsSlice';
import {
  addItem,
  removeItem,
  updateItemQuantity,
  setPaymentMethod,
  setVATRate,
  setIsTaxInclusive,
  clearCart,
} from '../store/slices/cartSlice';
import { createOrder } from '../store/slices/ordersSlice';
import { Product } from '@shared/types';
import InvoiceModal from '../components/InvoiceModal';
import SearchableSelect from '../components/SearchableSelect';

export default function POSPage() {
  console.log('[POSPage] ========== COMPONENT RENDERING ==========');
  
  const dispatch = useDispatch<AppDispatch>();
  const { searchResults, loading } = useSelector(
    (state: RootState) => state.products
  );
  const { items: cartItems, subtotal, discount, tax, total, paymentMethod } = useSelector(
    (state: RootState) => state.cart
  );
  const { settings, siteSettings } = useSelector((state: RootState) => state.settings);
  
  console.log('[POSPage] State - loading:', loading, 'cartItems:', cartItems?.length);
  console.log('[POSPage] About to render POSPage HTML');

  const [searchTerm, setSearchTerm] = useState('');
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [matchingVariants, setMatchingVariants] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [selectedSalesman, setSelectedSalesman] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [originalProducts, setOriginalProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'flat' | 'percentage'>('flat');
  const [isDuePayment, setIsDuePayment] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);

  // Quick Add Customer modal state
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerModalError, setCustomerModalError] = useState<string | null>(null);
  
  const observerTarget = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const barcodeTimeoutRef = useRef<NodeJS.Timeout>();
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const receivedAmountInputRef = useRef<HTMLInputElement>(null);
  const currentPageRef = useRef<number>(1);

  // Initial load
  useEffect(() => {
    currentPageRef.current = 1;
    setAllProducts([]);
    setOriginalProducts([]);
    setHasMore(false);
    
    const storeId = settings?.storeId || 2;
    dispatch(fetchProducts({ 
      storeId: storeId,
      billedBy: selectedSalesman || undefined,
      page: 1,
      perPage: 20,
      categoryId: selectedCategory
    })).then((result: any) => {
      if (result.payload) {
        const newProducts = (result.payload.data || []) as Product[];
        setAllProducts(newProducts);
        setOriginalProducts(newProducts);
        setHasMore(newProducts.length === 20);
      } else {
        setHasMore(false);
      }
    }).catch(() => {
      setHasMore(false);
    });
    
    loadCategories();
    loadCustomers();
    loadEmployees();
    loadPaymentMethods();
  }, [settings]);

  // Set tax rate and inclusive/exclusive from settings
  useEffect(() => {
    if (settings) {
      if (settings.taxRate !== undefined) {
        dispatch(setVATRate(settings.taxRate));
      }
      if (settings.isTaxInclusive !== undefined) {
        dispatch(setIsTaxInclusive(settings.isTaxInclusive));
      }
      console.log('[POSPage] VAT settings updated:', { 
        rate: settings.taxRate, 
        isInclusive: settings.isTaxInclusive 
      });
    }
  }, [settings, dispatch]);

  // Auto-focus barcode input on page load
  useEffect(() => {
    const timer = setTimeout(() => {
      if (barcodeInputRef.current && !showPaymentModal && !showInvoice) {
        barcodeInputRef.current.focus();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Auto-focus barcode input when payment modal closes (only when transitioning from open to closed)
  const prevModalStateRef = useRef({ payment: false, invoice: false });
  useEffect(() => {
    const wasModalOpen = prevModalStateRef.current.payment || prevModalStateRef.current.invoice;
    const isModalOpen = showPaymentModal || showInvoice;
    
    // Only focus if we're transitioning from open to closed
    if (wasModalOpen && !isModalOpen && barcodeInputRef.current) {
      setTimeout(() => {
        // Double check no other input is focused
        const activeElement = document.activeElement as HTMLElement;
        const isInputFocused = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';
        
        if (!isInputFocused && barcodeInputRef.current) {
          barcodeInputRef.current.focus();
        }
      }, 200);
    }
    
    // Update previous state
    prevModalStateRef.current = { payment: showPaymentModal, invoice: showInvoice };
  }, [showPaymentModal, showInvoice]);

  // Auto-focus and auto-select received amount input when payment modal opens
  useEffect(() => {
    if (showPaymentModal) {
      const timer = setTimeout(() => {
        if (receivedAmountInputRef.current) {
          receivedAmountInputRef.current.focus();
          try {
            receivedAmountInputRef.current.select();
          } catch (err) {
            console.warn('[POSPage] Input select not supported:', err);
          }
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [showPaymentModal]);

  // Load categories
  const loadCategories = async () => {
    try {
      const result = await window.electronAPI.getCategories();
      setCategories(result || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  // Load customers
  const loadCustomers = async () => {
    try {
      const result = await window.electronAPI.getCustomers();
      setCustomers(result || []);
      
      // Set default customer if not already selected
      if (result && result.length > 0 && !selectedCustomer) {
        // First, try to find "Walk in" customer
        const walkInCustomer = result.find((c: any) => c.name === 'Walk in');
        
        if (walkInCustomer) {
          setSelectedCustomer(walkInCustomer.id);
          console.log('[POSPage] Default customer set to "Walk in" (ID:', walkInCustomer.id, ')');
        } else {
          // If no "Walk in" customer, use first customer
          setSelectedCustomer(result[0].id);
          console.log('[POSPage] Default customer set to:', result[0].name, 'ID:', result[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  // Create new customer quick handler
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) {
      setCustomerModalError('Customer name is required');
      return;
    }

    try {
      setSavingCustomer(true);
      setCustomerModalError(null);

      const created = await window.electronAPI.createCustomer({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim(),
        email: newCustomerEmail.trim(),
        address: newCustomerAddress.trim(),
      });

      // Reload customers list from DB
      const updatedCustomers = await window.electronAPI.getCustomers();
      setCustomers(updatedCustomers || []);

      // Auto-select the newly created customer
      if (created?.id) {
        setSelectedCustomer(created.id);
      }

      // Reset form and close modal
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerEmail('');
      setNewCustomerAddress('');
      setShowAddCustomerModal(false);
    } catch (err: any) {
      console.error('[POSPage] Failed to create customer:', err);
      setCustomerModalError(err.message || 'Failed to save customer');
    } finally {
      setSavingCustomer(false);
    }
  };

  // Load employees (salesmen)
  const loadEmployees = async () => {
    try {
      console.log('[POSPage] Loading employees...');
      const result = await window.electronAPI.getEmployees();
      console.log('[POSPage] Employees loaded:', result?.length || 0, result);
      setEmployees(result || []);
      // Salesman is optional - do not force default
      if (result && result.length > 0) {
        console.log('[POSPage] Employees available for optional selection:', result.length);
      } else {
        console.log('[POSPage] No employees found in database');
      }
    } catch (error) {
      console.error('[POSPage] Failed to load employees:', error);
    }
  };

  // Load payment methods
  const loadPaymentMethods = async () => {
    try {
      const result = await window.electronAPI.getPaymentMethods();
      if (result && result.length > 0) {
        setPaymentMethods(result);
        // Set default payment method to first one (usually Cash)
        if (result[0]) {
          dispatch(setPaymentMethod(result[0].id));
        }
      } else {
        // Fallback to default
        setPaymentMethods([
          { id: 2, name: 'Cash', slug: 'cash' },
          { id: 9, name: 'Bkash', slug: 'bkash' },
        ]);
        dispatch(setPaymentMethod(2));
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
      // Fallback to default
      setPaymentMethods([
        { id: 2, name: 'Cash', slug: 'cash' },
        { id: 9, name: 'Bkash', slug: 'bkash' },
      ]);
      dispatch(setPaymentMethod(2));
    }
  };

  // Load products function with category filter
  const loadProducts = useCallback(async (pageNum: number, categoryId: number | null = null) => {
    const storeId = settings?.storeId || 2;
    console.log('[POSPage] Loading products page:', pageNum, 'with storeId:', storeId, 'category:', categoryId, 'salesman:', selectedSalesman);
    
    const result: any = await dispatch(fetchProducts({ 
      storeId: storeId,
      billedBy: selectedSalesman || undefined,
      page: pageNum,
      perPage: 20,
      categoryId: categoryId
    }));
    
    if (result.payload) {
      const newProducts = (result.payload.data || []) as Product[];
      console.log('[POSPage] Loaded', newProducts.length, 'products for page', pageNum);
      
      setAllProducts(prev => {
        if (pageNum === 1) {
          currentPageRef.current = 1;
          return newProducts;
        } else {
          return [...prev, ...newProducts];
        }
      });
      
      setOriginalProducts(prev => {
        if (pageNum === 1) {
          return newProducts;
        } else {
          return [...prev, ...newProducts];
        }
      });
      
      // Check if there are more products to load
      const hasMoreProducts = newProducts.length === 20;
      setHasMore(hasMoreProducts);
      console.log('[POSPage] Has more products:', hasMoreProducts, '(loaded', newProducts.length, 'products)');
    }
  }, [dispatch, settings]);

  // Infinite scroll observer - Reset when category changes
  useEffect(() => {
    // Reset page counter when category changes
    currentPageRef.current = 1;
    console.log('[POSPage] Category changed, reset page counter to 1');
  }, [selectedCategory]);

  // Infinite scroll observer
  useEffect(() => {
    const target = observerTarget.current;
    if (!target || searchTerm) {
      console.log('[POSPage] Infinite scroll disabled:', { hasTarget: !!target, searchTerm });
      return;
    }

    console.log('[POSPage] Setting up infinite scroll observer for category:', selectedCategory);

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const nextPage = currentPageRef.current + 1;
          console.log('[POSPage] 🔄 Infinite scroll triggered! Current page:', currentPageRef.current, '→ Next page:', nextPage);
          currentPageRef.current = nextPage;
          loadProducts(nextPage, selectedCategory);
        } else {
          console.log('[POSPage] Infinite scroll conditions not met:', {
            isIntersecting: entries[0].isIntersecting,
            hasMore,
            loading,
            currentPage: currentPageRef.current
          });
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(target);
    console.log('[POSPage] ✅ Infinite scroll observer attached');

    return () => {
      observer.disconnect();
      console.log('[POSPage] 🔌 Infinite scroll observer disconnected');
    };
  }, [hasMore, loading, searchTerm, selectedCategory, loadProducts]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      if (term.trim()) {
        const storeId = settings?.storeId || 2;
        await dispatch(searchProducts({ searchTerm: term, storeId }));
      } else {
        dispatch(clearSearch());
        setAllProducts([]);
        setOriginalProducts([]);
        setHasMore(false);
        currentPageRef.current = 1;
        
        const storeId = settings?.storeId || 2;
        dispatch(fetchProducts({ 
          storeId: storeId,
          billedBy: selectedSalesman || undefined,
          page: 1,
          perPage: 20,
          categoryId: selectedCategory
        })).then((result: any) => {
          if (result.payload) {
            const newProducts = (result.payload.data || []) as Product[];
            setAllProducts(newProducts);
            setOriginalProducts(newProducts);
            setHasMore(newProducts.length === 20);
          } else {
            setHasMore(false);
          }
        }).catch(() => {
          setHasMore(false);
        });
      }
    }, 300);
  }, [dispatch, settings]);

  // Handle barcode scan — fully uncontrolled, reads/clears via DOM ref
  const handleBarcodeKeyPress = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();

    // Read directly from DOM ref — avoids all React state timing issues
    const scanValue = barcodeInputRef.current?.value?.trim() || '';
    if (!scanValue) return;

    // Clear immediately so scanner can queue next scan
    if (barcodeInputRef.current) barcodeInputRef.current.value = '';

    const storeId = settings?.storeId || 2;
    let result: any;
    try {
      result = await dispatch(searchProducts({ searchTerm: scanValue, storeId }));
    } catch (err) {
      console.error('[Barcode] Search failed:', err);
      alert(`Search error for barcode: ${scanValue}`);
      return;
    }

    if (result.payload && result.payload.length > 0) {
      if (result.payload.length > 1) {
        // Multiple variants share the same barcode — show picker
        setMatchingVariants(result.payload);
        setShowVariantModal(true);
        return;
      }

      const product = result.payload[0];

      if (!product.available_stock || product.available_stock <= 0) {
        alert(`❌ Out of Stock!\n\n"${product.product_name}" is currently out of stock.`);
        return;
      }

      const existingItem = cartItems.find((item: any) => item.sku_code === product.sku_code);
      if (existingItem) {
        if (existingItem.quantity + 1 > product.available_stock) {
          alert(`⚠️ Insufficient Stock!\n\nAvailable: ${product.available_stock}  In Cart: ${existingItem.quantity}`);
          return;
        }
        dispatch(updateItemQuantity({ sku_code: product.sku_code, quantity: existingItem.quantity + 1 }));
      } else {
        dispatch(addItem({ product, quantity: 1 }));
      }
    } else {
      alert(`❌ Product not found\n\nBarcode: ${scanValue}`);
    }
  }, [cartItems, dispatch, settings]);

  // Handle category filter - reload products from database with category filter
  const handleCategoryFilter = (categoryId: number | null) => {
    console.log('[POSPage] 🔄 Category filter changed from', selectedCategory, 'to:', categoryId);
    
    // Update state first
    setSelectedCategory(categoryId);
    setAllProducts([]);
    setOriginalProducts([]);
    setHasMore(false); // Set to false initially, will be updated after loading
    currentPageRef.current = 1;
    
    console.log('[POSPage] 📊 Reset state - page: 1, hasMore: false (will update), products: []');
    
    const storeId = settings?.storeId || 2;
    dispatch(fetchProducts({ 
      storeId: storeId,
      billedBy: selectedSalesman || undefined,
      page: 1,
      perPage: 20,
      categoryId: categoryId
    })).then((result: any) => {
      if (result.payload) {
        const newProducts = (result.payload.data || []) as Product[];
        console.log('[POSPage] ✅ Loaded', newProducts.length, 'products for category:', categoryId);
        setAllProducts(newProducts);
        setOriginalProducts(newProducts);
        const hasMoreProducts = newProducts.length === 20;
        setHasMore(hasMoreProducts);
        console.log('[POSPage] 📄 Page 1 loaded, hasMore:', hasMoreProducts);
      } else {
        console.log('[POSPage] ⚠️ No payload received');
        setHasMore(false);
      }
    }).catch((error) => {
      console.error('[POSPage] ❌ Error loading products:', error);
      setHasMore(false);
    });
  };

  const handleAddToCart = (product: Product) => {
    // Check if product is out of stock
    if (!product.available_stock || product.available_stock <= 0) {
      alert(`❌ Out of Stock!\n\n"${product.product_name}" is currently out of stock and cannot be added to cart.`);
      return;
    }

    // Check if product already exists in cart
    const existingItem = cartItems.find((item: any) => item.sku_code === product.sku_code);
    
    if (existingItem) {
      // Check if incrementing would exceed available stock
      if (existingItem.quantity + 1 > product.available_stock) {
        alert(`⚠️ Insufficient Stock!\n\n"${product.product_name}"\n\nAvailable: ${product.available_stock}\nIn Cart: ${existingItem.quantity}\n\nCannot add more items.`);
        return;
      }
      
      // If exists, increment quantity
      dispatch(updateItemQuantity({ 
        sku_code: product.sku_code, 
        quantity: existingItem.quantity + 1 
      }));
    } else {
      // If new, add to cart
      dispatch(addItem({ product, quantity: 1 }));
    }
  };

  const handleUpdateQuantity = (sku: string, quantity: number) => {
    dispatch(updateItemQuantity({ sku_code: sku, quantity }));
  };

  const handleRemoveItem = (sku: string) => {
    dispatch(removeItem(sku));
  };

  const handleOpenPaymentModal = () => {
    if (cartItems.length === 0) return;
    
    if (settings?.showSaleModal === false) {
      // Direct order: set defaults and checkout immediately
      handleCheckout(total, 0, 'flat');
    } else {
      setShowPaymentModal(true);
      setReceivedAmount(total.toString());
      setOrderDiscount(0);
      setDiscountType('flat');
      setIsDuePayment(false);
    }
  };

  const handleQuickAmount = (amount: number) => {
    const currentAmount = parseFloat(receivedAmount) || 0;
    const newAmount = currentAmount + amount;
    setReceivedAmount(newAmount.toString());
  };

  const calculateDiscountAmount = () => {
    if (discountType === 'percentage') {
      return (total * orderDiscount) / 100;
    }
    return orderDiscount;
  };

  const calculateFinalTotal = () => {
    const finalTotal = total - calculateDiscountAmount();
    return Number(finalTotal.toFixed(2));
  };

  const calculateChange = () => {
    const received = parseFloat(receivedAmount) || 0;
    const finalTotal = calculateFinalTotal();
    return Math.max(0, received - finalTotal);
  };

  const calculateDueAmount = () => {
    const received = parseFloat(receivedAmount) || 0;
    const finalTotal = calculateFinalTotal();
    return Math.max(0, finalTotal - received);
  };

  const handleCheckout = async (forcedReceived?: number, forcedDiscount?: number, forcedDiscountType?: 'flat' | 'percentage') => {
    if (cartItems.length === 0) return;

    const received = forcedReceived !== undefined ? forcedReceived : (parseFloat(receivedAmount) || 0);
    
    let discountAmt = 0;
    let dType: 'flat' | 'percentage' = 'flat';

    if (forcedDiscount !== undefined) {
      dType = forcedDiscountType || 'flat';
      discountAmt = dType === 'percentage' ? (total * forcedDiscount) / 100 : forcedDiscount;
    } else {
      dType = discountType;
      discountAmt = calculateDiscountAmount();
    }

    const finalTotal = total - discountAmt;
    const discountAmount = discountAmt;
    
    // Check if payment is sufficient (allow due payment if enabled)
    const finalTotalRounded = Number(finalTotal.toFixed(2));
    const receivedRounded = Number(received.toFixed(2));
    if (!isDuePayment && receivedRounded < finalTotalRounded) {
      alert('Received amount is less than total amount! Enable "Due Payment" to proceed.');
      return;
    }

    // Calculate total quantity
    const totalQuantity = cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0);

    const paymentStatus = isDuePayment && received < finalTotal ? 'partial' : 'paid';
    const orderStatus = isDuePayment && received < finalTotal ? 'pending' : 'completed';

    // Calculate VAT percentage from settings (only if set)
    const vatPercentage = settings?.taxRate ? (settings.taxRate * 100).toFixed(0) : '0';

    // Get customer name for display
    const customer = customers.find((c) => c.id === selectedCustomer);
    const customerName = customer?.name || 'Customer';
    
    if (!selectedCustomer) {
      alert('Please select a customer before checkout');
      return;
    }
    
    const salesmanId = selectedSalesman ? Number(selectedSalesman) : null;
    const orderData = {
      customer_id: Number(selectedCustomer),
      customer_name: customerName,
      store_id: settings?.storeId || 1,
      billed_by: salesmanId, // Salesman/Employee ID (optional)
      salesman_id: salesmanId, // Salesman/Employee ID (optional)
      sub_total: subtotal,
      discount_amount: discountAmount,
      discount_type: dType,
      vat: vatPercentage,
      vat_amount: tax,
      total_quantity: totalQuantity,
      total_amount: finalTotal,
      payment_method: paymentMethod || 2, // Use payment method ID
      paid_amount: received,
      change_amount: received > finalTotal ? calculateChange() : 0,
      payment_status: paymentStatus,
      status: orderStatus,
      order_type: 'pos',
      shipping_address: '',
      is_tax_inclusive: settings?.isTaxInclusive || false,
      note: isDuePayment && received < finalTotal ? `Due: ${siteSettings?.currency_icon || '৳'}${calculateDueAmount().toFixed(2)}` : '',
      items: cartItems.map((item: any) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_variant_id: item.variant_id || null,
        sku_code: item.sku_code,
        variant_attributes: item.variant_attributes || null,
        quantity: item.quantity,
        price: item.unit_price,
        total: item.total,
        vat_percentage: item.product?.vat_percentage || (settings?.taxRate ? settings.taxRate * 100 : 0),
      })),
    };
    
    console.log('[POSPage] Creating order with salesman ID:', selectedSalesman);

    const result: any = await dispatch(createOrder(orderData));
    
    if (result.payload) {
      // Close payment modal
      setShowPaymentModal(false);
      
      // Clear cart
      dispatch(clearCart());
      
      // Reset form
      setOrderDiscount(0);
      setDiscountType('flat');
      setReceivedAmount('');
      setIsDuePayment(false);
      
      // Reload products to show updated stock
      setAllProducts([]);
      setOriginalProducts([]);
      setHasMore(false);
      currentPageRef.current = 1;
      
      const storeId = settings?.storeId || 2;
      dispatch(fetchProducts({ 
        storeId: storeId,
        billedBy: selectedSalesman || undefined,
        page: 1,
        perPage: 20,
        categoryId: selectedCategory
      })).then((result: any) => {
        if (result.payload) {
          const newProducts = (result.payload.data || []) as Product[];
          setAllProducts(newProducts);
          setOriginalProducts(newProducts);
          setHasMore(newProducts.length === 20);
        } else {
          setHasMore(false);
        }
      }).catch(() => {
        setHasMore(false);
      });
      
      // Show invoice with order data
      setCreatedOrder({
        ...result.payload,
        items: orderData.items,
        sub_total: orderData.sub_total,
        discount_amount: discountAmount,
        discount_type: dType,
        vat: orderData.vat,
        vat_amount: orderData.vat_amount,
        total_amount: finalTotal,
        paid_amount: received,
        change_amount: received > finalTotal ? calculateChange() : 0,
        payment_status: paymentStatus,
        customer_name: orderData.customer_name,
        customer_phone: customer?.phone || '',
        payment_method: paymentMethod,
        created_at: new Date().toISOString(),
      });
      console.log('[POSPage] ✅ Order created successfully. Triggering invoice modal...', result.payload.order_id);
      setShowInvoice(true);
    } else {
      console.error('[POSPage] ❌ Order creation failed or payload empty:', result.error);
      alert(`❌ Order creation failed: ${result.error?.message || 'Unknown error occurred. Please check console logs.'}`);
    }
  };

  const isSaleDisabled = !receivedAmount || (!isDuePayment && parseFloat(receivedAmount) < calculateFinalTotal());

  const handlePaymentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isSaleDisabled) {
      e.preventDefault();
      handleCheckout();
    }
  };

  const displayProducts = searchTerm ? searchResults : allProducts;

  return (
    <div className="h-[calc(100vh-4rem)] w-full bg-gray-50">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-4 h-full p-0 lg:p-4">
        {/* Products Section - Takes 8 columns on large screens, full width on mobile */}
        <div className="col-span-1 lg:col-span-8 bg-white lg:rounded-xl lg:shadow-lg flex flex-col overflow-hidden">
          {/* Search and Filters - Professional Design */}
          <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="flex-1 w-full">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search products by name or SKU..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-800 text-sm font-medium focus:ring-2 focus:ring-blue-300 border-0 shadow-md placeholder-gray-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => handleSearch('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div className="w-full sm:w-56">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    placeholder="Scan or enter barcode..."
                    onKeyDown={handleBarcodeKeyPress}
                    className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-800 text-sm font-medium focus:ring-2 focus:ring-blue-300 border-0 shadow-md placeholder-gray-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => handleCategoryFilter(null)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === null
                    ? 'bg-white text-blue-600'
                    : 'bg-blue-500 text-white hover:bg-blue-400'
                }`}
              >
                All Products
              </button>
              {categories.slice(0, 4).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryFilter(cat.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-white text-blue-600'
                      : 'bg-blue-500 text-white hover:bg-blue-400'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 text-lg">⏳ Loading products...</div>
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 text-lg">📦 No products found</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3">
              {displayProducts.map((product: Product) => (
                <div
                  key={product.sku_code}
                  onClick={() => handleAddToCart(product)}
                  className="bg-white border-2 border-gray-200 rounded-xl p-3 cursor-pointer hover:border-blue-500 hover:shadow-xl transition-all transform hover:-translate-y-1"
                >
                  {product.preview_image ? (
                    <img
                      src={product.preview_image}
                      alt={product.product_name}
                      className="w-full h-28 object-cover rounded-lg mb-2"
                    />
                  ) : (
                    <div className="w-full h-28 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-2 flex items-center justify-center">
                      <span className="text-4xl">📦</span>
                    </div>
                  )}
                  {settings?.showProductTitle !== false && (
                    <h3 className="font-semibold text-sm truncate text-gray-800">{product.product_name}</h3>
                  )}
                  {product.variant_attributes && (
                    <p className="text-xs text-gray-500 truncate">{product.variant_attributes}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    {settings?.showProductPrice !== false && (
                      <p className="text-lg font-bold text-blue-600">
                        {siteSettings?.currency_icon || '৳'}{product.final_sale_price || product.unit_price}
                      </p>
                    )}
                    {settings?.showStockBadge !== false && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        product.available_stock > 10 
                          ? 'bg-green-100 text-green-700' 
                          : product.available_stock > 0 
                          ? 'bg-yellow-100 text-yellow-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {product.available_stock} left
                      </span>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Infinite scroll trigger */}
              {!searchTerm && hasMore && (
                <div 
                  key={`observer-${selectedCategory}`} 
                  ref={observerTarget} 
                  className="col-span-full py-4 text-center"
                >
                  {loading ? (
                    <div className="text-gray-500">⏳ Loading more products...</div>
                  ) : (
                    <div className="h-4 text-gray-400 text-xs">Scroll for more...</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cart Section - Takes 4 columns on large screens, full width on mobile */}
      <div className="col-span-1 lg:col-span-4 bg-white lg:rounded-xl lg:shadow-lg flex flex-col overflow-hidden h-screen lg:h-full">
        {/* Cart Header - Professional Design */}
        <div className="p-4 bg-gradient-to-r from-green-600 to-green-700 text-white">
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Cart
          </h2>
          
          {/* Customer & Salesman - Searchable Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide">Customer</label>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomerModal(true)}
                    className="bg-white/20 hover:bg-white text-white hover:text-green-700 h-5 w-5 rounded flex items-center justify-center font-bold text-xs transition-all shadow-xs cursor-pointer"
                    title="Add New Customer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
              <SearchableSelect
                options={customers.map((c) => ({ id: c.id, name: c.name }))}
                value={selectedCustomer}
                onChange={(value) => setSelectedCustomer(value as number)}
                placeholder="Select Customer"
                icon="👤"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide">Salesman (Optional)</label>
              <SearchableSelect
                options={[
                  { id: '', name: 'No Salesman (Optional)' },
                  ...employees.map((e) => ({
                    id: e.id,
                    name: `${e.name}${e.role ? ` (${e.role})` : ''}`,
                  }))
                ]}
                value={selectedSalesman || ''}
                onChange={(value) => setSelectedSalesman(value ? Number(value) : null)}
                placeholder="Select Salesman (Optional)"
                icon="👨‍💼"
              />
            </div>
          </div>
        </div>

        {/* Cart Items - Compact */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 min-h-0 bg-gray-50">
          {cartItems.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <div className="text-4xl mb-2">🛍️</div>
              <p className="text-sm">Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {cartItems.map((item: any) => (
                <div key={item.sku_code} className="bg-gradient-to-r from-white to-green-50 border-l-4 border-green-500 rounded-lg p-2 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-1.5">
                    <div className="flex-1 pr-2">
                      <h4 className="font-bold text-sm text-gray-800 leading-tight">{item.product_name}</h4>
                      {item.variant_attributes && (
                        <p className="text-xs text-gray-500">{item.variant_attributes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.sku_code)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full w-5 h-5 flex items-center justify-center font-bold text-sm flex-shrink-0"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleUpdateQuantity(item.sku_code, item.quantity - 1)}
                        className="w-7 h-7 bg-red-500 text-white rounded hover:bg-red-600 font-bold text-sm transition-colors"
                      >
                        -
                      </button>
                      <span className="w-10 text-center font-bold text-sm bg-white px-2 py-1 rounded">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.sku_code, item.quantity + 1)}
                        className="w-7 h-7 bg-green-500 text-white rounded hover:bg-green-600 font-bold text-sm transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">{siteSettings?.currency_icon || '৳'}{item.unit_price} × {item.quantity}</div>
                      <div className="font-bold text-base text-green-600">{siteSettings?.currency_icon || '৳'}{item.total.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals - Compact & Highlighted */}
        <div className="p-3 bg-gradient-to-br from-gray-50 to-white border-t-2 border-gray-200">
          <div className="bg-white rounded-lg p-3 shadow-inner mb-3 border-2 border-green-100">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Subtotal:</span>
              <span className="font-semibold">{siteSettings?.currency_icon || '৳'}{subtotal.toFixed(2)}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>VAT{settings?.taxRate ? ` (${(settings.taxRate * 100).toFixed(0)}%)` : ''}{settings?.isTaxInclusive ? ' (Incl.)' : ''}:</span>
                <span className="font-semibold">{siteSettings?.currency_icon || '৳'}{tax.toFixed(2)}</span>
              </div>
            )}
            {orderDiscount > 0 && (
              <div className="flex justify-between text-xs text-red-600 mb-1">
                <span>Discount:</span>
                <span className="font-semibold">-{siteSettings?.currency_icon || '৳'}{orderDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t-2 border-green-200 text-gray-800">
              <span>Total:</span>
              <span className="text-green-600">{siteSettings?.currency_icon || '৳'}{(total - orderDiscount).toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method - Compact */}
          <div className="mb-3">
            <label className="block text-xs font-semibold mb-1.5 text-gray-700">Payment Method</label>
            <div className="grid grid-cols-2 gap-1.5">
              {paymentMethods.length > 0 ? (
                paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => dispatch(setPaymentMethod(method.id))}
                    className={`py-1.5 px-2 rounded text-xs font-medium transition-all ${
                      paymentMethod === method.id
                        ? 'bg-green-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {method.slug === 'cash' ? '💵' : method.slug === 'bkash' ? '📱' : '💳'} {method.name}
                  </button>
                ))
              ) : (
                <>
                  <button
                    onClick={() => dispatch(setPaymentMethod(2))}
                    className={`py-1.5 px-2 rounded text-xs font-medium transition-all ${
                      paymentMethod === 2
                        ? 'bg-green-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    💵 Cash
                  </button>
                  <button
                    onClick={() => dispatch(setPaymentMethod(9))}
                    className={`py-1.5 px-2 rounded text-xs font-medium transition-all ${
                      paymentMethod === 9
                        ? 'bg-green-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    📱 Bkash
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleOpenPaymentModal}
            disabled={cartItems.length === 0}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-base shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
          >
            💰 Complete Payment
          </button>
        </div>
      </div>
    </div>

      {/* Invoice Modal */}
      {showInvoice && createdOrder && (
        <InvoiceModal
          orderData={createdOrder}
          onClose={() => {
            setShowInvoice(false);
            setCreatedOrder(null);
          }}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-xl font-bold text-gray-800">Payable Amount</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Payable Amount Display */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-600 mb-2">Payable Amount</label>
                <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                  <div className="text-3xl font-bold text-gray-800">{siteSettings?.currency_icon || '৳'}{calculateFinalTotal().toFixed(2)}</div>
                  {orderDiscount > 0 && (
                    <div className="text-sm text-gray-500 mt-1">
                      Original: {siteSettings?.currency_icon || '৳'}{total.toFixed(2)} - Discount: {siteSettings?.currency_icon || '৳'}{calculateDiscountAmount().toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              {/* Discount Input with Type Selector */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-600 mb-2">Discount</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={orderDiscount === 0 ? '' : orderDiscount}
                    onChange={(e) => {
                      const value = e.target.value;
                      setOrderDiscount(value === '' ? 0 : parseFloat(value) || 0);
                    }}
                    placeholder={discountType === 'percentage' ? 'Enter %' : 'Enter amount'}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none text-lg"
                  />
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'flat' | 'percentage')}
                    className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none text-lg bg-white"
                  >
                    <option value="flat">{siteSettings?.currency_icon || '৳'} Flat</option>
                    <option value="percentage">% Percent</option>
                  </select>
                </div>
                {discountType === 'percentage' && orderDiscount > 0 && (
                  <div className="text-xs text-green-600 mt-1">
                    Discount Amount: {siteSettings?.currency_icon || '৳'}{calculateDiscountAmount().toFixed(2)}
                  </div>
                )}
              </div>

              {/* Received Amount Input */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-600 mb-2">Received Amount</label>
                <input
                  ref={receivedAmountInputRef}
                  type="text"
                  inputMode="decimal"
                  value={receivedAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    // Allow only numbers, decimals, and empty string
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setReceivedAmount(val);
                    }
                  }}
                  onKeyDown={handlePaymentKeyDown}
                  placeholder="Enter payment amount"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none text-lg"
                />
              </div>

              {/* Change Amount Display (Real-time) */}
              {receivedAmount && parseFloat(receivedAmount) > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-600 mb-2">
                    {parseFloat(receivedAmount) >= calculateFinalTotal() ? 'Change Amount' : 'Due Amount'}
                  </label>
                  <div className={`rounded-lg p-4 border-2 ${
                    parseFloat(receivedAmount) >= calculateFinalTotal()
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className={`text-2xl font-bold ${
                      parseFloat(receivedAmount) >= calculateFinalTotal()
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {siteSettings?.currency_icon || '৳'}{parseFloat(receivedAmount) >= calculateFinalTotal() 
                        ? calculateChange().toFixed(2) 
                        : calculateDueAmount().toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-6">
                <button
                  onClick={() => handleQuickAmount(100)}
                  className="py-2 px-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 transition-colors"
                >
                  +100
                </button>
                <button
                  onClick={() => handleQuickAmount(200)}
                  className="py-2 px-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 transition-colors"
                >
                  +200
                </button>
                <button
                  onClick={() => handleQuickAmount(500)}
                  className="py-2 px-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 transition-colors"
                >
                  +500
                </button>
                <button
                  onClick={() => handleQuickAmount(1000)}
                  className="py-2 px-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 transition-colors"
                >
                  +1000
                </button>
              </div>

              {/* Due Payment Toggle */}
              <div className="mb-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDuePayment}
                    onChange={(e) => setIsDuePayment(e.target.checked)}
                    className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm font-semibold text-gray-700">Allow Due Payment</span>
                </label>
              </div>

              {/* Sale Button */}
              <button
                onClick={() => handleCheckout()}
                disabled={isSaleDisabled}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-lg hover:shadow-xl transition-all"
              >
                {isDuePayment && parseFloat(receivedAmount) < calculateFinalTotal() ? 'Sale with Due' : 'Sale'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Variant Selector Modal */}
      {showVariantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 transform scale-100 transition-all duration-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Select Product Variant</h3>
                <p className="text-sm text-blue-100 mt-1">
                  Barcode: <span className="font-mono bg-blue-800 px-2 py-0.5 rounded text-xs">{matchingVariants[0]?.barcode}</span>
                </p>
              </div>
              <button
                onClick={() => setShowVariantModal(false)}
                className="text-white hover:text-gray-200 transition-colors p-2 rounded-full hover:bg-white/10"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              <p className="text-sm text-gray-500 font-medium">
                Multiple variants found for this barcode. Please select the correct variant to add to the cart:
              </p>
              <div className="space-y-3">
                {matchingVariants.map((variant) => {
                  const isOutOfStock = !variant.available_stock || variant.available_stock <= 0;
                  return (
                    <div
                      key={variant.sku_code}
                      onClick={() => {
                        if (isOutOfStock) {
                          alert(`❌ Out of Stock!\n\n"${variant.product_name}" is currently out of stock.`);
                          return;
                        }
                        handleAddToCart(variant);
                        setShowVariantModal(false);
                      }}
                      className={`flex justify-between items-center p-4 border rounded-xl transition-all cursor-pointer ${
                        isOutOfStock
                          ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
                          : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50/30 hover:shadow-md'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">
                          {variant.product_name}
                        </h4>
                        <div className="flex flex-wrap gap-2 mt-1 items-center">
                          <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {variant.sku_code}
                          </span>
                          {variant.variant_attributes && (
                            <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                              {variant.variant_attributes}
                            </span>
                          )}
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            isOutOfStock
                              ? 'bg-red-100 text-red-800'
                              : variant.available_stock <= 10
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            Stock: {variant.available_stock}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-lg font-bold text-gray-900">
                          {siteSettings?.currency_icon || '৳'}{variant.final_sale_price || variant.unit_price}
                        </span>
                        <span className="text-xs font-semibold text-blue-600 hover:underline mt-1">
                          Select & Add →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowVariantModal(false)}
                className="px-5 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal for Direct Printing */}
      {showInvoice && createdOrder && (
        <InvoiceModal
          orderData={createdOrder}
          autoPrint={true}
          isHidden={true}
          onClose={() => {
            setShowInvoice(false);
            setCreatedOrder(null);
          }}
        />
      )}

      {/* Quick Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 animate-scale-up">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Add New Customer</h3>
                  <p className="text-xs text-green-100">Create & select customer instantly</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddCustomerModal(false);
                  setCustomerModalError(null);
                }}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
              {customerModalError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{customerModalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="e.g. Rahim Ahmed"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="e.g. 01700000000 / +880..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  placeholder="e.g. customer@example.com"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Address
                </label>
                <textarea
                  rows={2}
                  value={newCustomerAddress}
                  onChange={(e) => setNewCustomerAddress(e.target.value)}
                  placeholder="e.g. Road 12, Gulshan-2, Dhaka"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCustomerModal(false);
                    setCustomerModalError(null);
                  }}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCustomer || !newCustomerName.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg transition-all"
                >
                  {savingCustomer ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Save Customer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
