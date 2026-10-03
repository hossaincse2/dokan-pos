import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchOrders } from '../store/slices/ordersSlice';
import InvoiceModal from '../components/InvoiceModal';
import SalesReportModal from '../components/SalesReportModal';

export default function OrdersPage() {
  console.log('[OrdersPage] ========== COMPONENT RENDERING ==========');
  
  const dispatch = useDispatch<AppDispatch>();
  const { siteSettings } = useSelector((state: RootState) => state.settings);
  const { items: orders, loading } = useSelector((state: RootState) => state.orders);
  const [filter, setFilter] = useState<'all' | 'synced' | 'unsynced'>('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showSalesReport, setShowSalesReport] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  useEffect(() => {
    console.log('[OrdersPage] Fetching orders with filter:', filter);
    const params = filter === 'all' ? {} : { synced: filter === 'synced' };
    dispatch(fetchOrders(params));
    loadPaymentMethods();
  }, [dispatch, filter]);

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

  // Get today's date
  const today = new Date().toISOString().split('T')[0];
  
  // Filter today's orders
  const todayOrders = orders.filter(order => {
    const orderDate = new Date(order.created_at).toISOString().split('T')[0];
    return orderDate === today;
  });

  // State for orders with items loaded
  const [todayOrdersWithItems, setTodayOrdersWithItems] = useState<any[]>([]);

  // Calculate today's totals
  const todayTotalSales = todayOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
  
  // Calculate paid and due correctly:
  // - If paid >= total, then paid = total (ignore overpayment/change)
  // - If paid < total, then due = total - paid
  const todayTotalPaid = todayOrders.reduce((sum, order) => {
    const total = order.total_amount || 0;
    const paid = order.paid_amount || 0;
    // Only count up to the total amount (don't count overpayment)
    return sum + Math.min(paid, total);
  }, 0);
  
  const todayTotalDue = todayOrders.reduce((sum, order) => {
    const total = order.total_amount || 0;
    const paid = order.paid_amount || 0;
    // Only count due if paid is less than total
    return sum + Math.max(0, total - paid);
  }, 0);

  // Apply filters
  const filteredOrders = orders.filter(order => {
    // Search by order ID
    if (searchTerm && !order.local_id.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filter by status
    if (statusFilter !== 'all' && order.status !== statusFilter) {
      return false;
    }
    
    // Filter by date
    if (dateFilter) {
      const orderDate = new Date(order.created_at).toISOString().split('T')[0];
      if (orderDate !== dateFilter) {
        return false;
      }
    }
    
    return true;
  });

  // Calculate filtered totals
  const filteredTotalSales = filteredOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
  
  // Calculate paid and due correctly:
  // - If paid >= total, then paid = total (ignore overpayment/change)
  // - If paid < total, then due = total - paid
  const filteredTotalPaid = filteredOrders.reduce((sum, order) => {
    const total = order.total_amount || 0;
    const paid = order.paid_amount || 0;
    // Only count up to the total amount (don't count overpayment)
    return sum + Math.min(paid, total);
  }, 0);
  
  const filteredTotalDue = filteredOrders.reduce((sum, order) => {
    const total = order.total_amount || 0;
    const paid = order.paid_amount || 0;
    // Only count due if paid is less than total
    return sum + Math.max(0, total - paid);
  }, 0);

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateFilter]);

  const handlePrintOrder = async (order: any) => {
    // Fetch order details with items
    try {
      const orderDetails = await window.electronAPI.getOrder(order.local_id);
      if (orderDetails) {
        setSelectedOrder(orderDetails);
        setShowInvoice(true);
      }
    } catch (error) {
      console.error('Failed to fetch order details:', error);
      alert('Failed to load order details');
    }
  };

  const handleShowSalesReport = async () => {
    // Load all today's orders with their items
    try {
      const ordersWithItems = await Promise.all(
        todayOrders.map(async (order) => {
          try {
            const orderDetails = await window.electronAPI.getOrder(order.local_id);
            return orderDetails || order;
          } catch (error) {
            console.error('Failed to load order:', order.local_id, error);
            return order;
          }
        })
      );
      setTodayOrdersWithItems(ordersWithItems);
      setShowSalesReport(true);
    } catch (error) {
      console.error('Failed to load orders with items:', error);
      alert('Failed to load sales report data');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
            <p className="text-sm text-gray-500 mt-1">Manage and track all your orders</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleShowSalesReport}
              disabled={todayOrders.length === 0}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Sales Report
            </button>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => { setFilter('all'); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  filter === 'all' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({orders.length})
              </button>
              <button
                onClick={() => { setFilter('synced'); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  filter === 'synced' 
                    ? 'bg-white text-green-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Synced
              </button>
              <button
                onClick={() => { setFilter('unsynced'); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  filter === 'unsynced' 
                    ? 'bg-white text-yellow-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Pending
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search by Order ID */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by Order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Filter by Status */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Filter by Date */}
          <div className="relative">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Clear Filters */}
          {(searchTerm || statusFilter !== 'all' || dateFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setDateFilter('');
              }}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear Filters
            </button>
          )}
        </div>

        {/* Filtered Summary Boxes */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-blue-600 uppercase">
                {(searchTerm || statusFilter !== 'all' || dateFilter) ? 'Filtered Orders' : "Today's Orders"}
              </p>
              <svg className="w-8 h-8 text-blue-600 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-blue-900">
              {(searchTerm || statusFilter !== 'all' || dateFilter) ? filteredOrders.length : todayOrders.length}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {(searchTerm || statusFilter !== 'all' || dateFilter) ? 'Matching filters' : new Date().toLocaleDateString()}
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-green-600 uppercase">Total Sales</p>
              <svg className="w-8 h-8 text-green-600 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-green-900">
              {siteSettings?.currency_icon || '৳'}{((searchTerm || statusFilter !== 'all' || dateFilter) ? filteredTotalSales : todayTotalSales).toFixed(2)}
            </p>
            <p className="text-xs text-green-600 mt-1">
              {(searchTerm || statusFilter !== 'all' || dateFilter) ? 'Filtered revenue' : "Today's revenue"}
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-purple-600 uppercase">Total Paid</p>
              <svg className="w-8 h-8 text-purple-600 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-purple-900">
              {siteSettings?.currency_icon || '৳'}{((searchTerm || statusFilter !== 'all' || dateFilter) ? filteredTotalPaid : todayTotalPaid).toFixed(2)}
            </p>
            <p className="text-xs text-purple-600 mt-1">Collected amount</p>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-red-600 uppercase">Total Due</p>
              <svg className="w-8 h-8 text-red-600 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-red-900">
              {siteSettings?.currency_icon || '৳'}{((searchTerm || statusFilter !== 'all' || dateFilter) ? filteredTotalDue : todayTotalDue).toFixed(2)}
            </p>
            <p className="text-xs text-red-600 mt-1">Pending payment</p>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No orders found</h3>
            <p className="mt-2 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' || dateFilter 
                ? 'Try adjusting your filters' 
                : 'Start creating orders from the POS page'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Sync
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentOrders.map((order) => (
                    <tr key={order.local_id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <span className="text-sm font-mono font-medium text-gray-900">
                            #{order.local_id.substring(0, 8)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-gray-900">{siteSettings?.currency_icon || '৳'}{(order.total_amount || 0).toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {getPaymentMethodName(order.payment_method)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            order.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {order.status === 'completed' ? '✓ Completed' : '⏳ Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {new Date(order.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {order.synced_at ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Synced
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-600">
                            <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handlePrintOrder(order)}
                          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          Print
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-700">
                    Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(indexOfLastItem, filteredOrders.length)}</span> of{' '}
                    <span className="font-medium">{filteredOrders.length}</span> orders
                  </span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => paginate(pageNum)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

      </div>

      {/* Invoice Modal */}
      {showInvoice && selectedOrder && (
        <InvoiceModal
          orderData={selectedOrder}
          onClose={() => {
            setShowInvoice(false);
            setSelectedOrder(null);
          }}
        />
      )}

      {/* Sales Report Modal */}
      {showSalesReport && (
        <SalesReportModal
          orders={todayOrdersWithItems}
          onClose={() => setShowSalesReport(false)}
        />
      )}
    </div>
  );
}
