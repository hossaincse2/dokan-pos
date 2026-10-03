import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Expense } from '@shared/types';

export default function ExpensesPage() {
  const { siteSettings } = useSelector((state: RootState) => state.settings);
  const currencyIcon = siteSettings?.currency_icon || '৳';

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    total_expenses: 0,
    total_today_expense: 0,
  });

  // Filter states
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Add Expense Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    type: 'Snacks',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    description: '',
    is_petty_cash: false,
  });

  useEffect(() => {
    loadExpenseTypes();
    loadExpenses();
  }, [dateFilter, customStartDate, customEndDate, selectedType]);

  const loadExpenseTypes = async () => {
    try {
      const types = await window.electronAPI.getExpenseTypes();
      setExpenseTypes(types || [
        'Snacks',
        'Rent',
        'Utilities',
        'Marketing',
        'Salaries',
        'Transportation',
        'Others',
      ]);
    } catch (error) {
      console.error('Failed to load expense types:', error);
      setExpenseTypes([
        'Snacks',
        'Rent',
        'Utilities',
        'Marketing',
        'Salaries',
        'Transportation',
        'Others',
      ]);
    }
  };

  const getDateRange = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (dateFilter === 'today') {
      return { startDate: todayStr, endDate: todayStr };
    }

    if (dateFilter === 'week') {
      const firstDay = new Date(today);
      firstDay.setDate(today.getDate() - 7);
      return { startDate: firstDay.toISOString().split('T')[0], endDate: todayStr };
    }

    if (dateFilter === 'month') {
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: firstDayOfMonth.toISOString().split('T')[0], endDate: todayStr };
    }

    if (dateFilter === 'custom') {
      return { startDate: customStartDate || undefined, endDate: customEndDate || undefined };
    }

    return {};
  };

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const res = await window.electronAPI.getExpenses({
        startDate,
        endDate,
        type: selectedType !== 'all' ? selectedType : undefined,
        search: searchTerm || undefined,
      });

      if (res) {
        setExpenses(res.data || []);
        if (res.summary) {
          setSummary(res.summary);
        }
      }
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadExpenses();
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }

    setSaving(true);
    try {
      await window.electronAPI.createExpense({
        type: formData.type,
        amount: amountNum,
        expense_date: formData.expense_date,
        description: formData.description,
        is_petty_cash: formData.is_petty_cash,
      });

      setShowAddModal(false);
      setFormData({
        type: expenseTypes[0] || 'Snacks',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        description: '',
        is_petty_cash: false,
      });

      await loadExpenses();
    } catch (error: any) {
      console.error('Failed to create expense:', error);
      alert(error.message || 'Failed to record expense.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) {
      return;
    }

    try {
      await window.electronAPI.deleteExpense(id);
      await loadExpenses();
    } catch (error) {
      console.error('Failed to delete expense:', error);
      alert('Failed to delete expense.');
    }
  };

  // Filtered by local search term in real-time
  const filteredExpenses = expenses.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.type?.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term) ||
      item.expense_by_name?.toLowerCase().includes(term)
    );
  });

  // Calculate this month's total from loaded items
  const thisMonthStr = new Date().toISOString().slice(0, 7);
  const thisMonthTotal = expenses
    .filter((e) => e.expense_date?.startsWith(thisMonthStr))
    .reduce((sum, e) => sum + (parseFloat(e.amount as any) || 0), 0);

  // Pagination slice
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage) || 1;
  const paginatedExpenses = filteredExpenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <span>💸</span> Expense Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track daily store operational expenses, petty cash, and overheads.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
        >
          <span className="text-xl font-bold leading-none">+</span>
          <span>Add New Expense</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Expenses */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Expenses</span>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-lg">
              💳
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-gray-900">
              {currencyIcon}
              {summary.total_expenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-xs text-gray-400 mt-1 block">Lifetime records</span>
        </div>

        {/* Today's Expense */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Today's Expense</span>
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-lg">
              📅
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-orange-600">
              {currencyIcon}
              {summary.total_today_expense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-xs text-gray-400 mt-1 block">Spent today</span>
        </div>

        {/* This Month's Expense */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">This Month</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg">
              📊
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-purple-700">
              {currencyIcon}
              {thisMonthTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-xs text-gray-400 mt-1 block">Current billing month</span>
        </div>

        {/* Total Records Count */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Entries</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
              📝
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-blue-600">
              {filteredExpenses.length}
            </span>
          </div>
          <span className="text-xs text-gray-400 mt-1 block">Recorded vouchers</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Quick Date Filters */}
          <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
            {(['all', 'today', 'week', 'month', 'custom'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setDateFilter(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  dateFilter === mode
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {mode === 'all'
                  ? 'All Time'
                  : mode === 'today'
                  ? 'Today'
                  : mode === 'week'
                  ? 'Last 7 Days'
                  : mode === 'month'
                  ? 'This Month'
                  : 'Custom Range'}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-md w-full">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search description, type, user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
              />
            </div>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="py-2 px-3 text-xs sm:text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-700"
            >
              <option value="all">All Types</option>
              {expenseTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </form>
        </div>

        {/* Custom Date Pickers (visible when custom selected) */}
        {dateFilter === 'custom' && (
          <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-gray-500">Date Range:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        )}
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Expense Type</th>
                <th className="px-6 py-4">Description / Note</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-center">Petty Cash</th>
                <th className="px-6 py-4">Recorded By</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 font-medium">
                    ⏳ Loading expenses...
                  </td>
                </tr>
              ) : paginatedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <div className="text-4xl mb-2">📋</div>
                    <p className="font-medium text-gray-500">No expense records found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Click "+ Add New Expense" to create your first expense entry.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {expense.expense_date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                        {expense.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate" title={expense.description}>
                      {expense.description || <span className="text-gray-300 italic">No description</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-black text-gray-900 text-base">
                      {currencyIcon}
                      {parseFloat(expense.amount as any || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {expense.is_petty_cash ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                      {expense.expense_by_name || 'Staff'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {expense.is_synced ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          Synced
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Local
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                      <button
                        onClick={() => handleDeleteExpense(expense.id!)}
                        className="text-red-500 hover:text-red-700 font-semibold p-1 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete expense"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredExpenses.length)} of{' '}
              {filteredExpenses.length} entries
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-gray-200 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white"
              >
                Prev
              </button>
              <span className="px-3 py-1 text-xs font-bold text-gray-700">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded-lg border border-gray-200 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 animate-scale-in">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💸</span>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Add New Expense</h3>
                  <p className="text-xs text-blue-100">Record a store expense entry</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Expense Type / Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white font-medium"
                  required
                >
                  {expenseTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Amount ({currencyIcon}) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 font-bold">
                    {currencyIcon}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-base font-bold text-gray-900"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Expense Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Description / Purpose
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter details, reason or invoice/voucher number..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="petty_cash"
                  checked={formData.is_petty_cash}
                  onChange={(e) => setFormData({ ...formData, is_petty_cash: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="petty_cash" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                  Paid from Petty Cash
                </label>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
