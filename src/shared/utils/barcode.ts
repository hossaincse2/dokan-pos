/**
 * Code128 linear barcode generator (subset B — printable ASCII 32–127).
 * Uses the browser Canvas API — no external library needed.
 * Works in Electron renderer process.
 */

// Code 128 subset B encoding table
// Each value is 11-bit bar pattern (MSB = leftmost bar, 1=black, 0=white)
const CODE128B_TABLE: number[] = [
  // ASCII 32 (space) → index 0, value 0 in checksum
  0b11011001100, 0b11001101100, 0b11001100110, 0b10010011000, 0b10010001100,
  0b10001001100, 0b10011001000, 0b10011000100, 0b10001100100, 0b11001001000,
  0b11001000100, 0b11000100100, 0b10110011100, 0b10011011100, 0b10011001110,
  0b10111001100, 0b10011101100, 0b10011100110, 0b11001110010, 0b11001011100,
  0b11001001110, 0b11011100100, 0b11001110100, 0b11101101110, 0b11101001100,
  0b11100101100, 0b11100100110, 0b11101100100, 0b11100110100, 0b11100110010,
  0b11011011000, 0b11011000110, 0b11000110110, 0b10100011000, 0b10001011000,
  0b10001000110, 0b10110001000, 0b10001101000, 0b10001100010, 0b11010001000,
  0b11000101000, 0b11000100010, 0b10110111000, 0b10110001110, 0b10001101110,
  0b10111011000, 0b10111000110, 0b10001110110, 0b11101110110, 0b11010001110,
  0b11000101110, 0b11011101000, 0b11011100010, 0b11011101110, 0b11101011000,
  0b11101000110, 0b11100010110, 0b11101101000, 0b11101100010, 0b11100011010,
  0b11101111010, 0b11001000010, 0b11110001010, 0b10100110000, 0b10100001100,
  0b10010110000, 0b10010000110, 0b10000101100, 0b10000100110, 0b10110010000,
  0b10110000100, 0b10011010000, 0b10011000010, 0b10000110100, 0b10000110010,
  0b11000010010, 0b11001010000, 0b11110111010, 0b11000010100, 0b10001111010,
  0b10100111100, 0b10010111100, 0b10010011110, 0b10111100100, 0b10011110100,
  0b10011110010, 0b11110100100, 0b11110010100, 0b11110010010, 0b11011011110,
  0b11011110110, 0b11110110110, 0b10101111000, 0b10100011110, 0b10001011110,
  // indices 96–102 are special codes (not used in this implementation)
];

// Start B = index 104, Stop = special pattern
const START_B_PATTERN   = 0b11010010000; // Code 128 START B
const STOP_PATTERN      = 0b11000111010; // Code 128 STOP

/**
 * Convert a string to Code128B bar patterns array.
 * Returns an array of 11-bit integers (one per symbol) including start/check/stop.
 */
function encodeCode128B(text: string): number[] {
  const patterns: number[] = [];

  // START B
  patterns.push(START_B_PATTERN);
  let checksum = 104; // value of START B

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 32 || code > 126) continue; // skip non-printable
    const idx = code - 32; // table index
    patterns.push(CODE128B_TABLE[idx]);
    checksum += (i + 1) * idx; // weighted sum
  }

  // Check symbol
  const checkIdx = checksum % 103;
  patterns.push(CODE128B_TABLE[checkIdx]);

  // STOP
  patterns.push(STOP_PATTERN);

  return patterns;
}

export interface BarcodeOptions {
  barWidth?: number;    // width of narrowest bar in px (default: 2)
  height?: number;      // height of bars in px (default: 60)
  fontSize?: number;    // font size for label (0 = no label)
  label?: string;       // override label text (default: the encoded text)
  foreColor?: string;   // bar color (default: '#000')
  backColor?: string;   // background color (default: '#fff')
}

/**
 * Generate a Code128B barcode as a PNG data URL using Canvas API.
 * @param text     The text to encode (printable ASCII)
 * @param options  Visual options
 */
export function generateBarcodeDataUrl(text: string, options: BarcodeOptions = {}): string {
  const {
    barWidth  = 2,
    height    = 60,
    fontSize  = 11,
    label     = text,
    foreColor = '#000000',
    backColor = '#ffffff',
  } = options;

  const patterns = encodeCode128B(text);

  // Each pattern is 11 bits; stop terminator adds 2 more bars
  const totalBars = patterns.length * 11 + 2;
  const quietZone = barWidth * 10;
  const canvasWidth  = totalBars * barWidth + quietZone * 2;
  const labelHeight  = fontSize > 0 ? fontSize + 6 : 0;
  const canvasHeight = height + labelHeight;

  const canvas  = (globalThis as any).document.createElement('canvas');
  canvas.width  = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = backColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.fillStyle = foreColor;
  let x = quietZone;

  // Draw bars for each pattern
  for (const pattern of patterns) {
    for (let bit = 10; bit >= 0; bit--) {
      const isBlack = (pattern >> bit) & 1;
      if (isBlack) ctx.fillRect(x, 0, barWidth, height);
      x += barWidth;
    }
  }

  // Stop terminator (2-bar: 11)
  ctx.fillRect(x, 0, barWidth, height);
  x += barWidth;
  ctx.fillRect(x, 0, barWidth, height);

  // Label below barcode
  if (fontSize > 0 && label) {
    ctx.fillStyle = foreColor;
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(label, canvasWidth / 2, height + fontSize + 2);
  }

  return canvas.toDataURL('image/png');
}
