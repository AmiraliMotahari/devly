export type BarcodeCategory =
  | "1D"
  | "GS1"
  | "Postal"
  | "2D"
  | "Healthcare"
  | "Special";

export type BarcodeSymbology = {
  /** bwip-js encoder id */
  bcid: string;
  /** Human label shown in the UI */
  label: string;
  /** Short hint about expected input */
  hint: string;
  /** Category grouping for the select */
  category: BarcodeCategory;
  /** True when the symbology needs `parsefnc` / FNC handling */
  gs1?: boolean;
};

export const BARCODE_CATEGORIES: { key: BarcodeCategory; label: string }[] = [
  { key: "1D", label: "1D Barcodes" },
  { key: "GS1", label: "GS1 & Retail" },
  { key: "2D", label: "2D Codes" },
  { key: "Postal", label: "Postal" },
  { key: "Healthcare", label: "Healthcare" },
  { key: "Special", label: "Specialty" },
];

export const SYMBOLOGIES: BarcodeSymbology[] = [
  // ── 1D ──────────────────────────────────────────────
  {
    bcid: "code128",
    label: "Code 128",
    category: "1D",
    hint: "Any ASCII text. The go-to logistics symbology.",
  },
  {
    bcid: "code39",
    label: "Code 39",
    category: "1D",
    hint: "Uppercase letters, digits, space and -.$/+%.",
  },
  {
    bcid: "code39ext",
    label: "Code 39 Extended",
    category: "1D",
    hint: "Full ASCII via shifts; denser input accepted.",
  },
  {
    bcid: "code93",
    label: "Code 93",
    category: "1D",
    hint: "Compact Code 39 successor, same charset.",
  },
  {
    bcid: "code93ext",
    label: "Code 93 Extended",
    category: "1D",
    hint: "Full ASCII via shifts.",
  },
  {
    bcid: "ean13",
    label: "EAN-13",
    category: "1D",
    hint: "12 or 13 digits; checksum auto-computed.",
  },
  {
    bcid: "ean8",
    label: "EAN-8",
    category: "1D",
    hint: "7 or 8 digits; checksum auto-computed.",
  },
  {
    bcid: "upca",
    label: "UPC-A",
    category: "1D",
    hint: "11 or 12 digits; checksum auto-computed.",
  },
  {
    bcid: "upce",
    label: "UPC-E",
    category: "1D",
    hint: "6–8 digits, zero-suppressed UPC.",
  },
  {
    bcid: "ean5",
    label: "EAN-5 Add-on",
    category: "1D",
    hint: "Exactly 5 digits (price add-on).",
  },
  {
    bcid: "ean2",
    label: "EAN-2 Add-on",
    category: "1D",
    hint: "Exactly 2 digits (magazine issue).",
  },
  {
    bcid: "interleaved2of5",
    label: "Interleaved 2 of 5 (ITF)",
    category: "1D",
    hint: "Even number of digits.",
  },
  {
    bcid: "itf14",
    label: "ITF-14",
    category: "1D",
    hint: "13–14 digits; carton-level shipping.",
  },
  {
    bcid: "code2of5",
    label: "Code 25",
    category: "1D",
    hint: "Digits only.",
  },
  {
    bcid: "industrial2of5",
    label: "Industrial 2 of 5",
    category: "1D",
    hint: "Digits only.",
  },
  {
    bcid: "iata2of5",
    label: "IATA 2 of 5",
    category: "1D",
    hint: "Digits only.",
  },
  {
    bcid: "matrix2of5",
    label: "Matrix 2 of 5",
    category: "1D",
    hint: "Digits only.",
  },
  {
    bcid: "coop2of5",
    label: "COOP 2 of 5",
    category: "1D",
    hint: "Digits only.",
  },
  {
    bcid: "datalogic2of5",
    label: "Datalogic 2 of 5",
    category: "1D",
    hint: "Digits only.",
  },
  {
    bcid: "code11",
    label: "Code 11",
    category: "1D",
    hint: "Digits and dash; telecom labeling.",
  },
  {
    bcid: "msi",
    label: "MSI",
    category: "1D",
    hint: "Digits only; inventory and shelf labels.",
  },
  {
    bcid: "plessey",
    label: "Plessey UK",
    category: "1D",
    hint: "Hex digits 0–9 A–F.",
  },
  {
    bcid: "rationalizedCodabar",
    label: "Codabar",
    category: "1D",
    hint: "Wrap in start/stop letters, e.g. A1234B.",
  },
  {
    bcid: "telepen",
    label: "Telepen",
    category: "1D",
    hint: "Full ASCII text.",
  },
  {
    bcid: "telepennumeric",
    label: "Telepen Numeric",
    category: "1D",
    hint: "Digits only, double density.",
  },
  {
    bcid: "bc412",
    label: "BC412",
    category: "1D",
    hint: "Semiconductor wafer tracking, e.g. BC412SEMI.",
  },
  {
    bcid: "codablockf",
    label: "Codablock F",
    category: "1D",
    hint: "Stacked Code 128 rows; long ASCII.",
  },
  {
    bcid: "code16k",
    label: "Code 16K",
    category: "1D",
    hint: "Stacked Code 128 variant.",
  },
  {
    bcid: "code49",
    label: "Code 49",
    category: "1D",
    hint: "Stacked Code 39 variant.",
  },
  {
    bcid: "channelcode",
    label: "Channel Code",
    category: "1D",
    hint: "Distributed Control Channel, digits.",
  },
  {
    bcid: "flattermarken",
    label: "Flattermarken",
    category: "1D",
    hint: "Print finishing control, digits.",
  },
  {
    bcid: "posicode",
    label: "PosiCode",
    category: "1D",
    hint: "Position-sensing code.",
  },
  {
    bcid: "ean14",
    label: "EAN-14",
    category: "GS1",
    hint: "(01) + 13 digits; GS1 logistics.",
    gs1: true,
  },
  {
    bcid: "sscc18",
    label: "SSCC-18",
    category: "GS1",
    hint: "(00) + 17 digits; shipping container.",
    gs1: true,
  },
  {
    bcid: "gs1-128",
    label: "GS1-128",
    category: "GS1",
    hint: "AI syntax like (01)09521234543213(3103)000123.",
    gs1: true,
  },
  {
    bcid: "databaromni",
    label: "DataBar Omnidirectional",
    category: "GS1",
    hint: "(01) + 13-digit GTIN, POS scanning.",
    gs1: true,
  },
  {
    bcid: "databarstacked",
    label: "DataBar Stacked",
    category: "GS1",
    hint: "(01) + 13-digit GTIN, small items.",
    gs1: true,
  },
  {
    bcid: "databarstackedomni",
    label: "DataBar Stacked Omni",
    category: "GS1",
    hint: "Stacked + omnidirectional scan.",
    gs1: true,
  },
  {
    bcid: "databartruncated",
    label: "DataBar Truncated",
    category: "GS1",
    hint: "(01) + 13-digit GTIN.",
    gs1: true,
  },
  {
    bcid: "databarlimited",
    label: "DataBar Limited",
    category: "GS1",
    hint: "(01) + GTIN starting 0 or 1.",
    gs1: true,
  },
  {
    bcid: "databarexpanded",
    label: "DataBar Expanded",
    category: "GS1",
    hint: "Multiple AIs like (01)…(3103)…",
    gs1: true,
  },
  {
    bcid: "databarexpandedstacked",
    label: "DataBar Expanded Stacked",
    category: "GS1",
    hint: "Stacked rows of Expanded elements.",
    gs1: true,
  },
  {
    bcid: "gs1northamericancoupon",
    label: "GS1 NA Coupon",
    category: "GS1",
    hint: "(8110) + coupon data.",
    gs1: true,
  },
  {
    bcid: "isbn",
    label: "ISBN",
    category: "GS1",
    hint: "978/979 with hyphens + optional add-on.",
  },
  {
    bcid: "ismn",
    label: "ISMN",
    category: "GS1",
    hint: "979-0… printed music.",
  },
  {
    bcid: "issn",
    label: "ISSN",
    category: "GS1",
    hint: "8 chars + optional add-on, e.g. 0311-175X 00 17.",
  },
  {
    bcid: "mands",
    label: "Marks & Spencer",
    category: "GS1",
    hint: "8 digits, internal M&S code.",
  },
  {
    bcid: "gs1datamatrix",
    label: "GS1 Data Matrix",
    category: "GS1",
    hint: "AI syntax in a Data Matrix.",
    gs1: true,
  },
  {
    bcid: "gs1datamatrixrectangular",
    label: "GS1 Data Matrix Rect.",
    category: "GS1",
    hint: "Rectangular GS1 Data Matrix.",
    gs1: true,
  },
  {
    bcid: "gs1dldatamatrix",
    label: "GS1 Digital Link DM",
    category: "GS1",
    hint: "https://id.gs1.org/… URL.",
  },
  {
    bcid: "gs1qrcode",
    label: "GS1 QR Code",
    category: "GS1",
    hint: "AI syntax in a QR code.",
    gs1: true,
  },
  {
    bcid: "gs1dlqrcode",
    label: "GS1 Digital Link QR",
    category: "GS1",
    hint: "https://id.gs1.org/… URL.",
  },
  {
    bcid: "gs1dotcode",
    label: "GS1 DotCode",
    category: "GS1",
    hint: "AI syntax in DotCode.",
    gs1: true,
  },
  {
    bcid: "gs1-cc",
    label: "GS1 Composite Comp.",
    category: "GS1",
    hint: "2D composite component alone.",
    gs1: true,
  },
  {
    bcid: "ean13composite",
    label: "EAN-13 Composite",
    category: "GS1",
    hint: "GTIN|(99)… composite pair.",
    gs1: true,
  },
  {
    bcid: "ean8composite",
    label: "EAN-8 Composite",
    category: "GS1",
    hint: "GTIN|(21)… composite pair.",
    gs1: true,
  },
  {
    bcid: "upcacomposite",
    label: "UPC-A Composite",
    category: "GS1",
    hint: "GTIN|(99)… composite pair.",
    gs1: true,
  },
  {
    bcid: "upcecomposite",
    label: "UPC-E Composite",
    category: "GS1",
    hint: "GTIN|(15)… composite pair.",
    gs1: true,
  },
  {
    bcid: "databaromnicomposite",
    label: "DataBar Omni Composite",
    category: "GS1",
    hint: "(01)…|(11)… pair.",
    gs1: true,
  },
  {
    bcid: "databarstackedcomposite",
    label: "DataBar Stacked Comp.",
    category: "GS1",
    hint: "(01)…|(17)… pair.",
    gs1: true,
  },
  {
    bcid: "databarstackedomnicomposite",
    label: "DataBar Stk Omni Comp.",
    category: "GS1",
    hint: "(01)…|(11)… pair.",
    gs1: true,
  },
  {
    bcid: "databartruncatedcomposite",
    label: "DataBar Trunc Composite",
    category: "GS1",
    hint: "(01)…|(11)… pair.",
    gs1: true,
  },
  {
    bcid: "databarlimitedcomposite",
    label: "DataBar Ltd Composite",
    category: "GS1",
    hint: "(01)…|(21)… pair.",
    gs1: true,
  },
  {
    bcid: "databarexpandedcomposite",
    label: "DataBar Exp Composite",
    category: "GS1",
    hint: "(01)…|(91)… pair.",
    gs1: true,
  },
  {
    bcid: "databarexpandedstackedcomposite",
    label: "DataBar ExpStk Comp.",
    category: "GS1",
    hint: "(01)…|(21)… pair.",
    gs1: true,
  },
  {
    bcid: "gs1-128composite",
    label: "GS1-128 Composite",
    category: "GS1",
    hint: "(00)…|(02)… pair.",
    gs1: true,
  },
  {
    bcid: "d3aqr",
    label: "D3 AQR (beta)",
    category: "GS1",
    hint: "HTTPS://ID.GS1.ORG/… link.",
  },
  // ── 2D ───────────────────────────────────────────────
  {
    bcid: "qrcode",
    label: "QR Code",
    category: "2D",
    hint: "Any text or URL.",
  },
  {
    bcid: "microqrcode",
    label: "Micro QR Code",
    category: "2D",
    hint: "Short payloads, tiny print.",
  },
  {
    bcid: "rectangularmicroqrcode",
    label: "rMQR",
    category: "2D",
    hint: "Rectangular Micro QR.",
  },
  {
    bcid: "swissqrcode",
    label: "Swiss QR Code",
    category: "2D",
    hint: "Swiss payments; strict SPC format.",
  },
  {
    bcid: "datamatrix",
    label: "Data Matrix",
    category: "2D",
    hint: "Any text; small part marking.",
  },
  {
    bcid: "datamatrixrectangular",
    label: "Data Matrix Rect.",
    category: "2D",
    hint: "Rectangular shapes.",
  },
  {
    bcid: "datamatrixrectangularextension",
    label: "Data Matrix Rect. Ext",
    category: "2D",
    hint: "DMRE, extra rectangle sizes.",
  },
  {
    bcid: "pdf417",
    label: "PDF417",
    category: "2D",
    hint: "Long text, transport & IDs.",
  },
  {
    bcid: "pdf417compact",
    label: "Compact PDF417",
    category: "2D",
    hint: "Truncated PDF417.",
  },
  {
    bcid: "micropdf417",
    label: "MicroPDF417",
    category: "2D",
    hint: "Small-footprint PDF417.",
  },
  {
    bcid: "azteccode",
    label: "Aztec Code",
    category: "2D",
    hint: "Any text; no quiet zone needed.",
  },
  {
    bcid: "azteccodecompact",
    label: "Compact Aztec",
    category: "2D",
    hint: "Small Aztec variant.",
  },
  {
    bcid: "aztecrune",
    label: "Aztec Runes",
    category: "2D",
    hint: "Numbers 0–255.",
  },
  {
    bcid: "maxicode",
    label: "MaxiCode",
    category: "2D",
    hint: "UPS shipping; ^029-separated modes.",
  },
  {
    bcid: "codeone",
    label: "Code One",
    category: "2D",
    hint: "Any text; stacked variants.",
  },
  {
    bcid: "hanxin",
    label: "Han Xin Code",
    category: "2D",
    hint: "Chinese charset support.",
  },
  {
    bcid: "dotcode",
    label: "DotCode",
    category: "2D",
    hint: "Round dots, high-speed printing.",
  },
  {
    bcid: "ultracode",
    label: "Ultracode",
    category: "2D",
    hint: "Color-capable code.",
  },
  // ── Postal ───────────────────────────────────────────
  {
    bcid: "postnet",
    label: "POSTNET",
    category: "Postal",
    hint: "5–11 digit ZIP.",
  },
  {
    bcid: "planet",
    label: "PLANET",
    category: "Postal",
    hint: "Tracking digits.",
  },
  {
    bcid: "onecode",
    label: "USPS Intelligent Mail",
    category: "Postal",
    hint: "31-digit IMB barcode string.",
  },
  {
    bcid: "royalmail",
    label: "Royal Mail 4-State",
    category: "Postal",
    hint: "e.g. LE28HS9Z.",
  },
  {
    bcid: "auspost",
    label: "AusPost 4-State",
    category: "Postal",
    hint: "e.g. 5956439111ABA 9.",
  },
  {
    bcid: "kix",
    label: "KIX (Dutch Post)",
    category: "Postal",
    hint: "e.g. 1231FZ13XHS.",
  },
  {
    bcid: "japanpost",
    label: "Japan Post",
    category: "Postal",
    hint: "e.g. 6540123789-A-K-Z.",
  },
  {
    bcid: "mailmark",
    label: "Royal Mail Mailmark",
    category: "Postal",
    hint: "JGB 012100… complex format.",
  },
  {
    bcid: "identcode",
    label: "Identcode",
    category: "Postal",
    hint: "12 digits, Deutsche Post.",
  },
  {
    bcid: "leitcode",
    category: "Postal",
    label: "Leitcode",
    hint: "14 digits, Deutsche Post.",
  },
  // ── Healthcare ───────────────────────────────────────
  {
    bcid: "code32",
    label: "Italian Pharmacode",
    category: "Healthcare",
    hint: "Digits mapping to base-32.",
  },
  {
    bcid: "pzn",
    label: "PZN",
    category: "Healthcare",
    hint: "6–7 digits, German pharma.",
  },
  {
    bcid: "pharmacode",
    label: "Pharmacode",
    category: "Healthcare",
    hint: "3–131070 as number.",
  },
  {
    bcid: "pharmacode2",
    label: "Two-track Pharmacode",
    category: "Healthcare",
    hint: "3–64570 as number.",
  },
  {
    bcid: "hibccode39",
    label: "HIBC Code 39",
    category: "Healthcare",
    hint: "e.g. A999BJC5D6E71.",
  },
  {
    bcid: "hibccode128",
    label: "HIBC Code 128",
    category: "Healthcare",
    hint: "e.g. A999BJC5D6E71.",
  },
  {
    bcid: "hibcdatamatrix",
    label: "HIBC Data Matrix",
    category: "Healthcare",
    hint: "e.g. A999BJC5D6E71.",
  },
  {
    bcid: "hibcdatamatrixrectangular",
    label: "HIBC DM Rect.",
    category: "Healthcare",
    hint: "Rectangular HIBC.",
  },
  {
    bcid: "hibcpdf417",
    label: "HIBC PDF417",
    category: "Healthcare",
    hint: "e.g. A999BJC5D6E71.",
  },
  {
    bcid: "hibcmicropdf417",
    label: "HIBC MicroPDF417",
    category: "Healthcare",
    hint: "Small HIBC.",
  },
  {
    bcid: "hibcqrcode",
    label: "HIBC QR Code",
    category: "Healthcare",
    hint: "e.g. A999BJC5D6E71.",
  },
  {
    bcid: "hibccodablockf",
    label: "HIBC Codablock F",
    category: "Healthcare",
    hint: "Stacked HIBC.",
  },
  {
    bcid: "hibcazteccode",
    label: "HIBC Aztec Code",
    category: "Healthcare",
    hint: "e.g. A999BJC5D6E71.",
  },
  // ── Specialty ────────────────────────────────────────
  {
    bcid: "raw",
    label: "Raw Custom 1D",
    category: "Special",
    hint: "Bar/space widths as digits.",
  },
  {
    bcid: "daft",
    label: "DAFT 4-State",
    category: "Special",
    hint: "D A F T letters.",
  },
  {
    bcid: "symbol",
    label: "Misc. Symbols",
    category: "Special",
    hint: "Special glyphs like fima.",
  },
];

