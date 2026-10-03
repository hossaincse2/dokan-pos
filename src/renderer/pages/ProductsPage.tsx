import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

export default function ProductsPage() {
  const { settings, siteSettings } = useSelector((state: RootState) => state.settings);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [settings]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const storeId = settings?.storeId || 1;
      console.log('[ProductsPage] Loading products for store:', storeId);
      
      // Pass params object with storeId and large perPage to get all products
      const result = await window.electronAPI.getProducts({
        storeId: storeId,
        page: 1,
        perPage: 10000 // Get all products
      });
      
      console.log('[ProductsPage] Products result:', result);
      
      // The result should have a 'data' property with the products array
      if (result && Array.isArray(result.data)) {
        console.log('[ProductsPage] Products loaded:', result.data.length);
        setProducts(result.data);
      } else if (Array.isArray(result)) {
        console.log('[ProductsPage] Products loaded (direct array):', result.length);
        setProducts(result);
      } else {
        console.error('[ProductsPage] Result is not in expected format:', result);
        setProducts([]);
      }
    } catch (error) {
      console.error('[ProductsPage] Failed to load products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await window.electronAPI.getCategories();
      console.log('[ProductsPage] Categories loaded:', result?.length || 0, 'categories');
      
      // Ensure result is an array
      if (Array.isArray(result)) {
        setCategories(result);
        console.log('[ProductsPage] Categories set:', result.map(c => c.name).join(', '));
      } else {
        console.error('[ProductsPage] Categories result is not an array:', result);
        setCategories([]);
      }
    } catch (error) {
      console.error('[ProductsPage] Failed to load categories:', error);
      setCategories([]);
    }
  };

  // Filter products - ensure products is an array
  const filteredProducts = Array.isArray(products) ? products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !categoryFilter || product.category_id === categoryFilter;
    
    return matchesSearch && matchesCategory;
  }) : [];

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handleSelectProduct = (sku: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(sku)) {
      newSelected.delete(sku);
    } else {
      newSelected.add(sku);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === currentProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(currentProducts.map(p => p.sku_code)));
    }
  };

  const handlePrintBarcodes = () => {
    const selectedProductsList = products.filter(p => selectedProducts.has(p.sku_code));
    if (selectedProductsList.length === 0) {
      alert('Please select products to print barcodes');
      return;
    }
    
    // Open barcode print window
    printBarcodes(selectedProductsList);
  };

  const printBarcodes = async (productsList: any[]) => {
    // Load site settings for company name - use title field
    let companyName = 'POS System';
    try {
      const siteSettings = await window.electronAPI.getSiteSettings();
      // Use title field first, then company_name as fallback
      companyName = siteSettings?.title || siteSettings?.company_name || 'POS System';
      console.log('[ProductsPage] Using company name for barcode:', companyName);
    } catch (error) {
      console.error('Failed to load site settings:', error);
    }

    // The API already returns the rule-compliant sku_barcode as the `barcode` field.
    // We just use it directly — no local recalculation needed.
    const resolveProductBarcode = (product: any): string => {
      return product.barcode || product.sku_code || '';
    };

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const barcodeHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Barcodes</title>
        <style>
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
          }
          /* Screen display - Large preview for visibility (4x scale) */
          .barcode-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, 152mm);
            gap: 20mm;
            padding: 20px;
            justify-content: center;
          }
          .barcode-item {
            width: 152mm;
            height: 100mm;
            border: 2px solid #000;
            padding: 6mm;
            margin: 0;
            text-align: center;
            background: white;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-sizing: border-box;
            box-shadow: 0 8px 16px rgba(0,0,0,0.2);
            border-radius: 4px;
          }
          /* Screen preview - scaled for visibility */
          .company-name {
            font-size: 20px;
            font-weight: 800;
            margin: 0;
            padding-bottom: 2mm;
            margin-bottom: 3mm;
            text-transform: uppercase;
            line-height: 1.2;
            color: #000;
            border-bottom: 2px solid #000;
            letter-spacing: 0.5px;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          .product-name {
            font-size: 18px;
            font-weight: 800;
            margin: 2mm 0;
            padding: 0;
            line-height: 1.2;
            color: #000;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
          }
          .barcode-svg {
            width: auto;
            max-width: 100%;
            height: 26mm;
            margin: 1.2mm auto;
            display: block;
            shape-rendering: crispEdges;
          }
          .barcode-text {
            font-size: 22px;
            font-family: monospace;
            font-weight: 700;
            margin: 1.2mm 0;
            padding: 0;
            line-height: 1;
            color: #000;
            letter-spacing: 1.5px;
          }
          .price {
            font-size: 18px;
            font-weight: 600;
            margin-top: 2mm;
            padding-top: 1.5mm;
            color: #000;
            line-height: 1.1;
            border-top: 2px solid #000;
          }
          .price strong {
            font-size: 22px;
            font-weight: 900;
          }
          /* Thermal label printer - ACTUAL PRINT SIZE: 38mm × 25mm */
          @media print {
            * {
              color: #000000 !important;
            }
            @page {
              size: 38mm 30mm;
              margin: 0;
            }
            .no-print {
              display: none !important;
            }
            body {
              margin: 0 !important;
              padding: 0 !important;
              width: 38mm !important;
              background: white !important;
            }
            .barcode-grid {
              display: block !important;
              width: 38mm !important;
              padding: 0 !important;
              margin: 0 !important;
              gap: 0 !important;
            }
            .barcode-item {
              border: 0.2mm solid #000 !important;
              width: 38mm !important;
              height: 30mm !important;
              min-width: 38mm !important;
              min-height: 30mm !important;
              max-width: 38mm !important;
              max-height: 30mm !important;
              margin: 0 !important;
              padding: 0.8mm 1.2mm !important;
              page-break-after: always !important;
              box-shadow: none !important;
              border-radius: 0 !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              box-sizing: border-box !important;
            }
            .barcode-item:last-child {
              page-break-after: auto !important;
            }
            .company-name {
              font-size: 7.5px !important;
              font-weight: 800 !important;
              margin: 0 !important;
              padding: 0 0 0.3mm 0 !important;
              border-bottom: 0.5px solid #000 !important;
              letter-spacing: 0.1px !important;
              line-height: 1.1 !important;
              white-space: normal !important;
              overflow: visible !important;
              word-break: break-word !important;
              width: 100% !important;
            }
            .product-name {
              font-size: 7px !important;
              font-weight: 800 !important;
              margin: 0.2mm 0 0 0 !important;
              padding: 0 !important;
              letter-spacing: 0.1px !important;
              line-height: 1.1 !important;
              white-space: normal !important;
              overflow: visible !important;
              word-break: break-word !important;
              width: 100% !important;
            }
            .barcode-svg {
              height: 10mm !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0.5mm 0 0 0 !important;
              display: block !important;
              shape-rendering: crispEdges !important;
            }
            .barcode-text {
              font-size: 9px !important;
              font-weight: bold !important;
              font-family: monospace !important;
              margin: 0 !important;
              letter-spacing: 0.8px !important;
              line-height: 1 !important;
            }
            .price {
              font-size: 9px !important;
              font-weight: 600 !important;
              margin: 0.6mm 0 0 0 !important;
              padding: 0.4mm 0 0 0 !important;
              border-top: 0.5px solid #000 !important;
              line-height: 1.1 !important;
              color: #000 !important;
            }
            .price strong {
              font-size: 11px !important;
              font-weight: 900 !important;
              letter-spacing: 0.3px !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="padding: 10px; background: #f0f0f0; margin-bottom: 10px;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
            🖨️ Print Barcodes
          </button>
          <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; margin-left: 10px;">
            ❌ Close
          </button>
          <span style="margin-left: 20px; color: #666;">Size: 38mm × 30mm | ${productsList.length} labels</span>
        </div>
        <div class="barcode-grid">
          ${productsList.map(product => `
            <div class="barcode-item">
              <div class="company-name">${companyName}</div>
              <div class="product-name">${product.product_name}</div>
              <svg class="barcode-svg" id="barcode-${product.sku_code}"></svg>
              <div class="barcode-text">${resolveProductBarcode(product)}</div>
              <div class="price">Price: <strong>${siteSettings?.currency_icon || '৳'}${product.final_sale_price || product.unit_price}</strong></div>
            </div>
          `).join('')}
        </div>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <script>
          ${productsList.map(product => `
            try {
              JsBarcode("#barcode-${product.sku_code}", "${resolveProductBarcode(product)}", {
                format: "CODE128",
                width: 2.5,
                height: 55,
                displayValue: false,
                margin: 15,
                lineColor: "#000"
              });
            } catch (e) {
              console.error('Barcode generation failed for ${product.sku_code}:', e);
            }
          `).join('\n')}
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(barcodeHTML);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Products</h1>
            <p className="text-sm text-gray-500 mt-1">Manage products and print barcodes</p>
          </div>
          <div className="flex items-center gap-3">
            {selectedProducts.size > 0 && (
              <button
                onClick={handlePrintBarcodes}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Barcodes ({selectedProducts.size})
              </button>
            )}
            <button
              onClick={loadProducts}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative col-span-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by name, SKU, or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="relative">
            <select
              value={categoryFilter || ''}
              onChange={(e) => setCategoryFilter(e.target.value ? Number(e.target.value) : null)}
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none bg-white"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{filteredProducts.length}</span> product(s)
          {selectedProducts.size > 0 && (
            <span className="ml-2">
              • <span className="font-semibold text-blue-600">{selectedProducts.size}</span> selected
            </span>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No products found</h3>
            <p className="mt-2 text-sm text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedProducts.size === currentProducts.length && currentProducts.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      SKU / Barcode
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentProducts.map((product) => {
                    const category = categories.find(c => c.id === product.category_id);
                    return (
                      <tr key={product.sku_code} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product.sku_code)}
                            onChange={() => handleSelectProduct(product.sku_code)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {product.preview_image ? (
                              <img
                                src={product.preview_image}
                                alt={product.product_name}
                                className="w-12 h-12 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">📦</span>
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{product.product_name}</div>
                              {product.variant_attributes && (
                                <div className="text-xs text-gray-500">{product.variant_attributes}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-mono text-gray-900">{product.sku_code}</div>
                          {product.barcode && (
                            <div className="text-xs font-mono text-gray-500">{product.barcode}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {category?.name || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-bold text-gray-900">
                            {siteSettings?.currency_icon || '৳'}{product.final_sale_price || product.unit_price}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            product.available_stock > 10 
                              ? 'bg-green-100 text-green-700' 
                              : product.available_stock > 0 
                              ? 'bg-yellow-100 text-yellow-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {product.available_stock}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => printBarcodes([product])}
                            className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Print
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-700">
                    Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(indexOfLastItem, filteredProducts.length)}</span> of{' '}
                    <span className="font-medium">{filteredProducts.length}</span> products
                  </span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                    <option value={200}>200 per page</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
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
                          onClick={() => setCurrentPage(pageNum)}
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
                    onClick={() => setCurrentPage(currentPage + 1)}
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
    </div>
  );
}
