import QRCode from 'qrcode';

/**
 * ZATCA (Saudi Arabia) E-Invoicing QR Code Generator
 * Following TLV (Tag-Length-Value) standard for Phase 1
 */
export class ZatcaQr {
  /**
   * Generates a Base64 encoded TLV string for ZATCA
   * @param sellerName - Name of the seller
   * @param vatNumber - VAT registration number (15 digits)
   * @param timestamp - ISO 8601 timestamp
   * @param totalAmount - Total invoice amount including VAT
   * @param vatAmount - Total VAT amount
   */
  public static generateTlv(
    sellerName: string,
    vatNumber: string,
    timestamp: string,
    totalAmount: string,
    vatAmount: string
  ): string {
    const encoder = new TextEncoder();
    
    const tags = [
      this.encodeTag(1, sellerName, encoder),
      this.encodeTag(2, vatNumber, encoder),
      this.encodeTag(3, timestamp, encoder),
      this.encodeTag(4, totalAmount, encoder),
      this.encodeTag(5, vatAmount, encoder),
    ];

    // Calculate total length
    const totalLength = tags.reduce((acc, tag) => acc + tag.length, 0);
    const combined = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const tag of tags) {
      combined.set(tag, offset);
      offset += tag.length;
    }

    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Generates a Data URL for the QR code image
   */
  public static async generateQrCodeDataUrl(
    sellerName: string,
    vatNumber: string,
    timestamp: string,
    totalAmount: string,
    vatAmount: string,
    width: number = 256,
    margin: number = 3
  ): Promise<string> {
    const tlv = this.generateTlv(sellerName, vatNumber, timestamp, totalAmount, vatAmount);
    return await QRCode.toDataURL(tlv, {
      margin: Math.max(margin, 3),
      width: Math.max(width, 256),
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  }

  private static encodeTag(tag: number, value: string, encoder: any): Uint8Array {
    const valBytes = encoder.encode(value);
    const tagBytes = new Uint8Array(2 + valBytes.length);
    tagBytes[0] = tag;
    tagBytes[1] = valBytes.length;
    tagBytes.set(valBytes, 2);
    return tagBytes;
  }
}