export const DEFAULT_BCID = "code128";

export type TextXAlign =
  | "offleft"
  | "left"
  | "center"
  | "right"
  | "offright"
  | "justify";
export type TextYAlign = "below" | "center" | "above";

export type BarcodeStyling = {
  // ── Geometry ────────────────────────────────
  /** module width multiplier (bwip-js scaleX/scaleY) */
  scale: number;
  /** bar height in mm (bwip-js height) */
  height: number;
  /** rotate N/R/L/I */
  rotate: "N" | "R" | "L" | "I";

  // ── Quiet zone / padding ────────────────────
  /** uniform padding all around (bwip-js padding) */
  padding: number;
  /** use per-side padding instead of uniform */
  paddingPerSide: boolean;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;

  // ── Human-readable text ─────────────────────
  /** include human-readable text */
  showText: boolean;
  /** override the printed text (alttext) */
  altText: string;
  /** font size in points (textsize) */
  textSize: number;
  textXAlign: TextXAlign;
  textYAlign: TextYAlign;
  textXOffset: number;
  textYOffset: number;
  /** text color, hex */
  textColor: string;

  // ── Colors ─────────────────────────────────
  /** bar color, hex */
  fg: string;
  /** background color, hex */
  bg: string;
  /** transparent background */
  transparent: boolean;

  // ── Border ─────────────────────────────────
  /** draw a border */
  showBorder: boolean;
  /** border thickness in mm (borderwidth) */
  borderWidth: number;
  /** border color, hex */
  borderColor: string;
  /** extra thickness on each side (borderleft/right/top/bottom) */
  borderLeft: number;
  borderRight: number;
  borderTop: number;
  borderBottom: number;

  // ── Advanced ───────────────────────────────
  /** bar ink spread in module units (inkspread) */
  inkSpread: number;
  /** render matrix codes as dots instead of squares (dotty) */
  dotty: boolean;
  /** add check digits to the printed text (includecheck) */
  includeCheck: boolean;
  /** add guard bars for EAN/UPC (guardwhitespace) */
  guardWhitespace: boolean;
  /** parse GS1 AI parentheses + FNC1 */
  parseAi: boolean;
};

