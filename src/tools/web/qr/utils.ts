import type {
  QRFormState,
  QRType,
  StylingState,
  ValidationWarning,
} from "./lib";

export function escapeVCard(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function buildPayload(type: QRType, forms: QRFormState) {
  switch (type) {
    case "url":
      return normalizeUrl(forms.url);
    case "text":
      return forms.text.trim();
    case "wifi": {
      const { ssid, password, security, hidden } = forms.wifi;
      const passwordPart =
        security === "nopass" ? "" : `P:${escapeVCard(password)};`;
      const hiddenPart = hidden ? "H:true;" : "";
      return `WIFI:T:${security};S:${escapeVCard(ssid)};${passwordPart}${hiddenPart};`;
    }
    case "email": {
      const query = new URLSearchParams();
      if (forms.email.subject.trim())
        query.set("subject", forms.email.subject.trim());
      if (forms.email.body.trim()) query.set("body", forms.email.body.trim());
      const qs = query.toString();
      return `mailto:${forms.email.to.trim()}${qs ? `?${qs}` : ""}`;
    }
    case "phone":
      return `tel:${forms.phone.trim()}`;
    case "sms":
      return `SMSTO:${forms.sms.phone.trim()}:${forms.sms.body.trim()}`;
    case "vcard": {
      const v = forms.vcard;
      const name = `${v.firstName} ${v.lastName}`.trim();
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        name ? `FN:${escapeVCard(name)}` : null,
        v.firstName || v.lastName
          ? `N:${escapeVCard(v.lastName)};${escapeVCard(v.firstName)};;;`
          : null,
        v.org ? `ORG:${escapeVCard(v.org)}` : null,
        v.role ? `TITLE:${escapeVCard(v.role)}` : null,
        v.phone ? `TEL:${escapeVCard(v.phone)}` : null,
        v.email ? `EMAIL:${escapeVCard(v.email)}` : null,
        v.website ? `URL:${escapeVCard(v.website)}` : null,
        "END:VCARD",
      ]
        .filter(Boolean)
        .join("\n");
    }
    default:
      return forms.text.trim();
  }
}

export function getGradient(styling: StylingState) {
  if (!styling.useGradient) return undefined;
  return {
    type: "linear" as const,
    rotation: styling.gradientRotation,
    colorStops: [
      { offset: 0, color: styling.gradientFrom },
      { offset: 1, color: styling.gradientTo },
    ],
  };
}

export function validateState(
  type: QRType,
  payload: string,
  styling: StylingState,
  forms: QRFormState,
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!payload) {
    warnings.push({
      title: "Empty payload",
      description: "Add data before exporting or scanning.",
    });
  }

  if (
    !styling.transparent &&
    styling.fg.toLowerCase() === styling.bg.toLowerCase()
  ) {
    warnings.push({
      title: "Low contrast",
      description: "Foreground and background colors are identical.",
    });
  }

  if (styling.logoUrl && styling.errorCorrection !== "H") {
    warnings.push({
      title: "Logo best with H",
      description: "Use error correction level H for logo QR codes.",
    });
  }

  if (payload.length > 600) {
    warnings.push({
      title: "Payload is long",
      description:
        "Long payloads create denser QR codes and can scan less reliably.",
    });
  }

  if (type === "wifi" && !forms.wifi.ssid.trim()) {
    warnings.push({
      title: "Missing SSID",
      description: "Wi-Fi QR codes should include a network name.",
    });
  }

  if (
    type === "url" &&
    forms.url.trim() &&
    !/^https?:\/\//i.test(forms.url.trim()) &&
    !/^www\./i.test(forms.url.trim())
  ) {
    warnings.push({
      title: "URL may be incomplete",
      description: "Consider using https:// or a full domain.",
    });
  }

  return warnings;
}
