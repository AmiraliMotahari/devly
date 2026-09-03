import type BwipJs from "bwip-js/browser";
import {
  MAX_TEXT_LENGTH,
  symbologyByBcid,
  type BarcodeStyling,
} from "./lib";

export type BarcodeWarning = {
  title: string;
  description: string;
};

export type BarcodeRenderOptions = BwipJs.RenderOptions;

/**
 * Pre-render validation & heuristics. bwip-js itself is the authority —
 * these are friendly, symbology-aware hints surfaced before render fails.
 */
export function validateInput(bcid: string, text: string): BarcodeWarning[] {
  const warnings: BarcodeWarning[] = [];
  const sym = symbologyByBcid.get(bcid);

  if (!text.trim()) {
    warnings.push({
      title: "Empty input",
      description: "Enter data to encode before exporting.",
    });
    return warnings;
  }

  if (text.length > MAX_TEXT_LENGTH) {
    warnings.push({
      title: "Input is long",
      description: `Over ${MAX_TEXT_LENGTH} characters — dense codes may fail to render or scan.`,
    });
  }

  if (!sym) {
    warnings.push({
      title: "Unknown symbology",
      description: "Pick a barcode type from the list.",
    });
    return warnings;
  }

  const digits = /^\d+$/;

  switch (bcid) {
    case "ean13":
      if (!/^\d{12,13}$/.test(text.trim()))
        warnings.push({
          title: "EAN-13 needs 12 or 13 digits",
          description: "Checksum is computed automatically when omitted.",
        });
      break;
    case "ean8":
      if (!/^\d{7,8}$/.test(text.trim()))
        warnings.push({
          title: "EAN-8 needs 7 or 8 digits",
          description: "Checksum is computed automatically when omitted.",
        });
      break;
    case "upca":
      if (!/^\d{11,12}$/.test(text.trim()))
        warnings.push({
          title: "UPC-A needs 11 or 12 digits",
          description: "Checksum is computed automatically when omitted.",
        });
      break;
    case "upce":
      if (!/^\d{6,8}$/.test(text.trim()))
        warnings.push({
          title: "UPC-E needs 6–8 digits",
          description: "Zero-suppressed UPC form.",
        });
      break;
    case "ean5":
      if (!/^\d{5}$/.test(text.trim()))
        warnings.push({
          title: "EAN-5 needs exactly 5 digits",
          description: "Used as a price add-on.",
        });
      break;
    case "ean2":
      if (!/^\d{2}$/.test(text.trim()))
        warnings.push({
          title: "EAN-2 needs exactly 2 digits",
          description: "Used for issue numbers.",
        });
      break;
    case "interleaved2of5":
      if (!digits.test(text.trim()) || text.trim().length % 2 !== 0)
        warnings.push({
          title: "ITF needs an even number of digits",
          description: "Digits are interleaved in pairs.",
        });
      break;
    case "itf14":
      if (!/^\d{13,14}$/.test(text.replace(/\s/g, "")))
        warnings.push({
          title: "ITF-14 needs 13–14 digits",
          description: "Spaces are allowed and ignored.",
        });
      break;
    case "code39":
      if (!/^[0-9A-Z \-.$/+%]*$/.test(text))
        warnings.push({
          title: "Code 39 charset",
          description:
            "Use uppercase A–Z, digits, space and -.$/+%. Switch to Extended for lowercase.",
        });
      break;
    case "rationalizedCodabar":
      if (!/^[A-D][0-9\-.:/]+[A-D]$/.test(text.trim()))
        warnings.push({
          title: "Codabar needs start/stop letters",
          description: "Wrap digits with A–D on both ends, e.g. A1234B.",
        });
      break;
    case "plessey":
      if (!/^[0-9A-F]+$/.test(text.trim()))
        warnings.push({
          title: "Plessey accepts hex digits only",
          description: "Characters 0–9 and A–F.",
        });
      break;
    case "pharmacode":
      if (!/^\d{3,6}$/.test(text.trim()) || +text < 3 || +text > 131070)
        warnings.push({
          title: "Pharmacode range is 3–131070",
          description: "Encode the number as digits.",
        });
      break;
    case "pharmacode2":
      if (!/^\d{3,5}$/.test(text.trim()) || +text < 3 || +text > 64570)
        warnings.push({
          title: "Two-track Pharmacode range is 3–64570",
          description: "Encode the number as digits.",
        });
      break;
    case "aztecrune":
      if (!/^\d{1,3}$/.test(text.trim()) || +text < 0 || +text > 255)
        warnings.push({
          title: "Aztec Runes accept 0–255",
          description: "A single small number.",
        });
      break;
    case "daft":
      if (!/^[DAFT]+$/.test(text.trim()))
        warnings.push({
          title: "DAFT letters only",
          description: "Combinations of D, A, F and T.",
        });
      break;
    case "msi":
    case "code2of5":
    case "industrial2of5":
    case "iata2of5":
    case "matrix2of5":
    case "coop2of5":
    case "datalogic2of5":
    case "telepennumeric":
    case "code11":
    case "channelcode":
    case "flattermarken":
    case "identcode":
    case "leitcode":
    case "code32":
    case "pzn":
      if (!digits.test(text.replace(/\s/g, "")))
        warnings.push({
          title: `${sym.label} accepts digits only`,
          description: "Remove letters and symbols.",
        });
      break;
    default:
      break;
  }

  if (sym.gs1 && !text.includes("(") && bcid !== "d3aqr") {
    warnings.push({
      title: "GS1 Application Identifiers",
      description: `Wrap AIs in parentheses, e.g. ${
        bcid === "sscc18"
          ? "(00)095287654321012346"
          : "(01)09521234543213"
      }.`,
    });
  }

  return warnings;
}