export const initialStyling: BarcodeStyling = {
  scale: 3,
  height: 50,
  rotate: "N",

  padding: 10,
  paddingPerSide: false,
  paddingLeft: 10,
  paddingRight: 10,
  paddingTop: 10,
  paddingBottom: 10,

  showText: true,
  altText: "",
  textSize: 10,
  textXAlign: "center",
  textYAlign: "below",
  textXOffset: 0,
  textYOffset: 0,
  textColor: "#111827",

  fg: "#111827",
  bg: "#ffffff",
  transparent: false,

  showBorder: false,
  borderWidth: 1,
  borderColor: "#111827",
  borderLeft: 0,
  borderRight: 0,
  borderTop: 0,
  borderBottom: 0,

  inkSpread: 0,
  dotty: false,
  includeCheck: false,
  guardWhitespace: false,
  parseAi: true,
};

/** Symbologies where guard bars are applicable (EAN/UPC/ISBN family). */
export const GUARD_BCIDS = new Set([
  "ean13",
  "ean8",
  "upca",
  "upce",
  "isbn",
  "ismn",
  "issn",
  "mands",
  "ean13composite",
  "ean8composite",
  "upcacomposite",
  "upcecomposite",
]);

/** Symbologies where the dotty option makes sense (matrix/dot codes). */
export const DOTTY_BCIDS = new Set([
  "qrcode",
  "microqrcode",
  "rectangularmicroqrcode",
  "swissqrcode",
  "datamatrix",
  "datamatrixrectangular",
  "datamatrixrectangularextension",
  "gs1datamatrix",
  "gs1datamatrixrectangular",
  "gs1dldatamatrix",
  "hibcdatamatrix",
  "hibcdatamatrixrectangular",
  "maxicode",
  "azteccode",
  "azteccodecompact",
  "aztecrune",
  "hibcazteccode",
  "dotcode",
  "gs1dotcode",
  "codeone",
  "hanxin",
  "ultracode",
]);

