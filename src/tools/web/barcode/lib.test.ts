import { describe, expect, it } from "vitest";
import {
  defaultTextFor,
  DOTTY_BCIDS,
  exportTypes,
  GUARD_BCIDS,
  initialStyling,
  symbologyByBcid,
  SYMBOLOGIES,
  TEXT_CAPABLE_BCIDS,
} from "./lib";
import {
  buildRenderOptions,
  describeRenderError,
  svgViewBox,
  toBwipColor,
  validateInput,
  withIntrinsicSize,
} from "./utils";

describe("barcode lib", () => {
  it("has no duplicate bcids", () => {
    const ids = SYMBOLOGIES.map((s) => s.bcid);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers every bwip-js symbology used in hints", () => {
    // Every symbology must be retrievable and carry a category
    for (const s of SYMBOLOGIES) {
      expect(symbologyByBcid.get(s.bcid)).toBe(s);
      expect(s.category).toBeTruthy();
      expect(s.hint.length).toBeGreaterThan(0);
    }
  });

  it("provides a default text for every symbology", () => {
    for (const s of SYMBOLOGIES) {
      expect(defaultTextFor(s.bcid).length).toBeGreaterThan(0);
    }
  });

  it("exposes export formats", () => {
    expect(exportTypes).toContain("png");
    expect(exportTypes).toContain("svg");
  });
});

describe("validateInput", () => {
  it("warns on empty input", () => {
    const warnings = validateInput("code128", "");
    expect(warnings.some((w) => w.title === "Empty input")).toBe(true);
  });

  it("warns on bad EAN-13 length", () => {
    const warnings = validateInput("ean13", "123");
    expect(
      warnings.some((w) => w.title === "EAN-13 needs 12 or 13 digits"),
    ).toBe(true);
  });

  it("accepts valid EAN-13", () => {
    expect(validateInput("ean13", "9520123456788")).toHaveLength(0);
  });

  it("warns on odd ITF digits", () => {
    const warnings = validateInput("interleaved2of5", "123");
    expect(
      warnings.some((w) => w.title === "ITF needs an even number of digits"),
    ).toBe(true);
  });

  it("warns on Code 39 lowercase", () => {
    const warnings = validateInput("code39", "abc");
    expect(warnings.some((w) => w.title === "Code 39 charset")).toBe(true);
  });

  it("warns on Codabar without start/stop letters", () => {
    const warnings = validateInput("rationalizedCodabar", "1234");
    expect(
      warnings.some((w) => w.title === "Codabar needs start/stop letters"),
    ).toBe(true);
  });

  it("warns on GS1 without application identifiers", () => {
    const warnings = validateInput("gs1-128", "09521234543213");
    expect(
      warnings.some((w) => w.title === "GS1 Application Identifiers"),
    ).toBe(true);
  });

  it("accepts GS1 with parentheses", () => {
    expect(validateInput("gs1-128", "(01)09521234543213")).toHaveLength(0);
  });

  it("warns on pharmacode out of range", () => {
    expect(
      validateInput("pharmacode", "999999").some(
        (w) => w.title === "Pharmacode range is 3–131070",
      ),
    ).toBe(true);
    expect(validateInput("pharmacode", "117480")).toHaveLength(0);
  });

  it("warns on long input", () => {
    const warnings = validateInput("code128", "x".repeat(1001));
    expect(warnings.some((w) => w.title === "Input is long")).toBe(true);
  });
});

describe("describeRenderError", () => {
  it("strips bwip-js prefixes", () => {
    const err = new Error(
      "bwipp.ean13badLength#6878: EAN-13 must be 12 or 13 digits",
    );
    expect(describeRenderError(err)).toBe("EAN-13 must be 12 or 13 digits");
  });

  it("handles non-Error values", () => {
    expect(describeRenderError("boom")).toBe("boom");
  });

  it("falls back for empty messages", () => {
    expect(describeRenderError("")).toContain("could not be rendered");
  });
});

describe("toBwipColor", () => {
  it("lowercases and strips hash", () => {
    expect(toBwipColor("#FFCC00")).toBe("ffcc00");
    expect(toBwipColor("ffffff")).toBe("ffffff");
  });
});

