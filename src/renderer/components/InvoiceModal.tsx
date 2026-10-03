import { useEffect, useState } from 'react';
import { ZatcaQr } from '../../shared/utils/zatca';
import { generateBarcodeDataUrl } from '../../shared/utils/barcode';

interface InvoiceModalProps {
  orderData: any;
  onClose: () => void;
  autoPrint?: boolean;
  isHidden?: boolean;
}

export default function InvoiceModal({ orderData, onClose, autoPrint = false, isHidden = false }: InvoiceModalProps) {
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [appSettings, setAppSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [barcodeUrl, setBarcodeUrl] = useState<string>('');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  // Derive these early — used inside hooks below
  const invoiceNo = orderData.remote_id ? String(orderData.remote_id) : (orderData.local_id ? orderData.local_id.substring(0, 8) : String(orderData.id || ''));
  const isPaid = orderData.payment_status === 'paid' || orderData.paid_amount >= orderData.total_amount;

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [sSettings, aSettings, methods] = await Promise.all([
          window.electronAPI.getSiteSettings(),
          window.electronAPI.getSettings(),
          window.electronAPI.getPaymentMethods(),
        ]);
        setSiteSettings(sSettings);
        setAppSettings(aSettings);
        setPaymentMethods(methods || []);
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Generate ZATCA QR code — only for Saudi Arabia
  // Generate Code128 barcode — only for Bangladesh
  useEffect(() => {
    const generateQr = async () => {
      if (siteSettings && appSettings && appSettings.country === 'Saudi Arabia') {
        try {
          const sellerName = appSettings.receiptCompanyName || siteSettings.title || siteSettings.company_name || 'Company';
          const vatNumber = appSettings.vatNumber || siteSettings.vat_number || '300000000000003';
          const timestamp = orderData.created_at || new Date().toISOString();
          const totalAmount = String(orderData.total_amount);
          const vatAmount = String(orderData.vat_amount || 0);
          const qrUrl = await ZatcaQr.generateQrCodeDataUrl(
            sellerName, vatNumber, timestamp, totalAmount, vatAmount,
            appSettings.qrCodeSize || 256,
            appSettings.qrCodeMargin || 3
          );
          setQrCodeUrl(qrUrl);
          setBarcodeUrl('');
        } catch (err) {
          console.error('ZATCA QR generation failed:', err);
          setQrCodeUrl('');
        }
      } else if (appSettings && appSettings.country !== 'Saudi Arabia' && invoiceNo) {
        // Generate Code128 linear barcode for all other countries
        try {
          const url = generateBarcodeDataUrl(invoiceNo, { barWidth: 2, height: 50, fontSize: 0 });
          setBarcodeUrl(url);
        } catch (err) {
          console.error('Barcode generation failed:', err);
          setBarcodeUrl('');
        }
        setQrCodeUrl('');
      } else {
        setQrCodeUrl('');
        setBarcodeUrl('');
      }
    };
    generateQr();
  }, [siteSettings, appSettings, orderData, invoiceNo]);

  // Auto-print when settings loaded (wait for QR/barcode if needed)
  useEffect(() => {
    if (!autoPrint || loading) return;
    const isSaudi = appSettings?.country === 'Saudi Arabia';
    const showBarcode = appSettings?.country !== 'Saudi Arabia';
    // Wait until QR is generated for Saudi Arabia
    if (isSaudi && !qrCodeUrl) return;
    // Wait until barcode is generated for other countries
    if (showBarcode && invoiceNo && !barcodeUrl) return;
    const timer = setTimeout(() => {
      handlePrint();
      setTimeout(() => onClose(), 2500);
    }, 400);
    return () => clearTimeout(timer);
  }, [autoPrint, loading, qrCodeUrl, barcodeUrl, appSettings, invoiceNo]);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.ctrlKey && e.key === 'p') { e.preventDefault(); handlePrint(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const getPaymentMethodName = () => {
    if (typeof orderData.payment_method === 'string' && isNaN(Number(orderData.payment_method)))
      return orderData.payment_method;
    const id = Number(orderData.payment_method);
    return paymentMethods.find(m => m.id === id)?.name || 'Cash';
  };

  const stripHtml = (html: string | null | undefined) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const getFullUrl = (url: string | null | undefined) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';
    return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
  };

  const invoiceType = isPaid ? 'TAX INVOICE' : 'DUE INVOICE';
  const isWalkIn = orderData.customer_id === 1 || orderData.customer_name?.toLowerCase().includes('walk in');

  const currency = siteSettings?.currency_icon || '৳';
  const companyName = siteSettings?.title || siteSettings?.company_name || 'Company Name';
  const logoUrl = siteSettings?.invoice_logo && siteSettings.invoice_logo !== 'invoice_logo'
    ? getFullUrl(siteSettings.invoice_logo)
    : getFullUrl(siteSettings?.header_logo || siteSettings?.footer_logo);
  const signatureUrl = getFullUrl(siteSettings?.signature);
  const footerNote = siteSettings?.invoice_footer_note || 'Thanks for your order! We look forward to serving you again soon.';


  // Build the clean print HTML
  const buildPrintHtml = () => {
    const isSaudiArabia = appSettings?.country === 'Saudi Arabia';
    const isBangladesh  = appSettings?.country === 'Bangladesh';
    const itemRows = (orderData.items || []).map((item: any) => `
      <tr>
        <td style="padding:5px 0;font-size:12px;color:#222;vertical-align:top;width:45%;">${item.product_name}</td>
        <td style="padding:5px 0;font-size:12px;color:#222;text-align:center;width:10%;">${item.quantity}</td>
        <td style="padding:5px 0;font-size:12px;color:#222;text-align:right;width:20%;">${Number(item.price).toFixed(2)}</td>
        <td style="padding:5px 0;font-size:12px;color:#222;text-align:right;width:25%;font-weight:600;">${Number(item.total).toFixed(2)}</td>
      </tr>
    `).join('');

    const customerRows = !isWalkIn ? `
      <tr><td style="color:#555;padding:3px 0;font-size:12px;">Name</td><td style="text-align:right;font-size:12px;color:#222;font-weight:500;">${orderData.customer_name || ''}</td></tr>
      <tr><td style="color:#555;padding:3px 0;font-size:12px;">Phone</td><td style="text-align:right;font-size:12px;color:#222;font-weight:500;">${orderData.customer_phone || ''}</td></tr>
      ${orderData.shipping_address ? `<tr><td style="color:#555;padding:3px 0;font-size:12px;">Address</td><td style="text-align:right;font-size:12px;color:#222;font-weight:500;">${orderData.shipping_address}</td></tr>` : ''}
    ` : '';

    const vatRow = orderData.vat_amount > 0 && orderData.vat !== '0' && orderData.vat !== 0 ? `
      <tr>
        <td style="padding:3px 0;font-size:12px;color:#555;">VAT (${orderData.vat}%)${orderData.is_tax_inclusive ? ' (Incl.)' : ''}:</td>
        <td style="text-align:right;font-size:12px;color:#222;font-weight:500;">${currency}${Number(orderData.vat_amount).toFixed(2)}</td>
      </tr>
    ` : '';

    const discountRow = orderData.discount_amount > 0 ? `
      <tr>
        <td style="padding:3px 0;font-size:12px;color:#555;">Discount:</td>
        <td style="text-align:right;font-size:12px;color:#222;font-weight:500;">${Number(orderData.discount_amount).toFixed(2)}</td>
      </tr>
    ` : '';

    const dueRow = !isPaid ? `
      <tr>
        <td style="padding:3px 0;font-size:12px;color:#c00;font-weight:700;">Due Amount:</td>
        <td style="text-align:right;font-size:12px;color:#c00;font-weight:700;">${currency}${(Number(orderData.total_amount) - Number(orderData.paid_amount || 0)).toFixed(2)}</td>
      </tr>
    ` : '';

    const changeRow = isPaid && orderData.change_amount > 0 ? `
      <tr>
        <td style="padding:3px 0;font-size:12px;color:#555;">Change:</td>
        <td style="text-align:right;font-size:12px;color:#222;font-weight:500;">${Number(orderData.change_amount).toFixed(2)}</td>
      </tr>
    ` : '';

    // Logo and signature HTML
    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="logo" style="height:40px;width:auto;object-fit:contain;display:block;margin-bottom:4px;" />`
      : `<div style="font-size:22px;font-weight:800;color:#222;margin-bottom:4px;">${companyName}</div>`;

    const signatureHtml = signatureUrl
      ? `<img src="${signatureUrl}" alt="signature" style="height:32px;width:auto;object-fit:contain;display:block;" />`
      : `<div style="font-size:13px;color:#555;font-style:italic;">Signature</div>`;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 0; size: 80mm auto; }
    * { box-sizing: border-box; color: #000000 !important; }
    body {
      margin: 0;
      padding: 6mm 5mm;
      background: white;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      width: 80mm;
    }
    .dashed { border-top: 1px dashed #aaa; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: 0; }
  </style>
</head>
<body>

  <!-- Header: Logo left, Invoice Type right -->
  <table style="width:100%;margin-bottom:6px;">
    <tr>
      <td style="vertical-align:top;width:60%;">
        ${logoHtml}
        <div style="font-size:13px;font-weight:700;color:#222;">${companyName}</div>
        ${siteSettings?.phone ? `<div style="font-size:11px;color:#444;">${siteSettings.phone}</div>` : ''}
        ${siteSettings?.email ? `<div style="font-size:11px;color:#444;">${siteSettings.email}</div>` : ''}
        ${siteSettings?.website ? `<div style="font-size:11px;color:#444;">${siteSettings.website}</div>` : ''}
        ${siteSettings?.address ? `<div style="font-size:11px;color:#444;">${stripHtml(siteSettings.address)}</div>` : ''}
        ${appSettings?.receiptCompanyName && appSettings.receiptCompanyName !== companyName ? `<div style="font-size:11px;color:#555;"><b>Sales From:</b> ${appSettings.receiptCompanyName}</div>` : ''}
      </td>
      <td style="vertical-align:top;text-align:right;width:40%;white-space:nowrap;">
        <div style="font-size:12px;font-weight:700;color:#111;letter-spacing:0.5px;white-space:nowrap;">${invoiceType}</div>
      </td>
    </tr>
  </table>

  <div class="dashed"></div>

  <!-- Customer & Invoice Info -->
  <table style="width:100%;margin-bottom:4px;">
    ${customerRows}
    <tr>
      <td style="color:#555;padding:3px 0;font-size:12px;">Invoice Date</td>
      <td style="text-align:right;font-size:12px;color:#222;font-weight:500;">${formatDate(orderData.created_at)}</td>
    </tr>
    <tr>
      <td style="color:#555;padding:3px 0;font-size:12px;">Invoice No</td>
      <td style="text-align:right;font-size:12px;color:#222;font-weight:500;">${invoiceNo}</td>
    </tr>
    <tr>
      <td style="color:#555;padding:3px 0;font-size:12px;">Payment Status</td>
      <td style="text-align:right;font-size:12px;color:#222;font-weight:500;">${isPaid ? 'Paid' : 'Partial'} (${getPaymentMethodName()})</td>
    </tr>
  </table>

  <div class="dashed"></div>

  <!-- Products Table -->
  <table style="width:100%;border-collapse:collapse;margin:0 0 4px 0;">
    <thead>
      <tr style="border-bottom:1px dashed #aaa;">
        <th style="text-align:left;font-size:12px;font-weight:700;padding:4px 0;color:#222;width:45%;">Product Name</th>
        <th style="text-align:center;font-size:12px;font-weight:700;padding:4px 0;color:#222;width:10%;">Qty</th>
        <th style="text-align:right;font-size:12px;font-weight:700;padding:4px 0;color:#222;width:20%;">Price</th>
        <th style="text-align:right;font-size:12px;font-weight:700;padding:4px 0;color:#222;width:25%;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="dashed"></div>

  <!-- Totals (right-aligned block) -->
  <table style="width:60%;margin-left:auto;margin-bottom:8px;">
    <tr>
      <td style="padding:3px 0;font-size:12px;color:#555;">Subtotal:</td>
      <td style="text-align:right;font-size:12px;color:#222;font-weight:500;">${currency}${Number(orderData.sub_total).toFixed(2)}</td>
    </tr>
    ${discountRow}
    ${vatRow}
    <tr style="border-top:1px dashed #aaa;">
      <td style="padding:4px 0 3px;font-size:13px;font-weight:700;color:#111;">Total:</td>
      <td style="text-align:right;font-size:13px;font-weight:700;color:#111;padding:4px 0 3px;">${currency}${Number(orderData.total_amount).toFixed(2)}</td>
    </tr>
    <tr>
      <td style="padding:3px 0;font-size:12px;color:#555;">Paid:</td>
      <td style="text-align:right;font-size:12px;color:#222;font-weight:500;">${Number(orderData.paid_amount || 0).toFixed(2)}</td>
    </tr>
    ${changeRow}
    ${dueRow}
  </table>

  <div class="dashed"></div>

  <!-- Footer: Thank you note left, Logo+Signature right -->
  <table style="width:100%;margin-top:6px;">
    <tr>
      <td style="vertical-align:bottom;width:55%;">
        <div style="font-size:11px;color:#555;line-height:1.5;">${footerNote}</div>
      </td>
      <td style="vertical-align:bottom;text-align:right;width:45%;">
        ${logoHtml}
        ${signatureHtml}
      </td>
    </tr>
  </table>

  <!-- Code128 Barcode (Non-Saudi countries) -->
  ${!isSaudiArabia && barcodeUrl ? `
  <div style="text-align:center;margin:10px 0;border-top:1px dashed #aaa;padding-top:10px;">
    <img src="${barcodeUrl}" alt="Barcode" style="max-width:100%;height:auto;display:block;margin:0 auto;image-rendering:pixelated;" />
    <div style="font-size:10px;color:#555;margin-top:4px;font-family:monospace;letter-spacing:1px;">
      ${orderData.remote_id ? `Invoice No: ${invoiceNo}` : `Order No: ${invoiceNo}`}
    </div>
  </div>
  ` : ''}

  <!-- Saudi Arabia: ZATCA QR Code -->
  ${isSaudiArabia && qrCodeUrl ? `
  <div style="text-align:center;margin:10px 0;border-top:1px dashed #aaa;padding-top:10px;">
    <img src="${qrCodeUrl}" alt="ZATCA QR" style="width:130px;height:130px;object-fit:contain;display:block;margin:0 auto;image-rendering:pixelated;" />
    <div style="font-size:10px;color:#888;margin-top:3px;">ZATCA QR Code</div>
  </div>
  ` : ''}

  <!-- Powered By -->
  <div style="text-align:center;font-size:11px;color:#777;margin-top:8px;">
    Powered By <strong>Karbar</strong>
  </div>


</body>
</html>`;
  };

  const handlePrint = async () => {
    const html = buildPrintHtml();
    try {
      await window.electronAPI.printInvoice(html);
    } catch (error) {
      console.error('Print failed:', error);
      // Fallback: open in new window
      const win = window.open('', '_blank', 'width=400,height=700');
      if (win) {
        win.document.write(html);
        win.document.close();
      }
    }
  };

  if (loading) {
    return (
      <div className={`fixed z-50 ${isHidden ? 'left-[-9999px] top-0 opacity-0 pointer-events-none' : 'inset-0 bg-black bg-opacity-50 flex items-center justify-center'}`}>
        <div className="bg-white rounded-lg p-8 flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-700">Preparing invoice...</span>
        </div>
      </div>
    );
  }

  // Hidden mode (auto-print only, not shown to user)
  if (isHidden) {
    return <div className="fixed left-[-9999px] top-0 opacity-0 pointer-events-none" />;
  }

  // ────────────────────────────────────────────────────────
  // Screen preview — mirrors the print layout closely
  // ────────────────────────────────────────────────────────
  const currency2 = siteSettings?.currency_icon || '৳';
  const isWalkIn2 = isWalkIn;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden">

        {/* Scrollable invoice preview */}
        <div className="flex-1 overflow-y-auto p-5" style={{ fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#222' }}>

          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <div>
              {logoUrl
                ? <img src={logoUrl} alt="logo" className="h-10 w-auto object-contain mb-1" onError={e => e.currentTarget.style.display = 'none'} />
                : null}
              <div className="font-bold text-sm">{companyName}</div>
              {siteSettings?.phone && <div className="text-xs text-gray-600">{siteSettings.phone}</div>}
              {siteSettings?.email && <div className="text-xs text-gray-600">{siteSettings.email}</div>}
              {siteSettings?.website && <div className="text-xs text-gray-600">{siteSettings.website}</div>}
              {siteSettings?.address && <div className="text-xs text-gray-600">{stripHtml(siteSettings.address)}</div>}
              {appSettings?.receiptCompanyName && appSettings.receiptCompanyName !== companyName &&
                <div className="text-xs text-gray-600"><b>Sales From:</b> {appSettings.receiptCompanyName}</div>}
            </div>
            <div className="text-right">
              <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none mb-1">×</button>
              <div className="font-bold text-xs whitespace-nowrap">{invoiceType}</div>
            </div>
          </div>

          <hr className="border-dashed border-gray-300 my-2" />

          {/* Customer & invoice info */}
          <table className="w-full mb-2">
            <tbody>
              {!isWalkIn2 && <>
                <tr><td className="text-gray-500 text-xs py-0.5">Name</td><td className="text-right text-xs font-medium py-0.5">{orderData.customer_name}</td></tr>
                <tr><td className="text-gray-500 text-xs py-0.5">Phone</td><td className="text-right text-xs font-medium py-0.5">{orderData.customer_phone || ''}</td></tr>
                {orderData.shipping_address && <tr><td className="text-gray-500 text-xs py-0.5">Address</td><td className="text-right text-xs font-medium py-0.5">{orderData.shipping_address}</td></tr>}
              </>}
              <tr><td className="text-gray-500 text-xs py-0.5">Invoice Date</td><td className="text-right text-xs font-medium py-0.5">{formatDate(orderData.created_at)}</td></tr>
              <tr><td className="text-gray-500 text-xs py-0.5">Invoice No</td><td className="text-right text-xs font-medium py-0.5">{invoiceNo}</td></tr>
              <tr><td className="text-gray-500 text-xs py-0.5">Payment Status</td><td className="text-right text-xs font-medium py-0.5">{isPaid ? 'Paid' : 'Partial'} ({getPaymentMethodName()})</td></tr>
            </tbody>
          </table>

          <hr className="border-dashed border-gray-300 my-2" />

          {/* Products */}
          <table className="w-full mb-2">
            <thead>
              <tr className="border-b border-dashed border-gray-300">
                <th className="text-left text-xs font-bold py-1.5 text-gray-700 w-[45%]">Product Name</th>
                <th className="text-center text-xs font-bold py-1.5 text-gray-700 w-[10%]">Qty</th>
                <th className="text-right text-xs font-bold py-1.5 text-gray-700 w-[20%]">Price</th>
                <th className="text-right text-xs font-bold py-1.5 text-gray-700 w-[25%]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(orderData.items || []).map((item: any, i: number) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1.5 text-xs text-gray-800">{item.product_name}</td>
                  <td className="py-1.5 text-xs text-center text-gray-700">{item.quantity}</td>
                  <td className="py-1.5 text-xs text-right text-gray-700">{Number(item.price).toFixed(2)}</td>
                  <td className="py-1.5 text-xs text-right font-semibold text-gray-800">{Number(item.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals — right aligned */}
          <div className="flex justify-end mb-3">
            <table style={{ width: '60%' }}>
              <tbody>
                <tr><td className="text-xs text-gray-500 py-0.5">Subtotal:</td><td className="text-right text-xs font-medium py-0.5">{currency2}{Number(orderData.sub_total).toFixed(2)}</td></tr>
                {orderData.discount_amount > 0 && <tr><td className="text-xs text-gray-500 py-0.5">Discount:</td><td className="text-right text-xs font-medium py-0.5">{Number(orderData.discount_amount).toFixed(2)}</td></tr>}
                {orderData.vat_amount > 0 && orderData.vat !== '0' && <tr><td className="text-xs text-gray-500 py-0.5">VAT ({orderData.vat}%){orderData.is_tax_inclusive ? ' (Incl.)' : ''}:</td><td className="text-right text-xs font-medium py-0.5">{currency2}{Number(orderData.vat_amount).toFixed(2)}</td></tr>}
                <tr className="border-t border-dashed border-gray-300"><td className="text-sm font-bold py-1">Total:</td><td className="text-right text-sm font-bold py-1">{currency2}{Number(orderData.total_amount).toFixed(2)}</td></tr>
                <tr><td className="text-xs text-gray-500 py-0.5">Paid:</td><td className="text-right text-xs font-medium py-0.5">{Number(orderData.paid_amount || 0).toFixed(2)}</td></tr>
                {isPaid && orderData.change_amount > 0 && <tr><td className="text-xs text-gray-500 py-0.5">Change:</td><td className="text-right text-xs font-medium py-0.5">{Number(orderData.change_amount).toFixed(2)}</td></tr>}
                {!isPaid && <tr><td className="text-xs text-red-600 font-bold py-0.5">Due Amount:</td><td className="text-right text-xs text-red-600 font-bold py-0.5">{currency2}{(Number(orderData.total_amount) - Number(orderData.paid_amount || 0)).toFixed(2)}</td></tr>}
              </tbody>
            </table>
          </div>

          <hr className="border-dashed border-gray-300 my-2" />

          {/* Footer */}
          <div className="flex justify-between items-end mt-2 mb-3">
            <div className="text-xs text-gray-500 leading-relaxed" style={{ maxWidth: '55%' }}>{footerNote}</div>
            <div className="text-right">
              {logoUrl && <img src={logoUrl} alt="logo" className="h-8 w-auto object-contain ml-auto mb-1" onError={e => e.currentTarget.style.display = 'none'} />}
              {signatureUrl
                ? <img src={signatureUrl} alt="signature" className="h-8 w-auto object-contain ml-auto" onError={e => e.currentTarget.style.display = 'none'} />
                : <div className="text-xs text-gray-500 italic">Signature</div>}
            </div>
          </div>

          {/* Code128 Barcode (Non-Saudi countries) */}
          {appSettings?.country !== 'Saudi Arabia' && barcodeUrl && (
            <div className="flex flex-col items-center mt-3 pt-3 border-t border-dashed border-gray-200">
              <img src={barcodeUrl} alt="Barcode" className="max-w-full h-12 object-contain mx-auto block" style={{ imageRendering: 'pixelated' }} />
              <div className="text-xs font-mono text-gray-600 mt-1.5 tracking-widest text-center">
                {orderData.remote_id ? `Invoice No: ${invoiceNo}` : `Order No: ${invoiceNo}`}
              </div>
            </div>
          )}

          {/* Saudi Arabia: ZATCA QR Code */}
          {appSettings?.country === 'Saudi Arabia' && qrCodeUrl && (
            <div className="flex flex-col items-center mt-4 pt-3 border-t border-dashed border-gray-200">
              <div className="bg-white p-2 border border-gray-200 rounded-lg shadow-sm">
                <img src={qrCodeUrl} alt="ZATCA QR" className="w-32 h-32 object-contain" style={{ imageRendering: 'pixelated' }} />
              </div>
              <div className="text-xs text-gray-400 mt-1">ZATCA QR Code</div>
            </div>
          )}

          <div className="text-center text-xs text-gray-400 mt-3">
            Powered By <span className="font-bold text-gray-600">Karbar</span>
          </div>
        </div>

        {/* Print button */}
        <div className="p-4 border-t bg-white shrink-0">
          <button
            onClick={handlePrint}
            className="w-full bg-gray-900 text-white py-3 rounded-xl hover:bg-black font-semibold text-base shadow-lg transition-all"
          >
            🖨️ Print
          </button>
        </div>
      </div>
    </div>
  );
}