/** Symbologies that print a human-readable interpretation line. */
export const TEXT_CAPABLE_BCIDS = new Set([
  // 1D families — text below bars is standard
  "code128",
  "gs1-128",
  "gs1-128composite",
  "ean13",
  "ean8",
  "upca",
  "upce",
  "ean5",
  "ean2",
  "ean13composite",
  "ean8composite",
  "upcacomposite",
  "upcecomposite",
  "isbn",
  "ismn",
  "issn",
  "mands",
  "code39",
  "code39ext",
  "code93",
  "code93ext",
  "interleaved2of5",
  "itf14",
  "code2of5",
  "industrial2of5",
  "iata2of5",
  "matrix2of5",
  "coop2of5",
  "datalogic2of5",
  "code11",
  "msi",
  "plessey",
  "rationalizedCodabar",
  "telepen",
  "telepennumeric",
  "bc412",
  "codablockf",
  "code16k",
  "code49",
  "channelcode",
  "flattermarken",
  "posicode",
  "ean14",
  "sscc18",
  "identcode",
  "leitcode",
  "code32",
  "pzn",
  "pharmacode",
  "pharmacode2",
  "databaromni",
  "databarstacked",
  "databarstackedomni",
  "databartruncated",
  "databarlimited",
  "databarexpanded",
  "databarexpandedstacked",
  "gs1northamericancoupon",
  "hibccode39",
  "hibccode128",
]);

