import { BrowserWindow } from 'electron';
import QRCode from 'qrcode';

export class InvoiceService {
  /**
   * Generate invoice HTML from order data
   * @param order - Order data
   * @param orderItems - Order items
   * @param settings - Site settings from database
   * @param appSettings - App settings (ZATCA phase etc)
   */
  public async generateInvoiceHTML(order: any, orderItems: any[], settings: any = {}, appSettings: any = {}): Promise<string> {
    const baseURL = process.env.API_BASE_URL || '';
    const invoiceNumber = order.remote_id || (order.local_id ? order.local_id.substring(0, 8) : order.id) || '';
    const invoiceDate = new Date(order.created_at).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    // ZATCA QR Code Generation
    let qrCodeDataUrl = '';
    if (appSettings && appSettings.country === 'Saudi Arabia') {
      try {
        const sellerName = appSettings.receipt_company_name || settings.title || settings.company_name || 'Karbar Ecommerce';
        const vatNumber = appSettings.vat_registration_number || settings.vat_number || '300000000000003';
        const timestamp = order.created_at;
        const totalAmount = order.total_amount.toString();
        const vatAmount = (order.vat_amount || 0).toString();

      const encodeTag = (tag: number, value: string) => {
        const valBuf = Buffer.from(value, 'utf8');
        const tagBuf = Buffer.alloc(2);
        tagBuf.writeUInt8(tag, 0);
        tagBuf.writeUInt8(valBuf.length, 1);
        return Buffer.concat([tagBuf, valBuf]);
      };

      const tlv = Buffer.concat([
        encodeTag(1, sellerName),
        encodeTag(2, vatNumber),
        encodeTag(3, timestamp),
        encodeTag(4, totalAmount),
        encodeTag(5, vatAmount)
      ]).toString('base64');

        const qrMargin = Math.max(appSettings.qrCodeMargin || settings.qr_code_margin || 3, 3);
        const qrSize = Math.max(appSettings.qrCodeSize || settings.qr_code_size || 256, 256);
        qrCodeDataUrl = await QRCode.toDataURL(tlv, { 
          margin: qrMargin, 
          width: qrSize,
          errorCorrectionLevel: 'M'
        });
      } catch (err) {
        console.error('Failed to generate ZATCA QR for print:', err);
      }
    }

    // Determine invoice type based on payment status
    const isPaid = order.payment_status === 'paid' || order.paid_amount >= order.total_amount;
    const invoiceType = isPaid ? 'TAX INVOICE' : 'DUE INVOICE';
    
    // Helper function to get full URL
    const getFullUrl = (url: string | null | undefined) => {
      if (!url) return '';
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      return url.startsWith('/') ? `${baseURL}${url}` : `${baseURL}/${url}`;
    };

    // Helper function to strip HTML tags
    const stripHtml = (html: string | null | undefined) => {
      if (!html) return '';
      return html.replace(/<[^>]*>/g, '').trim();
    };
    
    // Get logo and signature from settings
    // Use header_logo or footer_logo if invoice_logo is not a valid URL
    const logoUrl = settings.invoice_logo && settings.invoice_logo !== 'invoice_logo'
      ? getFullUrl(settings.invoice_logo)
      : getFullUrl(settings.header_logo || settings.footer_logo);
    
    const signatureUrl = getFullUrl(settings.signature);
    
    console.log('📄 Generating invoice:', {
      invoiceNumber,
      invoiceType,
      isPaid,
      paymentStatus: order.payment_status,
      paidAmount: order.paid_amount,
      totalAmount: order.total_amount,
      logoUrl,
      signatureUrl,
      companyName: settings.company_name
    });

    // Calculate totals
    const productsHTML = orderItems.map(item => `
      <tr>
        <td>${item.product_name}</td>
        <td>${item.quantity}</td>
        <td>${item.price}</td>
        <td>${item.total}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoiceNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            list-style: none;
        }

        .pos-container {
            width: 100%;
            max-width: 350px;
            margin: 0 auto !important;
            padding: 0px 12px;
            font-family: "Open Sans", sans-serif !important;
            overflow: hidden !important;
        }

        .pos-logo {
            margin-bottom: 8px;
            width: 60px;
        }

        .pos-logo img {
            max-width: 100%;
            width: 100%;
            height: 100%;
        }

        .pos-company-info ul {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .pos-company-info ul li {
            font-size: 10px !important;
            font-weight: 400;
            line-height: 10px !important;
            color: #000;
        }

        .pos-hr-line {
            margin: 8px 0px;
            border-top: 1px dashed #A3A3A3;
        }

        .pos-hr-line-2 {
            margin: 2px 0px 4px;
            border-top: 1px dashed #A3A3A3;
        }

        .pos-customer-info .pos-customer-info {
            width: 100%;
        }

        .pos-customer-info .pos-customer-info tr td {
            padding-bottom: 6px;
        }

        .pos-customer-info .pos-customer-info tr td:first-child {
            color: #000;
            font-size: 10px;
            font-weight: 400;
            line-height: 10px;
            text-align: left;
        }

        .pos-customer-info .pos-customer-info tr td:last-child {
            color: #000;
            font-size: 10px;
            font-weight: 500;
            line-height: 10px;
            text-align: right;
        }

        .pos-invoice-table {
            width: 100%;
            border-collapse: collapse;
            border-bottom: 0.5px solid rgba(0, 0, 0, 0.2) !important;
            padding-bottom: 10px !important;
        }

        .pos-invoice-table thead {
            border-bottom: 0.5px solid rgba(0, 0, 0, 0.2) !important;
        }

        .pos-invoice-table th {
            color: #000;
            font-size: 12px;
            font-weight: 500;
            line-height: 14px;
            padding-bottom: 5px;
            text-align: center !important;
        }

        .pos-invoice-table td {
            padding: 5px 0px;
            color: #000;
            font-size: 10px;
            font-weight: 500;
            line-height: 12px;
            text-align: center;
        }

        .pos-invoice-table th:first-child,
        .pos-invoice-table td:first-child {
            text-align: left !important;
        }

        .pos-invoice-table th:last-child,
        .pos-invoice-table td:last-child {
            text-align: end !important;
        }

        .pos-invoice-summary {
            display: flex;
            justify-content: end;
        }

        .pos-invoice-summary table {
            width: 170px;
        }

        .pos-invoice-summary td {
            padding: 6px 0px 0px;
            line-height: 10px;
            color: #000;
            font-size: 10px;
            font-weight: 500;
        }

        .pos-invoice-summary td:first-child {
            font-weight: 400;
            text-align: left;
        }

        .pos-invoice-summary td:last-child {
            font-weight: 500;
            text-align: right;
        }

        .pos-footer-area {
            margin-bottom: 20px;
        }

        .pos-footer {
            margin-top: 20px;
        }

        .pos-footer-info {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
        }

        .pos-footer-info p {
            color: #000;
            font-size: 10px;
            font-weight: 400;
            line-height: 17px !important;
            text-align: center;
        }

        .pos-hero {
            display: flex;
            margin-top: 16px;
            justify-content: space-between;
        }

        .tax_invoice {
            text-align: center;
            white-space: nowrap;
        }

        .fs-wrapper {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
        }

        .fs-wrapper.fs-pos {
            margin-top: 15px;
            margin-bottom: 0px !important;
        }

        .fs-pos .thnx-text {
            max-width: 200px !important;
            font-size: 10px !important;
        }

        .power-by span {
            font-weight: 600;
        }

        .footer-signature {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .ab-signature-img {
            width: 50px;
            height: auto;
            max-height: 40px;
            object-fit: contain;
        }

        .ab-print-btn-box {
            display: flex;
            justify-content: end;
            gap: 14px;
            margin-top: 30px;
            padding-right: 60px;
        }

        .ab-print-btn-box .ab-btn-1,
        .ab-print-btn-box .ab-btn-2 {
            padding: 8px 18px;
            font-size: 14px;
            font-weight: 500;
            line-height: 26px;
            text-align: left;
            border-radius: 8px;
            background-color: #1A1A1A;
            color: #FFF;
            cursor: pointer;
            border: none;
        }

        /* XPrinter/Epson Thermal Printer Optimization */
        @media print {
            @page {
                size: 80mm auto;
                margin: 0;
            }

            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
                background-color: transparent !important;
                color: #000 !important;
            }

            body {
                margin: 0 !important;
                padding: 0 !important;
                width: 72mm !important; /* Slightly less than 80mm to avoid edge cutting */
                background: white !important;
                font-family: Arial, sans-serif !important;
            }

            .ab-print-btn-box {
                display: none !important;
            }

            .pos-container {
                width: 100% !important;
                max-width: 100% !important;
                padding: 2mm !important;
                margin: 0 !important;
                box-sizing: border-box !important;
            }

            .pos-logo {
                width: 30mm !important;
                margin: 0 auto 2mm !important;
                text-align: center;
                display: block;
            }

            .pos-logo img {
                max-width: 100% !important;
                height: auto !important;
            }

            .pos-company-info {
                text-align: center !important;
            }

            .pos-company-info ul {
                gap: 1mm !important;
                list-style: none !important;
                padding: 0 !important;
            }

            .pos-company-info ul li {
                font-size: 8pt !important;
                line-height: 1.2 !important;
                word-wrap: break-word !important;
            }

            .pos-hero {
                margin-top: 0 !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
            }

            .tax_invoice {
                font-size: 8pt !important;
                font-weight: bold !important;
                margin: 2mm 0 !important;
                text-decoration: underline;
                text-align: center !important;
                width: 100%;
                white-space: nowrap !important;
            }

            .pos-hr-line, .pos-hr-line-2 {
                margin: 1mm 0 !important;
                border-top: 1px dashed #000 !important;
                width: 100% !important;
            }

            .pos-customer-info {
                width: 100% !important;
            }

            .pos-customer-info table {
                width: 100% !important;
            }

            .pos-customer-info tr td {
                font-size: 8pt !important;
                padding: 0.5mm 0 !important;
            }

            .pos-invoice-table {
                width: 100% !important;
                table-layout: fixed !important;
                border-collapse: collapse !important;
            }

            .pos-invoice-table th {
                font-size: 8pt !important;
                border-bottom: 1px solid #000 !important;
                padding: 1mm 0 !important;
            }

            .pos-invoice-table td {
                font-size: 7pt !important;
                padding: 1mm 0 !important;
                word-wrap: break-word !important;
            }

            .pos-invoice-table th:nth-child(1), .pos-invoice-table td:nth-child(1) { width: 50%; text-align: left; }
            .pos-invoice-table th:nth-child(2), .pos-invoice-table td:nth-child(2) { width: 15%; text-align: center; }
            .pos-invoice-table th:nth-child(3), .pos-invoice-table td:nth-child(3) { width: 15%; text-align: right; }
            .pos-invoice-table th:nth-child(4), .pos-invoice-table td:nth-child(4) { width: 20%; text-align: right; }

            .pos-invoice-summary {
                margin-top: 2mm !important;
            }

            .pos-invoice-summary table {
                width: 100% !important;
            }

            .pos-invoice-summary td {
                font-size: 8pt !important;
                padding: 0.5mm 0 !important;
            }

            .pos-footer-area {
                margin-top: 4mm !important;
                text-align: center !important;
            }

            .thnx-text {
                font-size: 8pt !important;
                font-style: italic !important;
            }

            .footer-signature img {
                width: 25mm !important;
                height: auto !important;
            }

            .qr-code-img {
                width: 30mm !important;
                height: 30mm !important;
                margin: 2mm auto !important;
                display: block !important;
                image-rendering: pixelated !important;
            }
        }
    </style>
</head>
<body>
<div id="pos-invoice" class="pos-invoice receipt">
    <div class="pos-invoice-area receipt">
        <div class="pos-container receipt">
            <div>
                <div class="pos-hero">
                    <div>
                        ${logoUrl ? `
                        <div class="pos-logo">
                            <img src="${logoUrl}" alt="Invoice Logo" onerror="this.style.display='none'">
                        </div>
                        ` : ''}
                        <div class="pos-company-info">
                            <ul>
                                <li class="company-name"><strong>${settings.title || settings.company_name || 'Karbar Ecommerce'}</strong></li>
                                <li class="phone">${settings.phone || '+8801967005005'}</li>
                                ${settings.email ? `<li class="email">${settings.email}</li>` : ''}
                                ${settings.website ? `<li class="website">${settings.website}</li>` : ''}
                                <li class="txt">${stripHtml(settings.address) || 'N/A'}</li>
                            </ul>
                        </div>
                    </div>
                    <div class="">
                        <p class="tax_invoice"><strong>${invoiceType}</strong></p>
                    </div>
                </div>

                <hr class="pos-hr-line">

                <div class="pos-bill-details">
                    <div class="pos-customer-info">
                        <table class="pos-customer-info">
                            ${(order.customer_id !== 1 && !(order.customer_name?.toLowerCase().includes('walk in'))) ? `
                            <tr>
                                <td>Name</td>
                                <td>${order.customer_name || 'Walk in Customer'}</td>
                            </tr>
                            <tr>
                                <td>Phone</td>
                                <td>${order.customer_phone || 'N/A'}</td>
                            </tr>
                            ` : ''}
                            <tr>
                                <td>Invoice date</td>
                                <td>${invoiceDate}</td>
                            </tr>
                            <tr>
                                <td>Invoice number</td>
                                <td>${invoiceNumber}</td>
                            </tr>
                            <tr>
                                <td>Payment Status</td>
                                <td>${isPaid ? `Paid (${order.payment_method})` : 'Due'}</td>
                            </tr>
                            ${!isPaid && order.paid_amount > 0 ? `
                            <tr>
                                <td>Partial Payment</td>
                                <td>${order.paid_amount} (${order.payment_method})</td>
                            </tr>
                            ` : ''}
                             ${(order.shipping_address && !(order.customer_name?.toLowerCase().includes('walk in'))) ? `
                            <tr>
                                <td>Address</td>
                                <td>${order.shipping_address}</td>
                            </tr>
                            ` : ''}
                        </table>
                    </div>
                </div>
                <hr class="pos-hr-line-2">
                <div class="pos-invoice-container">
                    <table class="pos-invoice-table">
                        <thead>
                        <tr>
                            <th>Product Name</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Amount</th>
                        </tr>
                        </thead>
                        <tbody>
                            ${productsHTML}
                        </tbody>
                    </table>
                        <div class="pos-invoice-summary" style="width: 100%;">
                            <table style="width: 100%;">
                            <tr>
                                <td>Subtotal:</td>
                                <td style="text-align: right;">${order.sub_total}</td>
                            </tr>
                            ${order.vat_amount > 0 ? `
                            <tr>
                                <td class="text">Vat (${order.vat}%)${order.is_tax_inclusive ? ' (Incl.)' : ''}:</td>
                                <td style="text-align: right;">${order.vat_amount.toFixed(2)}</td>
                            </tr>
                            ` : ''}
                            ${order.discount_amount > 0 ? `
                            <tr>
                                <td class="text">Discount:</td>
                                <td style="text-align: right;">-${order.discount_amount}</td>
                            </tr>
                            ` : ''}
                            <tr>
                                <td class="text"><strong>Total:</strong></td>
                                <td style="text-align: right;"><strong>${order.total_amount}</strong></td>
                            </tr>
                            ${isPaid ? `
                            <tr>
                                <td class="text">Paid:</td>
                                <td style="text-align: right;">${order.paid_amount}</td>
                            </tr>
                            ${order.change_amount > 0 ? `
                            <tr>
                                <td class="text">Change:</td>
                                <td style="text-align: right;">${order.change_amount}</td>
                            </tr>
                            ` : ''}
                            ` : `
                            <tr>
                                <td class="text">Paid:</td>
                                <td style="text-align: right;">${order.paid_amount || 0}</td>
                            </tr>
                            <tr>
                                <td class="text"><strong>Due Amount:</strong></td>
                                <td style="text-align: right;"><strong>${(order.total_amount - (order.paid_amount || 0)).toFixed(2)}</strong></td>
                            </tr>
                            `}
                        </table>
                    </div>
                    ${qrCodeDataUrl ? `
                    <div style="margin-top: 15px; display: flex; justify-content: center;">
                        <img src="${qrCodeDataUrl}" class="qr-code-img" style="border: 0.5px solid #eee;">
                    </div>
                    ` : ''}
                </div>
            </div>
            <div class="pos-footer-area">
                <div class="fs-wrapper fs-pos" style="display: flex; flex-direction: column; align-items: center; gap: 5px;">
                    <p class="thnx-text" style="text-align: center;">${settings.invoice_footer_note || 'Thanks for your order!'}</p>
                </div>
                <div class="pos-footer" style="margin-top: 5mm; border-top: 1px dashed #000; padding-top: 2mm;">
                    <div class="pos-footer-info" style="text-align: center;">
                        <p style="font-size: 7pt; margin-bottom: 2mm;">Order Ref: ${invoiceNumber}</p>
                        <p class="power-by" style="font-size: 8pt; font-weight: bold;">Powered By Karbar</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="ab-print-btn-box">
            <button class="ab-btn-2" onclick="window.print()">Print</button>
            <button class="ab-btn-1" onclick="window.close()">Close</button>
        </div>
    </div>
</div>
</body>
</html>`;

    return html;
  }

  /**
   * Print invoice in a new window
   */
  public async printInvoice(order: any, orderItems: any[], settings: any = {}, appSettings: any = {}): Promise<void> {
    const html = await this.generateInvoiceHTML(order, orderItems, settings, appSettings);
    
    // Create a new window for printing
    const printWindow = new BrowserWindow({
      width: 400,
      height: 800,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    printWindow.webContents.on('did-finish-load', () => {
      printWindow.show();
      
      // Auto-print after a short delay
      setTimeout(() => {
        printWindow.webContents.print({
          silent: false,
          printBackground: true,
          margins: {
            marginType: 'none'
          }
        }, (success, errorType) => {
          if (!success) {
            console.error('Print failed:', errorType);
          }
        });
      }, 500);
    });
  }
}

// Singleton instance
let invoiceService: InvoiceService | null = null;

export function getInvoiceService(): InvoiceService {
  if (!invoiceService) {
    invoiceService = new InvoiceService();
  }
  return invoiceService;
}