describe("buildRenderOptions", () => {
  it("assembles base geometry", () => {
    const opts = buildRenderOptions("code128", "ABC", initialStyling);
    expect(opts.bcid).toBe("code128");
    expect(opts.scaleX).toBe(initialStyling.scale);
    expect(opts.height).toBe(initialStyling.height);
    expect(opts.padding).toBe(initialStyling.padding);
    expect(opts.includetext).toBe(true);
  });

  it("never emits undefined option values", () => {
    const opts = buildRenderOptions("code128", "ABC", {
      ...initialStyling,
      showText: false,
      transparent: true,
      showBorder: false,
    });
    for (const value of Object.values(opts)) {
      expect(value).not.toBeUndefined();
    }
    expect("borderwidth" in opts).toBe(false);
    expect("backgroundcolor" in opts).toBe(false);
  });

  it("uses uniform padding unless per-side is enabled", () => {
    const uniform = buildRenderOptions("code128", "ABC", initialStyling);
    expect(uniform.padding).toBe(initialStyling.padding);
    expect("paddingleft" in uniform).toBe(false);

    const perSide = buildRenderOptions("code128", "ABC", {
      ...initialStyling,
      paddingPerSide: true,
      paddingLeft: 5,
      paddingRight: 6,
      paddingTop: 7,
      paddingBottom: 8,
    });
    expect("padding" in perSide).toBe(false);
    expect(perSide.paddingleft).toBe(5);
    expect(perSide.paddingright).toBe(6);
    expect(perSide.paddingtop).toBe(7);
    expect(perSide.paddingbottom).toBe(8);
  });

  it("passes text options only when text is shown", () => {
    const withText = buildRenderOptions("code128", "ABC", initialStyling);
    expect(withText.alttext).toBeUndefined(); // empty altText dropped
    expect(withText.textsize).toBe(initialStyling.textSize);

    const noText = buildRenderOptions("code128", "ABC", {
      ...initialStyling,
      showText: false,
    });
    expect(noText.includetext).toBeUndefined();
    expect("textcolor" in noText).toBe(false);
  });

  it("passes alt text when provided", () => {
    const opts = buildRenderOptions("code128", "ABC", {
      ...initialStyling,
      altText: "CUSTOM CAPTION",
    });
    expect(opts.alttext).toBe("CUSTOM CAPTION");
  });

  it("assembles border options", () => {
    const opts = buildRenderOptions("code128", "ABC", {
      ...initialStyling,
      showBorder: true,
      borderWidth: 2.5,
      borderLeft: 4,
    });
    expect(opts.showborder).toBe(true);
    expect(opts.borderwidth).toBe(2.5);
    expect(opts.borderleft).toBe(4);
    expect(opts.bordercolor).toBe(toBwipColor(initialStyling.borderColor));
  });

  it("passes advanced toggles", () => {
    const opts = buildRenderOptions("code128", "ABC", {
      ...initialStyling,
      inkSpread: 0.4,
      includeCheck: true,
      parseAi: true,
    });
    expect(opts.inkspread).toBe(0.4);
    expect(opts.includecheck).toBe(true);
    expect(opts.parsefnc).toBe(true);
  });
});

describe("svgViewBox / withIntrinsicSize", () => {
  const svg = `<svg viewBox="0 0 136 228" xmlns="http://www.w3.org/2000/svg"><path/></svg>`;

  it("extracts viewBox dimensions", () => {
    expect(svgViewBox(svg)).toEqual({ width: 136, height: 228 });
  });

  it("falls back for missing viewBox", () => {
    expect(svgViewBox("<svg></svg>")).toEqual({ width: 300, height: 150 });
  });

  it("injects intrinsic width/height attributes", () => {
    const sized = withIntrinsicSize(svg, 3);
    expect(sized).toContain('width="408"');
    expect(sized).toContain('height="684"');
  });

  it("handles multiplier of 1", () => {
    const sized = withIntrinsicSize(svg);
    expect(sized).toContain('width="136"');
    expect(sized).toContain('height="228"');
  });
});

describe("capability sets", () => {
  it("guard/dotty sets only contain known symbologies", () => {
    for (const bcid of GUARD_BCIDS) {
      expect(symbologyByBcid.has(bcid), `guard: ${bcid}`).toBe(true);
    }
    for (const bcid of DOTTY_BCIDS) {
      expect(symbologyByBcid.has(bcid), `dotty: ${bcid}`).toBe(true);
    }
    for (const bcid of TEXT_CAPABLE_BCIDS) {
      expect(symbologyByBcid.has(bcid), `text: ${bcid}`).toBe(true);
    }
  });

  it("default symbology supports text", () => {
    expect(TEXT_CAPABLE_BCIDS.has("code128")).toBe(true);
    expect(DOTTY_BCIDS.has("code128")).toBe(false);
  });
});
