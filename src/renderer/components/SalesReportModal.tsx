import { useEffect, useState } from 'react';

interface SalesReportModalProps {
  orders: any[];
  onClose: () => void;
}

export default function SalesReportModal({ orders, onClose }: SalesReportModalProps) {
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  useEffect(() => {
    loadSiteSettings();
    loadPaymentMethods();
  }, []);

  const loadSiteSettings = async () => {
    try {
      const settings = await window.electronAPI.getSiteSettings();
      setSiteSettings(settings);
    } catch (error) {
      console.error('Failed to load site settings:', error);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const methods = await window.electronAPI.getPaymentMethods();
      setPaymentMethods(methods || []);
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    }
  };

  const getPaymentMethodName = (paymentMethod: string | number) => {
    // If it's already a string name, return it
    if (typeof paymentMethod === 'string' && isNaN(Number(paymentMethod))) {
      return paymentMethod;
    }
    
    // If it's a number or numeric string, look up the name
    const methodId = typeof paymentMethod === 'number' ? paymentMethod : parseInt(paymentMethod);
    const method = paymentMethods.find(m => m.id === methodId);
    return method?.name || 'Cash';
  };

  const getImageUrl = (imagePath: string | null | undefined) => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const baseURL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';
    return imagePath.startsWith('/') ? `${baseURL}${imagePath}` : `${baseURL}/${imagePath}`;
  };

  // Calculate totals
  const totalSales = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
  
  // Calculate paid and due correctly:
  // - If paid >= total, then paid = total (ignore overpayment/change)
  // - If paid < total, then due = total - paid
  const totalPaid = orders.reduce((sum, order) => {
    const total = order.total_amount || 0;
    const paid = order.paid_amount || 0;
    // Only count up to the total amount (don't count overpayment)
    return sum + Math.min(paid, total);
  }, 0);
  
  const totalDue = orders.reduce((sum, order) => {
    const total = order.total_amount || 0;
    const paid = order.paid_amount || 0;
    // Only count due if paid is less than total
    return sum + Math.max(0, total - paid);
  }, 0);
  
  const totalOrders = orders.length;

  // Group by payment method
  const paymentMethodTotals = orders.reduce((acc, order) => {
    const methodName = getPaymentMethodName(order.payment_method || 2);
    if (!acc[methodName]) {
      acc[methodName] = { count: 0, amount: 0 };
    }
    acc[methodName].count += 1;
    acc[methodName].amount += order.total_amount || 0;
    return acc;
  }, {} as Record<string, { count: number; amount: number }>);

  // Product-wise summary (aggregate from all orders)
  const productSummary = orders.reduce((acc, order) => {
    console.log('[SalesReport] Processing order:', order.local_id, 'Items:', order.items);
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        const key = item.sku_code || item.product_name;
        if (!acc[key]) {
          acc[key] = {
            product_name: item.product_name,
            sku_code: item.sku_code,
            quantity: 0,
            total: 0,
            price: item.price || 0
          };
        }
        acc[key].quantity += item.quantity || 0;
        acc[key].total += item.total || 0;
      });
    } else {
      console.log('[SalesReport] Order has no items:', order.local_id);
    }
    return acc;
  }, {} as Record<string, any>);

  const productList = Object.values(productSummary);
  console.log('[SalesReport] Product summary:', productList.length, 'products', productList);
  console.log('[SalesReport] Payment methods:', paymentMethodTotals);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header - No Print */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 print:hidden">
          <h2 className="text-2xl font-bold text-gray-900">Sales Report</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Report
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Report Content - Printable */}
        <div className="flex-1 overflow-y-auto p-8 print:p-0">
          <div className="max-w-3xl mx-auto print:max-w-full" id="sales-report">
            {/* Company Header */}
            <div className="text-center mb-8 pb-6 border-b-2 border-gray-300">
              {siteSettings?.invoice_logo && (
                <img 
                  src={getImageUrl(siteSettings.invoice_logo)} 
                  alt="Company Logo" 
                  className="h-16 mx-auto mb-3"
                  onError={(e) => e.currentTarget.style.display = 'none'}
                />
              )}
              <h1 className="text-2xl font-bold text-gray-900">{siteSettings?.title || siteSettings?.company_name || 'Karbar POS'}</h1>
              {siteSettings?.address && (
                <p className="text-sm text-gray-600 mt-1">{siteSettings.address.replace(/<[^>]*>/g, '')}</p>
              )}
              {siteSettings?.phone && (
                <p className="text-sm text-gray-600">Phone: {siteSettings.phone}</p>
              )}
              <h2 className="text-xl font-bold text-gray-900 mt-4">SALES REPORT</h2>
              <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center">
                <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Total Orders</p>
                <p className="text-2xl font-bold text-blue-900">{totalOrders}</p>
              </div>
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">
                <p className="text-xs font-semibold text-green-600 uppercase mb-1">Total Sales</p>
                <p className="text-2xl font-bold text-green-900">{siteSettings?.currency_icon || ''}{totalSales.toFixed(2)}</p>
              </div>
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 text-center">
                <p className="text-xs font-semibold text-purple-600 uppercase mb-1">Total Paid</p>
                <p className="text-2xl font-bold text-purple-900">{siteSettings?.currency_icon || ''}{totalPaid.toFixed(2)}</p>
              </div>
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-center">
                <p className="text-xs font-semibold text-red-600 uppercase mb-1">Total Due</p>
                <p className="text-2xl font-bold text-red-900">{siteSettings?.currency_icon || ''}{totalDue.toFixed(2)}</p>
              </div>
            </div>

            {/* Payment Method Summary */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-300">Payment Method Summary</h3>
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Payment Method</th>
                    <th className="px-4 py-2 text-center font-semibold text-gray-700">Orders</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-700">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Object.entries(paymentMethodTotals).map(([method, data]) => (
                    <tr key={method}>
                      <td className="px-4 py-2 text-gray-900">{method}</td>
                      <td className="px-4 py-2 text-center text-gray-900">{data.count}</td>
                      <td className="px-4 py-2 text-right font-semibold text-gray-900">{siteSettings?.currency_icon || ''}{data.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Product-wise Summary */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-300">Product-wise Summary</h3>
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Product</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">SKU</th>
                    <th className="px-4 py-2 text-center font-semibold text-gray-700">Qty</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-700">Price</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {productList.map((product, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-gray-900">{product.product_name}</td>
                      <td className="px-4 py-2 text-gray-600 text-xs font-mono">{product.sku_code}</td>
                      <td className="px-4 py-2 text-center font-semibold text-gray-900">{product.quantity}</td>
                      <td className="px-4 py-2 text-right text-gray-900">{siteSettings?.currency_icon || '৳'}{product.price.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right font-semibold text-gray-900">{siteSettings?.currency_icon || '৳'}{product.total.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan={2} className="px-4 py-3 text-gray-900">TOTAL</td>
                    <td className="px-4 py-3 text-center text-gray-900">
                      {productList.reduce((sum, p) => sum + p.quantity, 0)}
                    </td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {siteSettings?.currency_icon || '৳'}{productList.reduce((sum, p) => sum + p.total, 0).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Order-wise Summary */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-300">Order-wise Summary</h3>
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Order ID</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Customer</th>
                    <th className="px-4 py-2 text-center font-semibold text-gray-700">Items</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-700">Total</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-700">Paid</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-700">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => {
                    const due = (order.total_amount || 0) - (order.paid_amount || 0);
                    return (
                      <tr key={order.local_id}>
                        <td className="px-4 py-2 text-gray-900 font-mono text-xs">#{order.local_id.substring(0, 8)}</td>
                        <td className="px-4 py-2 text-gray-900">{order.customer_name}</td>
                        <td className="px-4 py-2 text-center text-gray-900">{order.total_quantity || 0}</td>
                        <td className="px-4 py-2 text-right font-semibold text-gray-900">{siteSettings?.currency_icon || '৳'}{(order.total_amount || 0).toFixed(2)}</td>
                        <td className="px-4 py-2 text-right text-gray-900">{siteSettings?.currency_icon || '৳'}{(order.paid_amount || 0).toFixed(2)}</td>
                        <td className={`px-4 py-2 text-right font-semibold ${due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {siteSettings?.currency_icon || '৳'}{due.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan={3} className="px-4 py-3 text-gray-900">TOTAL ({totalOrders} orders)</td>
                    <td className="px-4 py-3 text-right text-gray-900">{siteSettings?.currency_icon || '৳'}{totalSales.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{siteSettings?.currency_icon || '৳'}{totalPaid.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{siteSettings?.currency_icon || '৳'}{totalDue.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t-2 border-gray-300 text-center text-sm text-gray-600">
              <p>Generated on {new Date().toLocaleString()}</p>
              <p className="mt-2">Thank you for your business!</p>
              {siteSettings?.signature && (
                <div className="mt-6">
                  <img 
                    src={getImageUrl(siteSettings.signature)} 
                    alt="Signature" 
                    className="h-12 mx-auto mb-2"
                    onError={(e) => e.currentTarget.style.display = 'none'}
                  />
                  <p className="text-xs text-gray-500">Authorized Signature</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #sales-report, #sales-report * {
            visibility: visible;
          }
          #sales-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
