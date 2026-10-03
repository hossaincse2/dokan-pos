import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { startSync } from '../store/slices/syncSlice';
import { ReportsData, ReportFilter } from '@shared/types';

export default function ReportsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';

  const { siteSettings } = useSelector((state: RootState) => state.settings);
  const { isRunning: isSyncing } = useSelector((state: RootState) => state.sync);
  const currencyIcon = siteSettings?.currency_icon || '৳';

  // Filters
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'all'>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportsData | null>(null);

  // Search filter for tables
  const [tableSearch, setTableSearch] = useState('');

  // Payment filter for payment sales tab
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const filter: ReportFilter = {
        dateRange,
        startDate: dateRange === 'custom' ? customStartDate : undefined,
        endDate: dateRange === 'custom' ? customEndDate : undefined,
      };
      const res = await window.electronAPI.getReports(filter);
      if (res) {
        setReportData(res);
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [dateRange, customStartDate, customEndDate]);

  const handlePrint = () => {
    window.print();
  };

  const handleSyncData = async () => {
    try {
      await dispatch(startSync()).unwrap();
      await loadReports();
    } catch (err) {
      console.error('Sync failed:', err);
    }
  };

  const summary = reportData?.summary;

  // Filtered sales
  const filteredSales = useMemo(() => {
    if (!reportData?.sales?.orders) return [];
    if (!tableSearch) return reportData.sales.orders;
    const q = tableSearch.toLowerCase();
    return reportData.sales.orders.filter((o: any) =>
      (o.local_id && o.local_id.toLowerCase().includes(q)) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
      (o.customer_phone && o.customer_phone.toLowerCase().includes(q)) ||
      (o.payment_method && o.payment_method.toLowerCase().includes(q))
    );
  }, [reportData?.sales?.orders, tableSearch]);

  // Filtered purchases
  const filteredPurchases = useMemo(() => {
    if (!reportData?.purchases?.items) return [];
    if (!tableSearch) return reportData.purchases.items;
    const q = tableSearch.toLowerCase();
    return reportData.purchases.items.filter((p: any) =>
      (p.challan_no && p.challan_no.toLowerCase().includes(q)) ||
      (p.supplier_name && p.supplier_name.toLowerCase().includes(q)) ||
      (p.status && p.status.toLowerCase().includes(q))
    );
  }, [reportData?.purchases?.items, tableSearch]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    if (!reportData?.expenses?.items) return [];
    if (!tableSearch) return reportData.expenses.items;
    const q = tableSearch.toLowerCase();
    return reportData.expenses.items.filter((e: any) =>
      (e.type && e.type.toLowerCase().includes(q)) ||
      (e.category && e.category.toLowerCase().includes(q)) ||
      (e.description && e.description.toLowerCase().includes(q)) ||
      (e.expense_by_name && e.expense_by_name.toLowerCase().includes(q))
    );
  }, [reportData?.expenses?.items, tableSearch]);

  // Filtered payment orders
  const filteredPaymentOrders = useMemo(() => {
    if (!reportData?.paymentMethodSales?.orders) return [];
    let list = reportData.paymentMethodSales.orders;
    if (paymentFilter !== 'all') {
      const q = paymentFilter.toLowerCase();
      list = list.filter((o: any) => String(o.payment_method).toLowerCase().includes(q));
    }
    if (tableSearch) {
      const q = tableSearch.toLowerCase();
      list = list.filter((o: any) =>
        (o.local_id && o.local_id.toLowerCase().includes(q)) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [reportData?.paymentMethodSales?.orders, paymentFilter, tableSearch]);

  // Date range label
  const dateRangeLabel = useMemo(() => {
    if (dateRange === 'today') return 'Today';
    if (dateRange === 'yesterday') return 'Yesterday';
    if (dateRange === 'week') return 'Last 7 Days';
    if (dateRange === 'month') return 'This Month';
    if (dateRange === 'custom') {
      return `${customStartDate || 'Start'} to ${customEndDate || 'End'}`;
    }
    return 'All Time';
  }, [dateRange, customStartDate, customEndDate]);

  // Tab definitions
  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'sales', name: 'Total Sales', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
    { id: 'purchase', name: 'Total Purchase', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'expense', name: 'Total Expense', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'profit', name: 'Total Profit', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    { id: 'due', name: 'Total Due', icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'due_collection', name: 'Due Collection', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'best_sellers', name: 'Best Selling Products', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
    { id: 'low_stock', name: 'Low Stock', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    { id: 'payments', name: 'Cash/Card/bKash/Nagad sales', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  ];

  const currentTabTitle = tabs.find(t => t.id === currentTab)?.name || 'Dashboard';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Printable A4 Report Section - Visible exclusively during window.print() */}
      <div className="hidden print:block font-sans text-black p-6 bg-white max-w-[210mm] mx-auto">
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 12mm 10mm 12mm 10mm;
              }
              body * {
                visibility: hidden;
              }
              .print-container, .print-container * {
                visibility: visible !important;
              }
              .print-container {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                display: block !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `
        }} />

        <div className="print-container">
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-4 mb-4 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-wide text-slate-900">
                {siteSettings?.company_name || siteSettings?.title || 'POS Business'}
              </h1>
              <p className="text-xs text-slate-600 mt-1 max-w-sm">
                {siteSettings?.address || 'Point of Sale Station'}
              </p>
              <div className="flex gap-4 text-xs text-slate-600 mt-1">
                {siteSettings?.phone && <span>Tel: {siteSettings.phone}</span>}
                {siteSettings?.vat_number && <span>VAT/BIN: {siteSettings.vat_number}</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block bg-slate-900 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-wider mb-1">
                {currentTabTitle} Report
              </div>
              <p className="text-xs text-slate-600">Period: <strong className="text-slate-800">{dateRangeLabel}</strong></p>
              <p className="text-[11px] text-slate-500">Printed: {new Date().toLocaleString()}</p>
            </div>
          </div>

          {/* Quick Summary Grid for Print */}
          {summary && currentTab === 'dashboard' ? (
            <div className="mb-6 space-y-2">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Business Summary</div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="border border-slate-300 rounded p-2 bg-slate-50">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Total Sales</span>
                  <span className="text-base font-bold text-slate-900">{currencyIcon}{(summary.totalSales || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  <span className="text-[10px] text-slate-500 block">Today's revenue</span>
                </div>
                <div className="border border-slate-300 rounded p-2 bg-slate-50">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Returns</span>
                  <span className="text-base font-bold text-slate-900">{currencyIcon}{(summary.totalReturns || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  <span className="text-[10px] text-slate-500 block">Refunded amount</span>
                </div>
                <div className="border border-slate-300 rounded p-2 bg-slate-50">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Expenses</span>
                  <span className="text-base font-bold text-slate-900">{currencyIcon}{(summary.totalExpense || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  <span className="text-[10px] text-slate-500 block">Total expenses</span>
                </div>
                <div className="border border-slate-300 rounded p-2 bg-slate-50">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Net Amount</span>
                  <span className="text-base font-bold text-slate-900">
                    {currencyIcon}{(summary.businessNetAmount ?? ((summary.totalSales || 0) - (summary.totalReturns || 0) - (summary.totalExpense || 0))).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-500 block">Sales - Returns - Expenses</span>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                <div className="border border-slate-300 rounded p-2 bg-slate-50">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Petty Cash</span>
                  <span className="text-sm font-bold text-slate-900">{currencyIcon} {(summary.pettyCashBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border border-slate-300 rounded p-2 bg-slate-50">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Opening Balance</span>
                  <span className="text-sm font-bold text-slate-900">{currencyIcon} {(summary.openingBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border border-slate-300 rounded p-2 bg-slate-50">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Cash In</span>
                  <span className="text-sm font-bold text-emerald-700">{currencyIcon} {(summary.cashIn || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border border-slate-300 rounded p-2 bg-slate-50">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Cash Out</span>
                  <span className="text-sm font-bold text-rose-700">{currencyIcon} {(summary.cashOut || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border border-slate-300 rounded p-2 bg-slate-50">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Closing Balance</span>
                  <span className="text-sm font-bold text-slate-900">{currencyIcon} {(summary.closingBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          ) : summary ? (
            <div className="grid grid-cols-4 gap-2 mb-6 text-center text-xs">
              <div className="border border-slate-300 rounded p-2 bg-slate-50">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Total Sales</span>
                <span className="text-base font-bold text-slate-900">{currencyIcon}{summary.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                <span className="text-[10px] text-slate-500 block">{summary.totalOrders} Orders</span>
              </div>
              <div className="border border-slate-300 rounded p-2 bg-slate-50">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Total Purchases</span>
                <span className="text-base font-bold text-slate-900">{currencyIcon}{summary.totalPurchase.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                <span className="text-[10px] text-slate-500 block">{summary.totalPurchaseOrders} Bills</span>
              </div>
              <div className="border border-slate-300 rounded p-2 bg-slate-50">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Total Expenses</span>
                <span className="text-base font-bold text-slate-900">{currencyIcon}{summary.totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border border-slate-300 rounded p-2 bg-slate-50">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Net Profit</span>
                <span className={`text-base font-bold ${summary.totalNetProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {currencyIcon}{summary.totalNetProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ) : null}

          {/* Print Tab Specific Tables */}
          {currentTab === 'dashboard' && (
            <div>
              <h3 className="font-bold text-sm text-slate-800 mb-2 border-b pb-1">Payment Method Breakdown</h3>
              <table className="w-full text-xs border border-slate-300 mb-4">
                <thead className="bg-slate-100 font-semibold text-slate-700">
                  <tr>
                    <th className="border p-2 text-left">Method</th>
                    <th className="border p-2 text-center">Transactions</th>
                    <th className="border p-2 text-right">Amount</th>
                    <th className="border p-2 text-right">Share %</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData?.paymentMethodSales?.methods?.map((m, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="border p-2 font-medium">{m.method_name}</td>
                      <td className="border p-2 text-center">{m.count}</td>
                      <td className="border p-2 text-right">{currencyIcon}{m.amount.toFixed(2)}</td>
                      <td className="border p-2 text-right">{m.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 className="font-bold text-sm text-slate-800 mb-2 border-b pb-1">Top Selling Products</h3>
              <table className="w-full text-xs border border-slate-300 mb-4">
                <thead className="bg-slate-100 font-semibold text-slate-700">
                  <tr>
                    <th className="border p-2 text-left">#</th>
                    <th className="border p-2 text-left">Product</th>
                    <th className="border p-2 text-left">SKU</th>
                    <th className="border p-2 text-center">Qty Sold</th>
                    <th className="border p-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData?.bestSellingProducts?.slice(0, 10).map((p, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="border p-2 text-slate-500">{idx + 1}</td>
                      <td className="border p-2 font-medium">{p.product_name}</td>
                      <td className="border p-2 text-slate-600">{p.sku_code}</td>
                      <td className="border p-2 text-center font-bold">{p.quantity_sold}</td>
                      <td className="border p-2 text-right">{currencyIcon}{p.total_revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {currentTab === 'sales' && (
            <table className="w-full text-xs border border-slate-300 mb-4">
              <thead className="bg-slate-100 font-semibold text-slate-700">
                <tr>
                  <th className="border p-1.5 text-left">Invoice</th>
                  <th className="border p-1.5 text-left">Customer</th>
                  <th className="border p-1.5 text-center">Items</th>
                  <th className="border p-1.5 text-left">Method</th>
                  <th className="border p-1.5 text-right">Total</th>
                  <th className="border p-1.5 text-right">Paid</th>
                  <th className="border p-1.5 text-right">Due</th>
                  <th className="border p-1.5 text-center">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((o: any, idx: number) => (
                  <tr key={idx} className="border-b">
                    <td className="border p-1.5 font-mono text-[11px]">{o.local_id}</td>
                    <td className="border p-1.5">{o.customer_name || 'Walk in'}</td>
                    <td className="border p-1.5 text-center">{o.total_quantity || 1}</td>
                    <td className="border p-1.5">{o.payment_method}</td>
                    <td className="border p-1.5 text-right font-medium">{currencyIcon}{parseFloat(o.total_amount || 0).toFixed(2)}</td>
                    <td className="border p-1.5 text-right text-emerald-700">{currencyIcon}{parseFloat(o.paid_amount || 0).toFixed(2)}</td>
                    <td className="border p-1.5 text-right text-red-700">
                      {currencyIcon}{Math.max(0, parseFloat(o.total_amount || 0) - parseFloat(o.paid_amount || 0)).toFixed(2)}
                    </td>
                    <td className="border p-1.5 text-center text-[10px]">{o.created_at?.slice(0, 16)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {currentTab === 'purchase' && (
            <table className="w-full text-xs border border-slate-300 mb-4">
              <thead className="bg-slate-100 font-semibold text-slate-700">
                <tr>
                  <th className="border p-2 text-left">Challan / Ref</th>
                  <th className="border p-2 text-left">Supplier</th>
                  <th className="border p-2 text-center">Status</th>
                  <th className="border p-2 text-center">Quantity</th>
                  <th className="border p-2 text-right">Total Amount</th>
                  <th className="border p-2 text-center">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((p: any, idx: number) => (
                  <tr key={idx} className="border-b">
                    <td className="border p-2 font-mono">{p.challan_no}</td>
                    <td className="border p-2 font-medium">{p.supplier_name}</td>
                    <td className="border p-2 text-center">{p.status}</td>
                    <td className="border p-2 text-center">{p.total_quantity}</td>
                    <td className="border p-2 text-right font-bold">{currencyIcon}{parseFloat(p.total_amount || 0).toFixed(2)}</td>
                    <td className="border p-2 text-center text-[10px]">{p.purchase_date?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {currentTab === 'expense' && (
            <table className="w-full text-xs border border-slate-300 mb-4">
              <thead className="bg-slate-100 font-semibold text-slate-700">
                <tr>
                  <th className="border p-2 text-left">Date</th>
                  <th className="border p-2 text-left">Type / Category</th>
                  <th className="border p-2 text-left">Description</th>
                  <th className="border p-2 text-left">Spent By</th>
                  <th className="border p-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((e: any, idx: number) => (
                  <tr key={idx} className="border-b">
                    <td className="border p-2">{e.expense_date}</td>
                    <td className="border p-2 font-medium">{e.type || e.category}</td>
                    <td className="border p-2 text-slate-600">{e.description || '-'}</td>
                    <td className="border p-2">{e.expense_by_name || 'Admin'}</td>
                    <td className="border p-2 text-right font-bold text-red-700">{currencyIcon}{parseFloat(e.amount || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {currentTab === 'profit' && (
            <div>
              <div className="border p-3 rounded mb-4 bg-slate-50 text-xs">
                <div className="flex justify-between py-1 border-b">
                  <span>Gross Sales Revenue:</span>
                  <span className="font-bold">{currencyIcon}{reportData?.profit?.grossSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b text-red-600">
                  <span>Less: Cost of Goods Sold (COGS):</span>
                  <span>- {currencyIcon}{reportData?.profit?.cogs.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b font-bold text-slate-900">
                  <span>Gross Profit:</span>
                  <span>{currencyIcon}{reportData?.profit?.grossProfit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b text-red-600">
                  <span>Less: Operating Expenses:</span>
                  <span>- {currencyIcon}{reportData?.profit?.totalExpenses.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 font-black text-sm text-emerald-800">
                  <span>Net Operating Profit:</span>
                  <span>{currencyIcon}{reportData?.profit?.netProfit.toFixed(2)} ({reportData?.profit?.profitMargin.toFixed(1)}%)</span>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'due' && (
            <table className="w-full text-xs border border-slate-300 mb-4">
              <thead className="bg-slate-100 font-semibold text-slate-700">
                <tr>
                  <th className="border p-2 text-left">Invoice</th>
                  <th className="border p-2 text-left">Customer</th>
                  <th className="border p-2 text-left">Phone</th>
                  <th className="border p-2 text-right">Total Bill</th>
                  <th className="border p-2 text-right">Amount Paid</th>
                  <th className="border p-2 text-right">Due Outstanding</th>
                  <th className="border p-2 text-center">Date</th>
                </tr>
              </thead>
              <tbody>
                {reportData?.dues?.orders?.map((o: any, idx: number) => (
                  <tr key={idx} className="border-b">
                    <td className="border p-2 font-mono">{o.local_id}</td>
                    <td className="border p-2 font-medium">{o.customer_name}</td>
                    <td className="border p-2">{o.customer_phone || '-'}</td>
                    <td className="border p-2 text-right">{currencyIcon}{parseFloat(o.total_amount).toFixed(2)}</td>
                    <td className="border p-2 text-right text-emerald-700">{currencyIcon}{parseFloat(o.paid_amount).toFixed(2)}</td>
                    <td className="border p-2 text-right font-bold text-red-700">{currencyIcon}{o.due_amount.toFixed(2)}</td>
                    <td className="border p-2 text-center text-[10px]">{o.created_at?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {currentTab === 'due_collection' && (
            <table className="w-full text-xs border border-slate-300 mb-4">
              <thead className="bg-slate-100 font-semibold text-slate-700">
                <tr>
                  <th className="border p-2 text-left">Invoice</th>
                  <th className="border p-2 text-left">Customer</th>
                  <th className="border p-2 text-left">Method</th>
                  <th className="border p-2 text-right">Total Amount</th>
                  <th className="border p-2 text-right">Collected Amount</th>
                  <th className="border p-2 text-center">Date</th>
                </tr>
              </thead>
              <tbody>
                {reportData?.dueCollections?.orders?.map((o: any, idx: number) => (
                  <tr key={idx} className="border-b">
                    <td className="border p-2 font-mono">{o.local_id}</td>
                    <td className="border p-2 font-medium">{o.customer_name}</td>
                    <td className="border p-2">{o.payment_method}</td>
                    <td className="border p-2 text-right">{currencyIcon}{parseFloat(o.total_amount).toFixed(2)}</td>
                    <td className="border p-2 text-right font-bold text-emerald-700">{currencyIcon}{o.collected_amount.toFixed(2)}</td>
                    <td className="border p-2 text-center text-[10px]">{o.created_at?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {currentTab === 'best_sellers' && (
            <table className="w-full text-xs border border-slate-300 mb-4">
              <thead className="bg-slate-100 font-semibold text-slate-700">
                <tr>
                  <th className="border p-2 text-left">Rank</th>
                  <th className="border p-2 text-left">Product Name</th>
                  <th className="border p-2 text-left">SKU</th>
                  <th className="border p-2 text-center">Sold Units</th>
                  <th className="border p-2 text-right">Avg Price</th>
                  <th className="border p-2 text-right">Total Revenue</th>
                  <th className="border p-2 text-right">Est. Profit</th>
                </tr>
              </thead>
              <tbody>
                {reportData?.bestSellingProducts?.map((p, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="border p-2 font-bold text-slate-500">#{idx + 1}</td>
                    <td className="border p-2 font-medium">{p.product_name}</td>
                    <td className="border p-2 font-mono text-[11px]">{p.sku_code}</td>
                    <td className="border p-2 text-center font-bold">{p.quantity_sold}</td>
                    <td className="border p-2 text-right">{currencyIcon}{p.sale_price.toFixed(2)}</td>
                    <td className="border p-2 text-right font-bold">{currencyIcon}{p.total_revenue.toFixed(2)}</td>
                    <td className="border p-2 text-right text-emerald-700">{currencyIcon}{p.estimated_profit.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {currentTab === 'low_stock' && (
            <table className="w-full text-xs border border-slate-300 mb-4">
              <thead className="bg-slate-100 font-semibold text-slate-700">
                <tr>
                  <th className="border p-2 text-left">Product</th>
                  <th className="border p-2 text-left">SKU</th>
                  <th className="border p-2 text-left">Category</th>
                  <th className="border p-2 text-center">In Stock</th>
                  <th className="border p-2 text-right">Unit Price</th>
                  <th className="border p-2 text-right">Sale Price</th>
                  <th className="border p-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData?.lowStockProducts?.map((p, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="border p-2 font-medium">{p.product_name}</td>
                    <td className="border p-2 font-mono">{p.sku_code}</td>
                    <td className="border p-2">{p.category_name || '-'}</td>
                    <td className="border p-2 text-center font-bold text-red-600">{p.available_stock}</td>
                    <td className="border p-2 text-right">{currencyIcon}{p.unit_price.toFixed(2)}</td>
                    <td className="border p-2 text-right">{currencyIcon}{p.sale_price.toFixed(2)}</td>
                    <td className="border p-2 text-center uppercase font-semibold text-[10px]">
                      {p.status.replace('_', ' ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {currentTab === 'payments' && (
            <div>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {reportData?.paymentMethodSales?.methods?.map((m, idx) => (
                  <div key={idx} className="border border-slate-300 rounded p-2 text-center bg-slate-50">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">{m.method_name}</span>
                    <span className="text-sm font-bold text-slate-900">{currencyIcon}{m.amount.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-500 block">{m.count} txns ({m.percentage.toFixed(1)}%)</span>
                  </div>
                ))}
              </div>

              <table className="w-full text-xs border border-slate-300 mb-4">
                <thead className="bg-slate-100 font-semibold text-slate-700">
                  <tr>
                    <th className="border p-2 text-left">Invoice</th>
                    <th className="border p-2 text-left">Customer</th>
                    <th className="border p-2 text-left">Method</th>
                    <th className="border p-2 text-right">Amount</th>
                    <th className="border p-2 text-center">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPaymentOrders.map((o: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="border p-2 font-mono">{o.local_id}</td>
                      <td className="border p-2">{o.customer_name || 'Walk in'}</td>
                      <td className="border p-2 font-medium">{o.payment_method}</td>
                      <td className="border p-2 text-right font-bold">{currencyIcon}{parseFloat(o.total_amount).toFixed(2)}</td>
                      <td className="border p-2 text-center text-[10px]">{o.created_at?.slice(0, 16)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Signatures footer for A4 report */}
          <div className="mt-12 pt-6 border-t border-slate-300 grid grid-cols-3 text-center text-xs text-slate-600">
            <div>
              <div className="w-36 border-t border-slate-400 mx-auto mb-1"></div>
              <span>Prepared By</span>
            </div>
            <div>
              <div className="w-36 border-t border-slate-400 mx-auto mb-1"></div>
              <span>Checked By</span>
            </div>
            <div>
              <div className="w-36 border-t border-slate-400 mx-auto mb-1"></div>
              <span>Authorized Signatory</span>
            </div>
          </div>
        </div>
      </div>

      {/* Screen Interactive UI (Hidden during window.print()) */}
      <div className="print:hidden">
        {/* Top Control Bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
                <span>POS Local Reports</span>
                <span>•</span>
                <span className="text-slate-500 font-normal">Real-time SQLite database</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                {currentTabTitle}
              </h1>
            </div>

            {/* Controls: Date range filter, Sync button, Print A4 Button */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Range Selector */}
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-medium text-slate-600 shadow-xs">
                {(['today', 'yesterday', 'week', 'month', 'custom', 'all'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setDateRange(mode)}
                    className={`px-3 py-1.5 rounded-md transition-all capitalize cursor-pointer ${
                      dateRange === mode
                        ? 'bg-white text-blue-600 font-semibold shadow-xs'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    {mode === 'week' ? 'Last 7 Days' : mode === 'month' ? 'This Month' : mode}
                  </button>
                ))}
              </div>

              {/* Custom Date Inputs */}
              {dateRange === 'custom' && (
                <div className="flex items-center gap-2 bg-white px-2 py-1 border border-slate-200 rounded-lg text-xs">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="border border-slate-200 rounded px-2 py-1 text-slate-700 outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="border border-slate-200 rounded px-2 py-1 text-slate-700 outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Sync from API Button */}
              <button
                onClick={handleSyncData}
                disabled={isSyncing}
                title="Sync purchases, expenses & sales from server to local database"
                className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border border-slate-300 disabled:opacity-50 cursor-pointer"
              >
                <svg className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isSyncing ? 'Syncing...' : 'Sync Database'}
              </button>

              {/* Print A4 / Save PDF Button */}
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Report / PDF (A4)
              </button>
            </div>
          </div>

          {/* Sub-tabs Navigation Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto mt-4 pt-2 border-t border-slate-100 scrollbar-none">
            {tabs.map((tab) => {
              const active = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <svg className="w-10 h-10 animate-spin text-blue-600 mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm font-medium">Calculating reports from local database...</p>
            </div>
          ) : (
            <>
              {/* Executive Summary Cards (Shown on non-dashboard tabs for quick reference) */}
              {summary && currentTab !== 'dashboard' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
                  {/* Total Sales */}
                  <div
                    onClick={() => setTab('sales')}
                    className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="font-semibold uppercase tracking-wider text-[11px]">Total Sales</span>
                      <span className="p-1 rounded bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                      </span>
                    </div>
                    <div className="text-xl font-bold text-slate-900">
                      {currencyIcon}{summary.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{summary.totalOrders} Orders placed</div>
                  </div>

                  {/* Total Purchase */}
                  <div
                    onClick={() => setTab('purchase')}
                    className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="font-semibold uppercase tracking-wider text-[11px]">Total Purchase</span>
                      <span className="p-1 rounded bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      </span>
                    </div>
                    <div className="text-xl font-bold text-slate-900">
                      {currencyIcon}{summary.totalPurchase.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{summary.totalPurchaseOrders} Purchase bills</div>
                  </div>

                  {/* Total Expense */}
                  <div
                    onClick={() => setTab('expense')}
                    className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="font-semibold uppercase tracking-wider text-[11px]">Total Expense</span>
                      <span className="p-1 rounded bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      </span>
                    </div>
                    <div className="text-xl font-bold text-slate-900">
                      {currencyIcon}{summary.totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Expenses recorded</div>
                  </div>

                  {/* Total Profit */}
                  <div
                    onClick={() => setTab('profit')}
                    className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="font-semibold uppercase tracking-wider text-[11px]">Net Profit</span>
                      <span className="p-1 rounded bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                      </span>
                    </div>
                    <div className={`text-xl font-bold ${summary.totalNetProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {currencyIcon}{summary.totalNetProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Gross: {currencyIcon}{summary.totalGrossProfit.toFixed(0)}</div>
                  </div>

                  {/* Total Due */}
                  <div
                    onClick={() => setTab('due')}
                    className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-rose-400 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="font-semibold uppercase tracking-wider text-[11px]">Total Due</span>
                      <span className="p-1 rounded bg-rose-50 text-rose-600 group-hover:scale-110 transition-transform">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </span>
                    </div>
                    <div className="text-xl font-bold text-rose-600">
                      {currencyIcon}{summary.totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Collected: {currencyIcon}{summary.totalDueCollection.toFixed(0)}</div>
                  </div>
                </div>
              )}

              {/* TAB 1: DASHBOARD */}
              {currentTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* Business Summary Header */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <h2 className="text-lg font-bold text-slate-800 tracking-tight">Business Summary</h2>
                    </div>

                    {/* Row 1: 4 Cards (Total Sales, Returns, Expenses, Net Amount) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      {/* Total Sales */}
                      <div
                        onClick={() => setTab('sales')}
                        className="rounded-2xl p-5 text-white shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 text-center cursor-pointer select-none"
                        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                      >
                        <div className="mb-2 opacity-90 flex justify-center">
                          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 576 512">
                            <path d="M0 24C0 10.7 10.7 0 24 0H69.5c22 0 41.5 12.8 50.6 32h411c26.3 0 45.5 25 38.6 50.4l-41 152.3c-8.5 31.4-37 53.3-69.5 53.3H170.7l5.4 28.5c2.2 11.3 12.1 19.5 23.6 19.5H488c13.3 0 24 10.7 24 24s-10.7 24-24 24H199.7c-34.6 0-64.3-24.6-70.7-58.5L77.4 54.5c-.7-3.8-4-6.5-7.9-6.5H24C10.7 48 0 37.3 0 24zM128 464a48 48 0 1 1 96 0 48 48 0 1 1 -96 0zm336-48a48 48 0 1 1 0 96 48 48 0 1 1 0-96z"/>
                          </svg>
                        </div>
                        <h4 className="text-sm font-semibold mb-1 opacity-90">Total Sales:</h4>
                        <div className="text-2xl font-bold mb-1 tracking-tight drop-shadow-xs">
                          {currencyIcon}{(summary?.totalSales || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <small className="text-xs opacity-80">Today's revenue</small>
                      </div>

                      {/* Returns */}
                      <div
                        onClick={() => setTab('sales')}
                        className="rounded-2xl p-5 text-white shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 text-center cursor-pointer select-none"
                        style={{ background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)' }}
                      >
                        <div className="mb-2 opacity-90 flex justify-center">
                          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 512 512">
                            <path d="M48.5 224H40c-13.3 0-24-10.7-24-24V72c0-9.7 5.8-18.5 14.8-22.2s19.3-1.7 26.2 5.2L98.6 96.6c87.6-86.5 228.7-86.2 315.8 1 87.5 87.5 87.5 229.3 0 316.8s-229.3 87.5-316.8 0c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0c62.5 62.5 163.8 62.5 226.3 0s62.5-163.8 0-226.3c-62.2-62.2-162.7-62.5-225.3-1L185 183c6.9 6.9 8.9 17.2 5.2 26.2s-12.5 14.8-22.2 14.8H48.5z"/>
                          </svg>
                        </div>
                        <h4 className="text-sm font-semibold mb-1 opacity-90">Returns:</h4>
                        <div className="text-2xl font-bold mb-1 tracking-tight drop-shadow-xs">
                          {currencyIcon}{(summary?.totalReturns || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <small className="text-xs opacity-80">Refunded amount</small>
                      </div>

                      {/* Expenses */}
                      <div
                        onClick={() => setTab('expense')}
                        className="rounded-2xl p-5 text-white shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 text-center cursor-pointer select-none"
                        style={{ background: 'linear-gradient(135deg, #4facfe 0%, #3da9af 100%)' }}
                      >
                        <div className="mb-2 opacity-90 flex justify-center">
                          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 384 512">
                            <path d="M64 0C28.7 0 0 28.7 0 64V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64H64zM96 96H288c17.7 0 32 14.3 32 32s-14.3 32-32 32H96c-17.7 0-32-14.3-32-32s14.3-32 32-32zm0 128H288c17.7 0 32 14.3 32 32s-14.3 32-32 32H96c-17.7 0-32-14.3-32-32s14.3-32 32-32zm0 128H224c17.7 0 32 14.3 32 32s-14.3 32-32 32H96c-17.7 0-32-14.3-32-32s14.3-32 32-32z"/>
                          </svg>
                        </div>
                        <h4 className="text-sm font-semibold mb-1 opacity-90">Expenses:</h4>
                        <div className="text-2xl font-bold mb-1 tracking-tight drop-shadow-xs">
                          {currencyIcon}{(summary?.totalExpense || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <small className="text-xs opacity-80">Total expenses</small>
                      </div>

                      {/* Net Amount */}
                      <div
                        onClick={() => setTab('profit')}
                        className="rounded-2xl p-5 text-white shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 text-center cursor-pointer select-none"
                        style={{ background: 'linear-gradient(135deg, #6e65fe 0%, #5f5dfe 100%)' }}
                      >
                        <div className="mb-2 opacity-90 flex justify-center">
                          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 512 512">
                            <path d="M64 64c0-17.7-14.3-32-32-32S0 46.3 0 64V400c0 44.2 35.8 80 80 80H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H80c-8.8 0-16-7.2-16-16V64zm406.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L320 210.7l-57.4-57.4c-12.5-12.5-32.8-12.5-45.3 0l-112 112c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L240 221.3l57.4 57.4c12.5 12.5 32.8 12.5 45.3 0l128-128z"/>
                          </svg>
                        </div>
                        <h4 className="text-sm font-semibold mb-1 opacity-90">Net Amount:</h4>
                        <div className="text-2xl font-bold mb-1 tracking-tight drop-shadow-xs">
                          {currencyIcon}{(summary?.businessNetAmount ?? ((summary?.totalSales || 0) - (summary?.totalReturns || 0) - (summary?.totalExpense || 0))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <small className="text-xs opacity-80">Sales - Returns - Expenses</small>
                      </div>
                    </div>

                    {/* Row 2: 5 Statistics Cards (Petty Cash, Opening Balance, Cash In, Cash Out, Closing Balance) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {/* Petty Cash */}
                      <div
                        onClick={() => setTab('expense')}
                        className="relative overflow-hidden rounded-2xl p-5 text-white shadow-xs hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer select-none group border border-white/15"
                        style={{ background: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)' }}
                      >
                        <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-white/10 blur-lg pointer-events-none group-hover:scale-150 transition-all duration-500" />
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold tracking-wider uppercase text-white/90">Petty Cash</span>
                          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-inner group-hover:scale-110 group-hover:bg-white/30 transition-all duration-300">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 512 512">
                              <path d="M512 80c0 18-14.3 34.6-38.4 48c-29.1 16.1-72.5 27.5-122.3 30.9c-4-8-8.9-15.6-14.6-22.6c24.4-1.9 47.1-5.7 66.7-11.1C427.6 118.5 448 103.8 448 80c0-23.8-20.4-38.5-44.6-45.1C371.1 26 317.9 16 256 16s-115.1 10-147.4 18.9C84.4 41.5 64 56.2 64 80c0 23.8 20.4 38.5 44.6 45.1c19.6 5.4 42.3 9.2 66.7 11.1c-5.7 7-10.6 14.6-14.6 22.6c-49.8-3.4-93.2-14.8-122.3-30.9C14.3 114.6 0 98 0 80C0 35.8 114.6 0 256 0S512 35.8 512 80zM232 186.8c1.3 0 2.7 0 4 .1s2.7-.1 4-.1c31.1 0 59.8 4.2 83.2 11.6c18 5.7 32.8 13.9 41.7 24c8.9 10.1 13.1 21.6 13.1 33.4s-4.2 23.3-13.1 33.4c-8.9 10.1-23.7 18.3-41.7 24c-23.4 7.4-52.1 11.6-83.2 11.6s-59.8-4.2-83.2-11.6c-18-5.7-32.8-13.9-41.7-24c-8.9-10.1-13.1-21.6-13.1-33.4s4.2-23.3 13.1-33.4c8.9-10.1 23.7-18.3 41.7-24c23.4-7.4 52.1-11.6 83.2-11.6z"/>
                            </svg>
                          </div>
                        </div>
                        <div className="text-2xl font-extrabold text-white tracking-tight drop-shadow-xs mb-1.5 flex items-baseline">
                          <span className="text-base font-bold opacity-85 mr-1">{currencyIcon}</span>
                          {(summary?.pettyCashBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="flex items-center">
                          <span className="inline-flex items-center text-[11px] font-semibold text-white/90 bg-black/15 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                            Petty Cash Balance
                          </span>
                        </div>
                      </div>

                      {/* Opening Balance */}
                      <div
                        className="relative overflow-hidden rounded-2xl p-5 text-white shadow-xs hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer select-none group border border-white/15"
                        style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
                      >
                        <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-white/10 blur-lg pointer-events-none group-hover:scale-150 transition-all duration-500" />
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold tracking-wider uppercase text-white/90">Opening Balance</span>
                          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-inner group-hover:scale-110 group-hover:bg-white/30 transition-all duration-300">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 512 512">
                              <path d="M361.5 1.2c5 2.1 8.6 6.6 9.6 11.9L391 121l107.9 19.8c5.3 1 9.8 4.6 11.9 9.6s1 10.9-2.8 14.7L441.5 242l46.5 76.9c3.8 3.8 4.9 9.7 2.8 14.7s-6.6 8.6-11.9 9.6L391 391l-19.8 107.9c-1 5.3-4.6 9.8-9.6 11.9s-10.9 1-14.7-2.8L270 461.5l-76.9 46.5c-3.8 3.8-9.7 4.9-14.7 2.8s-8.6-6.6-9.6-11.9L121 391 13.1 371.2c-5.3-1-9.8-4.6-11.9-9.6s-1-10.9 2.8-14.7L50.5 270 4 193.1c-3.8-3.8-4.9-9.7-2.8-14.7s6.6-8.6 11.9-9.6L121 121l19.8-107.9c1-5.3 4.6-9.8 9.6-11.9s10.9-1 14.7 2.8L242 50.5 318.9 4c3.8-3.8 9.7-4.9 14.7-2.8zM256 160a96 96 0 1 0 0 192 96 96 0 1 0 0-192z"/>
                            </svg>
                          </div>
                        </div>
                        <div className="text-2xl font-extrabold text-white tracking-tight drop-shadow-xs mb-1.5 flex items-baseline">
                          <span className="text-base font-bold opacity-85 mr-1">{currencyIcon}</span>
                          {(summary?.openingBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="flex items-center">
                          <span className="inline-flex items-center text-[11px] font-semibold text-white/90 bg-black/15 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                            Day Opening Cash
                          </span>
                        </div>
                      </div>

                      {/* Cash In */}
                      <div
                        className="relative overflow-hidden rounded-2xl p-5 text-white shadow-xs hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer select-none group border border-white/15"
                        style={{ background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)' }}
                      >
                        <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-white/10 blur-lg pointer-events-none group-hover:scale-150 transition-all duration-500" />
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold tracking-wider uppercase text-white/90">Cash In</span>
                          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-inner group-hover:scale-110 group-hover:bg-white/30 transition-all duration-300">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 384 512">
                              <path d="M169.4 470.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 370.8 224 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 306.7L54.6 265.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"/>
                            </svg>
                          </div>
                        </div>
                        <div className="text-2xl font-extrabold text-white tracking-tight drop-shadow-xs mb-1.5 flex items-baseline">
                          <span className="text-base font-bold opacity-85 mr-1">{currencyIcon}</span>
                          {(summary?.cashIn || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="flex items-center">
                          <span className="inline-flex items-center text-[11px] font-semibold text-white/90 bg-black/15 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                            Total Cash Received
                          </span>
                        </div>
                      </div>

                      {/* Cash Out */}
                      <div
                        className="relative overflow-hidden rounded-2xl p-5 text-white shadow-xs hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer select-none group border border-white/15"
                        style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)' }}
                      >
                        <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-white/10 blur-lg pointer-events-none group-hover:scale-150 transition-all duration-500" />
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold tracking-wider uppercase text-white/90">Cash Out</span>
                          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-inner group-hover:scale-110 group-hover:bg-white/30 transition-all duration-300">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 384 512">
                              <path d="M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2V448c0 17.7 14.3 32 32 32s32-14.3 32-32V141.2L329.4 246.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z"/>
                            </svg>
                          </div>
                        </div>
                        <div className="text-2xl font-extrabold text-white tracking-tight drop-shadow-xs mb-1.5 flex items-baseline">
                          <span className="text-base font-bold opacity-85 mr-1">{currencyIcon}</span>
                          {(summary?.cashOut || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="flex items-center">
                          <span className="inline-flex items-center text-[11px] font-semibold text-white/90 bg-black/15 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                            Total Cash Paid
                          </span>
                        </div>
                      </div>

                      {/* Closing Balance */}
                      <div
                        className="relative overflow-hidden rounded-2xl p-5 text-white shadow-xs hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer select-none group border border-white/15"
                        style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}
                      >
                        <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-white/10 blur-lg pointer-events-none group-hover:scale-150 transition-all duration-500" />
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold tracking-wider uppercase text-white/90">Closing Balance</span>
                          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-inner group-hover:scale-110 group-hover:bg-white/30 transition-all duration-300">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 512 512">
                              <path d="M448 32C465.7 32 480 46.3 480 64c0 17.7-14.3 32-32 32H80c-8.8 0-16 7.2-16 16s7.2 16 16 16H448c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96C0 60.7 28.7 32 64 32H448zM416 336c17.7 0 32-14.3 32-32s-14.3-32-32-32s-32 14.3-32 32s14.3 32 32 32z"/>
                            </svg>
                          </div>
                        </div>
                        <div className="text-2xl font-extrabold text-white tracking-tight drop-shadow-xs mb-1.5 flex items-baseline">
                          <span className="text-base font-bold opacity-85 mr-1">{currencyIcon}</span>
                          {(summary?.closingBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="flex items-center">
                          <span className="inline-flex items-center text-[11px] font-semibold text-white/90 bg-black/15 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                            Current Cash In Hand
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Top Stats Overview */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Payment Channel Breakdown Card */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          Sales by Payment Method
                        </h3>
                        <button
                          onClick={() => setTab('payments')}
                          className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
                        >
                          View Details &rarr;
                        </button>
                      </div>

                      <div className="space-y-3">
                        {reportData?.paymentMethodSales?.methods?.map((m) => (
                          <div key={m.method_name}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-semibold text-slate-700">{m.method_name}</span>
                              <span className="text-slate-900 font-bold">
                                {currencyIcon}{m.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                <span className="text-slate-400 font-normal ml-1">({m.percentage.toFixed(1)}%)</span>
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full ${
                                  m.method_name === 'Cash' ? 'bg-emerald-500' :
                                  m.method_name === 'Card' ? 'bg-blue-500' :
                                  m.method_name === 'bKash' ? 'bg-pink-500' :
                                  m.method_name === 'Nagad' ? 'bg-orange-500' : 'bg-slate-400'
                                }`}
                                style={{ width: `${Math.min(100, m.percentage)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Profit & Loss Quick Snapshot */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          Profit & Loss Statement
                        </h3>
                        <button
                          onClick={() => setTab('profit')}
                          className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
                        >
                          Full P&L &rarr;
                        </button>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                          <span className="text-slate-600">Gross Sales:</span>
                          <span className="font-bold text-slate-900">{currencyIcon}{reportData?.profit?.grossSales.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-100 text-rose-600">
                          <span>Cost of Goods Sold (COGS):</span>
                          <span>- {currencyIcon}{reportData?.profit?.cogs.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-100 font-semibold text-slate-800">
                          <span>Gross Profit:</span>
                          <span>{currencyIcon}{reportData?.profit?.grossProfit.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-100 text-rose-600">
                          <span>Total Expenses:</span>
                          <span>- {currencyIcon}{reportData?.profit?.totalExpenses.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-2 text-sm font-bold text-emerald-700">
                          <span>Net Operating Profit:</span>
                          <span>{currencyIcon}{reportData?.profit?.netProfit.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Low Stock Watch */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Inventory Alerts ({reportData?.lowStockProducts?.length || 0})
                        </h3>
                        <button
                          onClick={() => setTab('low_stock')}
                          className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
                        >
                          View All &rarr;
                        </button>
                      </div>

                      {reportData?.lowStockProducts && reportData.lowStockProducts.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                          {reportData.lowStockProducts.slice(0, 4).map((p) => (
                            <div key={p.id} className="py-2 flex items-center justify-between text-xs">
                              <div>
                                <p className="font-semibold text-slate-800 truncate max-w-[180px]">{p.product_name}</p>
                                <p className="text-[11px] text-slate-400 font-mono">{p.sku_code}</p>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.available_stock <= 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {p.available_stock} Left
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 py-6 text-center">All inventory levels are healthy</p>
                      )}
                    </div>
                  </div>

                  {/* Best Selling Products Mini Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        Top Selling Products
                      </h3>
                      <button
                        onClick={() => setTab('best_sellers')}
                        className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
                      >
                        All Best Sellers &rarr;
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-4">#</th>
                            <th className="py-2.5 px-4">Product Name</th>
                            <th className="py-2.5 px-4">SKU</th>
                            <th className="py-2.5 px-4 text-center">Units Sold</th>
                            <th className="py-2.5 px-4 text-right">Revenue</th>
                            <th className="py-2.5 px-4 text-right">Profit Contribution</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {reportData?.bestSellingProducts?.slice(0, 5).map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-4 font-bold text-slate-400">#{idx + 1}</td>
                              <td className="py-2.5 px-4 font-semibold text-slate-800">{p.product_name}</td>
                              <td className="py-2.5 px-4 font-mono text-slate-500">{p.sku_code}</td>
                              <td className="py-2.5 px-4 text-center font-bold text-slate-900">{p.quantity_sold}</td>
                              <td className="py-2.5 px-4 text-right font-bold text-slate-900">{currencyIcon}{p.total_revenue.toFixed(2)}</td>
                              <td className="py-2.5 px-4 text-right font-bold text-emerald-600">{currencyIcon}{p.estimated_profit.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TOTAL SALES */}
              {currentTab === 'sales' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">Orders & Sales List</h3>
                      <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                        {filteredSales.length} Total
                      </span>
                    </div>
                    <div className="w-full sm:w-64">
                      <input
                        type="text"
                        placeholder="Search invoice, customer, method..."
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-hidden focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Invoice / ID</th>
                          <th className="py-3 px-4">Customer</th>
                          <th className="py-3 px-4 text-center">Items</th>
                          <th className="py-3 px-4">Payment Method</th>
                          <th className="py-3 px-4 text-right">Subtotal</th>
                          <th className="py-3 px-4 text-right">Discount</th>
                          <th className="py-3 px-4 text-right">Total Amount</th>
                          <th className="py-3 px-4 text-right">Paid</th>
                          <th className="py-3 px-4 text-right">Due</th>
                          <th className="py-3 px-4 text-center">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredSales.map((o: any, idx: number) => {
                          const due = Math.max(0, (parseFloat(o.total_amount) || 0) - (parseFloat(o.paid_amount) || 0));
                          return (
                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-blue-600">{o.local_id}</td>
                              <td className="py-3 px-4">
                                <p className="font-semibold text-slate-800">{o.customer_name || 'Walk in Customer'}</p>
                                {o.customer_phone && <p className="text-[11px] text-slate-400">{o.customer_phone}</p>}
                              </td>
                              <td className="py-3 px-4 text-center font-bold text-slate-700">{o.total_quantity || 1}</td>
                              <td className="py-3 px-4">
                                <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                                  {o.payment_method}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right text-slate-600">{currencyIcon}{parseFloat(o.sub_total || o.total_amount).toFixed(2)}</td>
                              <td className="py-3 px-4 text-right text-rose-500">{currencyIcon}{parseFloat(o.discount_amount || 0).toFixed(2)}</td>
                              <td className="py-3 px-4 text-right font-bold text-slate-900">{currencyIcon}{parseFloat(o.total_amount).toFixed(2)}</td>
                              <td className="py-3 px-4 text-right font-semibold text-emerald-600">{currencyIcon}{parseFloat(o.paid_amount || 0).toFixed(2)}</td>
                              <td className={`py-3 px-4 text-right font-bold ${due > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                {currencyIcon}{due.toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-center text-slate-500 text-[11px]">
                                {o.created_at ? o.created_at.slice(0, 16).replace('T', ' ') : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: TOTAL PURCHASE */}
              {currentTab === 'purchase' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">Purchase Orders List</h3>
                      <span className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                        {filteredPurchases.length} Records
                      </span>
                    </div>
                    <div className="w-full sm:w-64">
                      <input
                        type="text"
                        placeholder="Search challan, supplier..."
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-hidden focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Challan / Bill No</th>
                          <th className="py-3 px-4">Supplier Name</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-center">Purchase Type</th>
                          <th className="py-3 px-4 text-center">Total Quantity</th>
                          <th className="py-3 px-4 text-right">Total Amount</th>
                          <th className="py-3 px-4 text-center">Purchase Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPurchases.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
                              No purchase records found in this time period. Click "Sync Database" to pull from server.
                            </td>
                          </tr>
                        ) : (
                          filteredPurchases.map((p: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-indigo-600">{p.challan_no}</td>
                              <td className="py-3 px-4 font-semibold text-slate-800">{p.supplier_name}</td>
                              <td className="py-3 px-4 text-center">
                                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                                  {p.status || 'Received'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center text-slate-500">{p.purchase_type || 'Local'}</td>
                              <td className="py-3 px-4 text-center font-bold text-slate-800">{p.total_quantity}</td>
                              <td className="py-3 px-4 text-right font-bold text-slate-900">
                                {currencyIcon}{parseFloat(p.total_amount).toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-center text-slate-500 text-[11px]">
                                {p.purchase_date ? p.purchase_date.slice(0, 10) : '-'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: TOTAL EXPENSE */}
              {currentTab === 'expense' && (
                <div className="space-y-6">
                  {/* Category Breakdown Cards */}
                  {reportData?.expenses?.byCategory && reportData.expenses.byCategory.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {reportData.expenses.byCategory.map((cat, idx) => (
                        <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200">
                          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{cat.category}</p>
                          <p className="text-lg font-bold text-slate-900 mt-0.5">{currencyIcon}{cat.amount.toFixed(2)}</p>
                          <p className="text-[11px] text-slate-400">{cat.count} transactions</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm">Expenses Log</h3>
                        <span className="bg-amber-50 text-amber-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                          {filteredExpenses.length} Records
                        </span>
                      </div>
                      <div className="w-full sm:w-64">
                        <input
                          type="text"
                          placeholder="Search expense type, note..."
                          value={tableSearch}
                          onChange={(e) => setTableSearch(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-hidden focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4">Expense Type</th>
                            <th className="py-3 px-4">Description</th>
                            <th className="py-3 px-4">Spent By</th>
                            <th className="py-3 px-4 text-center">Petty Cash</th>
                            <th className="py-3 px-4 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredExpenses.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400">
                                No expenses recorded in this period.
                              </td>
                            </tr>
                          ) : (
                            filteredExpenses.map((e: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 px-4 font-medium text-slate-700">{e.expense_date}</td>
                                <td className="py-3 px-4 font-semibold text-slate-900">{e.type || e.category}</td>
                                <td className="py-3 px-4 text-slate-600">{e.description || '-'}</td>
                                <td className="py-3 px-4 text-slate-600">{e.expense_by_name || 'Admin'}</td>
                                <td className="py-3 px-4 text-center">
                                  {e.is_petty_cash ? (
                                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold">Yes</span>
                                  ) : (
                                    <span className="text-slate-400 text-[10px]">No</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-rose-600">
                                  {currencyIcon}{parseFloat(e.amount).toFixed(2)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: TOTAL PROFIT */}
              {currentTab === 'profit' && (
                <div className="space-y-6">
                  {/* Detailed P&L Breakdown Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-2xl mx-auto">
                    <h3 className="font-bold text-slate-900 text-base mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                      <span>Profit & Loss Statement</span>
                      <span className="text-xs font-normal text-slate-400">Period: {dateRangeLabel}</span>
                    </h3>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="font-semibold text-slate-700">Gross Sales Revenue</span>
                        <span className="font-bold text-slate-900">{currencyIcon}{reportData?.profit?.grossSales.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between items-center py-2 border-b border-slate-100 text-rose-600">
                        <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                          Cost of Goods Sold (COGS)
                        </span>
                        <span>{currencyIcon}{reportData?.profit?.cogs.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between items-center py-2.5 border-b-2 border-slate-200 bg-slate-50 px-3 rounded-lg font-bold text-slate-900">
                        <span>Gross Profit</span>
                        <span>{currencyIcon}{reportData?.profit?.grossProfit.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between items-center py-2 border-b border-slate-100 text-rose-600">
                        <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                          Operating Expenses
                        </span>
                        <span>{currencyIcon}{reportData?.profit?.totalExpenses.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between items-center py-3 bg-emerald-50 px-4 rounded-xl font-black text-lg text-emerald-800 border border-emerald-200 mt-4">
                        <div>
                          <span>Net Operating Profit</span>
                          <span className="block text-xs font-semibold text-emerald-600 mt-0.5">
                            Profit Margin: {reportData?.profit?.profitMargin.toFixed(1)}%
                          </span>
                        </div>
                        <span>{currencyIcon}{reportData?.profit?.netProfit.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: TOTAL DUE */}
              {currentTab === 'due' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Customers Outstanding Dues</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Orders where full payment has not yet been collected</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">Total Due Balance</span>
                      <span className="text-lg font-bold text-rose-600">{currencyIcon}{reportData?.dues?.totalDue.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Invoice No</th>
                          <th className="py-3 px-4">Customer Name</th>
                          <th className="py-3 px-4">Phone Number</th>
                          <th className="py-3 px-4 text-right">Order Total</th>
                          <th className="py-3 px-4 text-right">Paid Amount</th>
                          <th className="py-3 px-4 text-right">Due Outstanding</th>
                          <th className="py-3 px-4 text-center">Order Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {!reportData?.dues?.orders || reportData.dues.orders.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
                              No customer dues outstanding in this period!
                            </td>
                          </tr>
                        ) : (
                          reportData.dues.orders.map((o: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-blue-600">{o.local_id}</td>
                              <td className="py-3 px-4 font-semibold text-slate-900">{o.customer_name || 'Walk in'}</td>
                              <td className="py-3 px-4 font-mono text-slate-600">{o.customer_phone || '-'}</td>
                              <td className="py-3 px-4 text-right text-slate-700">{currencyIcon}{parseFloat(o.total_amount).toFixed(2)}</td>
                              <td className="py-3 px-4 text-right text-emerald-600 font-semibold">{currencyIcon}{parseFloat(o.paid_amount).toFixed(2)}</td>
                              <td className="py-3 px-4 text-right font-black text-rose-600">{currencyIcon}{o.due_amount.toFixed(2)}</td>
                              <td className="py-3 px-4 text-center text-slate-500 text-[11px]">{o.created_at?.slice(0, 16).replace('T', ' ')}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 7: DUE COLLECTION */}
              {currentTab === 'due_collection' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Due Collection History</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Payments collected from orders that had outstanding balance</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">Total Collected</span>
                      <span className="text-lg font-bold text-emerald-600">{currencyIcon}{reportData?.dueCollections?.totalCollected.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Invoice No</th>
                          <th className="py-3 px-4">Customer Name</th>
                          <th className="py-3 px-4">Payment Method</th>
                          <th className="py-3 px-4 text-right">Total Order Bill</th>
                          <th className="py-3 px-4 text-right">Collected Amount</th>
                          <th className="py-3 px-4 text-center">Collection Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {!reportData?.dueCollections?.orders || reportData.dueCollections.orders.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              No collections found for this period.
                            </td>
                          </tr>
                        ) : (
                          reportData.dueCollections.orders.map((o: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-blue-600">{o.local_id}</td>
                              <td className="py-3 px-4 font-semibold text-slate-900">{o.customer_name}</td>
                              <td className="py-3 px-4">
                                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                                  {o.payment_method}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right text-slate-700">{currencyIcon}{parseFloat(o.total_amount).toFixed(2)}</td>
                              <td className="py-3 px-4 text-right font-black text-emerald-600">{currencyIcon}{o.collected_amount.toFixed(2)}</td>
                              <td className="py-3 px-4 text-center text-slate-500 text-[11px]">{o.created_at?.slice(0, 16).replace('T', ' ')}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 8: BEST SELLING PRODUCTS */}
              {currentTab === 'best_sellers' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Top Selling Products Leaderboard</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Ranked by volume of sales and revenue contribution</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Rank</th>
                          <th className="py-3 px-4">Product Name</th>
                          <th className="py-3 px-4">SKU</th>
                          <th className="py-3 px-4 text-center">Quantity Sold</th>
                          <th className="py-3 px-4 text-right">Avg Sale Price</th>
                          <th className="py-3 px-4 text-right">Total Revenue</th>
                          <th className="py-3 px-4 text-right">Est. Profit Contribution</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {!reportData?.bestSellingProducts || reportData.bestSellingProducts.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
                              No product sales recorded in this period.
                            </td>
                          </tr>
                        ) : (
                          reportData.bestSellingProducts.map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                                  idx === 0 ? 'bg-amber-100 text-amber-800' :
                                  idx === 1 ? 'bg-slate-200 text-slate-700' :
                                  idx === 2 ? 'bg-orange-100 text-orange-800' : 'text-slate-500'
                                }`}>
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-900">{p.product_name}</td>
                              <td className="py-3 px-4 font-mono text-slate-500">{p.sku_code}</td>
                              <td className="py-3 px-4 text-center font-bold text-base text-slate-900">{p.quantity_sold}</td>
                              <td className="py-3 px-4 text-right text-slate-600">{currencyIcon}{p.sale_price.toFixed(2)}</td>
                              <td className="py-3 px-4 text-right font-black text-slate-900">{currencyIcon}{p.total_revenue.toFixed(2)}</td>
                              <td className="py-3 px-4 text-right font-bold text-emerald-600">{currencyIcon}{p.estimated_profit.toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 9: LOW STOCK */}
              {currentTab === 'low_stock' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Low Stock Inventory Alerts</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Products with stock level below safety threshold (10 units)</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Product Name</th>
                          <th className="py-3 px-4">SKU Code</th>
                          <th className="py-3 px-4">Barcode</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4 text-center">Available Stock</th>
                          <th className="py-3 px-4 text-right">Cost Price</th>
                          <th className="py-3 px-4 text-right">Sale Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {!reportData?.lowStockProducts || reportData.lowStockProducts.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400">
                              🎉 No low stock products! All inventory levels are above threshold.
                            </td>
                          </tr>
                        ) : (
                          reportData.lowStockProducts.map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  p.status === 'out_of_stock' ? 'bg-red-100 text-red-800' :
                                  p.status === 'critical' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {p.status.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-900">{p.product_name}</td>
                              <td className="py-3 px-4 font-mono text-slate-600">{p.sku_code}</td>
                              <td className="py-3 px-4 font-mono text-slate-400">{p.barcode || '-'}</td>
                              <td className="py-3 px-4 text-slate-600">{p.category_name || '-'}</td>
                              <td className="py-3 px-4 text-center font-black text-base text-rose-600">{p.available_stock}</td>
                              <td className="py-3 px-4 text-right text-slate-500">{currencyIcon}{p.unit_price.toFixed(2)}</td>
                              <td className="py-3 px-4 text-right font-bold text-slate-900">{currencyIcon}{p.sale_price.toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 10: CASH / CARD / BKASH / NAGAD SALES */}
              {currentTab === 'payments' && (
                <div className="space-y-6">
                  {/* Channels 4 Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {['Cash', 'Card', 'bKash', 'Nagad'].map((method) => {
                      const item = reportData?.paymentMethodSales?.methods?.find(m => m.method_name.toLowerCase() === method.toLowerCase()) || {
                        method_name: method,
                        count: 0,
                        amount: 0,
                        percentage: 0
                      };

                      const isSelected = paymentFilter.toLowerCase() === method.toLowerCase();

                      return (
                        <div
                          key={method}
                          onClick={() => setPaymentFilter(isSelected ? 'all' : method)}
                          className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-500 ring-2 ring-blue-200 shadow-md'
                              : 'border-slate-200 hover:border-slate-300 shadow-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-sm text-slate-800">{method}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              method === 'Cash' ? 'bg-emerald-100 text-emerald-800' :
                              method === 'Card' ? 'bg-blue-100 text-blue-800' :
                              method === 'bKash' ? 'bg-pink-100 text-pink-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {item.percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-2xl font-black text-slate-900">
                            {currencyIcon}{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {item.count} total transactions
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Transactions Table for Payment Method */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm">
                          Payment Transactions
                          {paymentFilter !== 'all' && <span className="text-blue-600 font-semibold ml-1">({paymentFilter})</span>}
                        </h3>
                        <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                          {filteredPaymentOrders.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={paymentFilter}
                          onChange={(e) => setPaymentFilter(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-hidden font-medium cursor-pointer"
                        >
                          <option value="all">All Payment Methods</option>
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="bkash">bKash</option>
                          <option value="nagad">Nagad</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Search..."
                          value={tableSearch}
                          onChange={(e) => setTableSearch(e.target.value)}
                          className="w-48 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-hidden focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4">Invoice / ID</th>
                            <th className="py-3 px-4">Customer</th>
                            <th className="py-3 px-4">Payment Method</th>
                            <th className="py-3 px-4 text-right">Order Total</th>
                            <th className="py-3 px-4 text-right">Paid</th>
                            <th className="py-3 px-4 text-center">Status</th>
                            <th className="py-3 px-4 text-center">Date & Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredPaymentOrders.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-slate-400">
                                No transactions found for {paymentFilter}.
                              </td>
                            </tr>
                          ) : (
                            filteredPaymentOrders.map((o: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 px-4 font-mono font-bold text-blue-600">{o.local_id}</td>
                                <td className="py-3 px-4 font-semibold text-slate-800">{o.customer_name || 'Walk in Customer'}</td>
                                <td className="py-3 px-4">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                    String(o.payment_method).toLowerCase().includes('cash') ? 'bg-emerald-50 text-emerald-700' :
                                    String(o.payment_method).toLowerCase().includes('card') ? 'bg-blue-50 text-blue-700' :
                                    String(o.payment_method).toLowerCase().includes('bkash') ? 'bg-pink-50 text-pink-700' :
                                    String(o.payment_method).toLowerCase().includes('nagad') ? 'bg-orange-50 text-orange-700' :
                                    'bg-slate-100 text-slate-700'
                                  }`}>
                                    {o.payment_method}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-slate-900">{currencyIcon}{parseFloat(o.total_amount).toFixed(2)}</td>
                                <td className="py-3 px-4 text-right font-semibold text-emerald-600">{currencyIcon}{parseFloat(o.paid_amount || o.total_amount).toFixed(2)}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                    {o.payment_status || 'Paid'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center text-slate-500 text-[11px]">
                                  {o.created_at?.slice(0, 16).replace('T', ' ')}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