/** Interactive defaults per symbology: text (prefill when switching type) */
export const DEFAULT_TEXTS: Record<string, string> = {
  ean5: "90200",
  ean2: "05",
  ean13: "9520123456788",
  ean8: "95200002",
  upca: "012345000058",
  upce: "01234558",
  isbn: "978-1-56581-231-4 90000",
  ismn: "979-0-2605-3211-3",
  issn: "0311-175X 00 17",
  mands: "0642118",
  code128: "Count01234567!",
  "gs1-128": "(01)09521234543213(3103)000123",
  ean14: "(01) 0 952 8765 43210 8",
  sscc18: "(00) 0 9528765 432101234 6",
  code39: "THIS IS CODE 39",
  code39ext: "Code39 Ext!",
  code32: "01234567",
  pzn: "123456",
  code93: "THIS IS CODE 93",
  code93ext: "Code93 Ext!",
  interleaved2of5: "2401234567",
  itf14: "0 952 1234 54321 3",
  identcode: "563102430313",
  leitcode: "21348075016401",
  databaromni: "(01)09521234543213",
  databarstacked: "(01)09521234543213",
  databarstackedomni: "(01)24012345678905",
  databartruncated: "(01)09521234543213",
  databarlimited: "(01)09521234543213",
  databarexpanded: "(01)09521234543213(3103)000123",
  databarexpandedstacked: "(01)09521234543213(3103)000123",
  gs1northamericancoupon: "(8110)106141416543213500110000310123196000",
  pharmacode: "117480",
  pharmacode2: "117480",
  code2of5: "01234567",
  industrial2of5: "01234567",
  iata2of5: "01234567",
  matrix2of5: "01234567",
  coop2of5: "01234567",
  datalogic2of5: "01234567",
  code11: "0123456789",
  bc412: "BC412SEMI",
  rationalizedCodabar: "A0123456789B",
  onecode: "0123456709498765432101234567891",
  postnet: "01234",
  planet: "01234567890",
  royalmail: "LE28HS9Z",
  auspost: "5956439111ABA 9",
  kix: "1231FZ13XHS",
  japanpost: "6540123789-A-K-Z",
  msi: "0123456789",
  plessey: "01234ABCD",
  telepen: "ABCDEF",
  telepennumeric: "01234567",
  posicode: "ABC123",
  codablockf: "CODABLOCK F 34567890123456789010040digit",
  code16k: "Abcd-1234567890-wxyZ",
  code49: "MULTIPLE ROWS IN CODE 49",
  channelcode: "3493",
  flattermarken: "11099",
  raw: "331132131313411122131311333213114131131221323",
  daft: "FATDAFTDAD",
  symbol: "fima",
  pdf417: "This is PDF417",
  pdf417compact: "This is compact PDF417",
  micropdf417: "MicroPDF417",
  datamatrix: "This is Data Matrix!",
  datamatrixrectangular: "1234",
  datamatrixrectangularextension: "1234",
  mailmark: "JGB 012100123412345678AB19XY1A 0",
  qrcode: "https://example.com",
  swissqrcode: "SPC^CR^LF0200^CR^LF1^CR^LFCH5800791123000889012",
  microqrcode: "1234",
  rectangularmicroqrcode: "1234",
  maxicode: "[)>^03001^02996152382802^029840^029001",
  azteccode: "This is Aztec Code",
  azteccodecompact: "1234",
  aztecrune: "1",
  codeone: "Code One",
  hanxin: "This is Han Xin",
  dotcode: "This is DotCode",
  ultracode: "Awesome colours!",
  "gs1-cc": "(01)09521234543213(3103)000123",
  ean13composite: "9520123456788|(99)1234-abcd",
  ean8composite: "95200002|(21)A12345678",
  upcacomposite: "012345000058|(99)1234-abcd",
  upcecomposite: "01234558|(15)021231",
  databaromnicomposite: "(01)09521234543213|(11)990102",
  databarstackedcomposite: "(01)09521234543213|(17)010200",
  databarstackedomnicomposite: "(01)03612345678904|(11)990102",
  databartruncatedcomposite: "(01)09521234543213|(11)990102",
  databarlimitedcomposite: "(01)09521234543213|(21)abcdefghijklmnopqrst",
  databarexpandedcomposite: "(01)09521234543213(3103)001234|(91)1A2B3C4D5E",
  databarexpandedstackedcomposite: "(01)09521234543213(10)ABCDEF|(21)12345678",
  "gs1-128composite": "(00)095287654321012346|(02)09521234543213(37)24(10)1234567ABCDEFG",
  d3aqr: "HTTPS://ID.GS1.ORG/01/09521234543213/22/ABC%2D123?99=XYZ-987",
  gs1datamatrix: "(01)09521234543213(17)120508(10)ABCD1234(410)9501101020917",
  gs1datamatrixrectangular: "(01)09521234543213(17)120508(10)ABCD1234(410)9501101020917",
  gs1dldatamatrix: "https://id.gs1.org/01/09521234543213/22/ABC%2D123?99=XYZ-987",
  gs1qrcode: "(01)09521234543213(8200)http://www.abc.net(10)ABCD1234(410)9501101020917",
  gs1dlqrcode: "HTTPS://ID.GS1.ORG/01/09521234543213/22/ABC%2D123?99=XYZ-987",
  gs1dotcode: "(235)5vBZIF%!<B;?oa%(01)09521234543213(8008)19052001",
  hibccode39: "A999BJC5D6E71",
  hibccode128: "A999BJC5D6E71",
  hibcdatamatrix: "A999BJC5D6E71",
  hibcdatamatrixrectangular: "A999BJC5D6E71",
  hibcpdf417: "A999BJC5D6E71",
  hibcmicropdf417: "A999BJC5D6E71",
  hibcqrcode: "A999BJC5D6E71",
  hibccodablockf: "A999BJC5D6E71",
  hibcazteccode: "A999BJC5D6E71",
};

export const symbologyByBcid = new Map(SYMBOLOGIES.map((s) => [s.bcid, s]));

export function defaultTextFor(bcid: string): string {
  return DEFAULT_TEXTS[bcid] ?? "";
}

export const MAX_TEXT_LENGTH = 1000;

export const SUGGESTED_EXPORT_NAMES: Record<string, string> = {
  svg: "svg",
  png: "png",
  jpeg: "jpg",
  webp: "webp",
};

export type ExportFormat = keyof typeof SUGGESTED_EXPORT_NAMES;

export const exportTypes: ExportFormat[] = ["png", "jpeg", "svg", "webp"];
