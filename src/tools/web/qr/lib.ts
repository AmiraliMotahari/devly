import type { FileExtension } from "qr-code-styling";

export const QR_TYPES = [
  "url",
  "text",
  "wifi",
  "email",
  "phone",
  "sms",
  "vcard",
] as const;

export type QRType = (typeof QR_TYPES)[number];
export type ErrorCorrection = "L" | "M" | "Q" | "H";
export type DotsStyle =
  | "square"
  | "rounded"
  | "dots"
  | "classy"
  | "classy-rounded"
  | "extra-rounded";
export type CornerStyle =
  | "square"
  | "dot"
  | "extra-rounded"
  | "rounded"
  | "dots"
  | "classy"
  | "classy-rounded";
export type ExportFormat = Exclude<FileExtension, "pdf">;

export type QRFormState = {
  url: string;
  text: string;
  wifi: {
    ssid: string;
    password: string;
    security: "WPA" | "WEP" | "nopass";
    hidden: boolean;
  };
  email: {
    to: string;
    subject: string;
    body: string;
  };
  phone: string;
  sms: {
    phone: string;
    body: string;
  };
  vcard: {
    firstName: string;
    lastName: string;
    org: string;
    role: string;
    phone: string;
    email: string;
    website: string;
  };
};

export type StylingState = {
  size: number;
  margin: number;
  fg: string;
  bg: string;
  errorCorrection: ErrorCorrection;
  dotsStyle: DotsStyle;
  cornersSquareStyle: CornerStyle;
  cornersDotStyle: CornerStyle;
  transparent: boolean;
  logoUrl: string;
  useGradient: boolean;
  gradientFrom: string;
  gradientTo: string;
  gradientRotation: number;
};

export type ValidationWarning = {
  title: string;
  description: string;
};

export const initialForms: QRFormState = {
  url: "https://example.com",
  text: "Hello from QR",
  wifi: {
    ssid: "",
    password: "",
    security: "WPA",
    hidden: false,
  },
  email: {
    to: "",
    subject: "",
    body: "",
  },
  phone: "",
  sms: {
    phone: "",
    body: "",
  },
  vcard: {
    firstName: "",
    lastName: "",
    org: "",
    role: "",
    phone: "",
    email: "",
    website: "",
  },
};

export const initialStyling: StylingState = {
  size: 320,
  margin: 2,
  fg: "#111827",
  bg: "#ffffff",
  errorCorrection: "H",
  dotsStyle: "square",
  cornersSquareStyle: "square",
  cornersDotStyle: "square",
  transparent: false,
  logoUrl: "",
  useGradient: false,
  gradientFrom: "#111827",
  gradientTo: "#2563eb",
  gradientRotation: 0.7853981633974483,
};

export const exportTypes: ExportFormat[] = ["jpeg", "png", "svg", "webp"];