/** Extract a friendly message from a bwip-js error. */
export function describeRenderError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  // bwip-js errors look like "bwipp.ean13badLength#6878: EAN-13 must be 12 or 13 digits"
  const cleaned = message.replace(/bwipp\.(\w+?)#\d+:\s*/, "").trim();
  return cleaned || "The barcode could not be rendered with this input.";
}

/** Clean hex color for bwip-js (it accepts #rgb or raw hex without #). */
export function toBwipColor(hex: string): string {
  return hex.replace("#", "").toLowerCase();
}

/**
 * Assemble the full bwip-js render options from UI styling state.
 * Keys with `undefined` values are dropped so bwip-js never sees
 * `borderwidth: undefined`-style realtype errors.
 */
export function buildRenderOptions(
  bcid: string,
  text: string,
  styling: BarcodeStyling,
): BarcodeRenderOptions {
  const opts: BarcodeRenderOptions = {
    bcid,
    text,
    scaleX: styling.scale,
    scaleY: styling.scale,
    height: styling.height,
    rotate: styling.rotate,
    barcolor: toBwipColor(styling.fg),
    backgroundcolor: styling.transparent
      ? undefined
      : toBwipColor(styling.bg),
  };

  // Quiet zone / padding
  if (styling.paddingPerSide) {
    if (styling.paddingLeft) opts.paddingleft = styling.paddingLeft;
    if (styling.paddingRight) opts.paddingright = styling.paddingRight;
    if (styling.paddingTop) opts.paddingtop = styling.paddingTop;
    if (styling.paddingBottom) opts.paddingbottom = styling.paddingBottom;
  } else if (styling.padding) {
    opts.padding = styling.padding;
  }

  // Human-readable text
  if (styling.showText) {
    opts.includetext = true;
    if (styling.altText.trim()) opts.alttext = styling.altText;
    if (styling.textSize) opts.textsize = styling.textSize;
    opts.textxalign = styling.textXAlign;
    opts.textyalign = styling.textYAlign;
    if (styling.textXOffset) opts.textxoffset = styling.textXOffset;
    if (styling.textYOffset) opts.textyoffset = styling.textYOffset;
    opts.textcolor = toBwipColor(styling.textColor);
  }

  // Border
  if (styling.showBorder) {
    opts.showborder = true;
    if (styling.borderWidth) opts.borderwidth = styling.borderWidth;
    opts.bordercolor = toBwipColor(styling.borderColor);
    if (styling.borderLeft) opts.borderleft = styling.borderLeft;
    if (styling.borderRight) opts.borderright = styling.borderRight;
    if (styling.borderTop) opts.bordertop = styling.borderTop;
    if (styling.borderBottom) opts.borderbottom = styling.borderBottom;
  }

  // Advanced
  if (styling.inkSpread) opts.inkspread = styling.inkSpread;
  if (styling.dotty) opts.dotty = true;
  if (styling.includeCheck) opts.includecheck = true;
  if (styling.guardWhitespace) opts.guardwhitespace = true;
  if (styling.parseAi) opts.parsefnc = true;

  // Drop undefined values (bwip-js rejects `undefined` for realtype options)
  for (const key of Object.keys(opts) as (keyof BarcodeRenderOptions)[]) {
    if (opts[key] === undefined) delete opts[key];
  }

  return opts;
}

/** viewBox dims extracted from an SVG string. */
export function svgViewBox(svg: string): { width: number; height: number } {
  const match = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  if (!match) return { width: 300, height: 150 };
  return { width: Number(match[1]), height: Number(match[2]) };
}

/**
 * bwip-js emits `<svg viewBox="…">` with no width/height attributes.
 * Inject explicit intrinsic dimensions (viewBox * scaleFactor) so the
 * preview scales predictably and raster exports have real pixel sizes.
 */
export function withIntrinsicSize(svg: string, multiplier = 1): string {
  const { width, height } = svgViewBox(svg);
  const w = Math.round(width * multiplier);
  const h = Math.round(height * multiplier);
  return svg.replace(
    /<svg /,
    `<svg width="${w}" height="${h}" `,
  );
}

/** Download helper: builds a Blob and triggers a save. */
export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
