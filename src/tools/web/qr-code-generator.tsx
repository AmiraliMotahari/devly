"use client";

import {
  Download,
  ExternalLink,
  FileText,
  Link2,
  Mail,
  Phone,
  ScanLine,
  Settings2,
  Share2,
  Smartphone,
  Wifi,
  X,
} from "lucide-react";
import QRCodeStyling from "qr-code-styling";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { ToolComponentProps } from "@/tools/tool-props";
import {
  exportTypes,
  initialForms,
  initialStyling,
  QR_TYPES,
  type CornerStyle,
  type DotsStyle,
  type ErrorCorrection,
  type ExportFormat,
  type QRFormState,
  type QRType,
  type StylingState,
} from "@/tools/web/qr/lib";
import { buildPayload, getGradient, validateState } from "@/tools/web/qr/utils";
import { LogoUploader } from "@/tools/web/qr/logo-uploader";

function LabelText({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <Label
      htmlFor={htmlFor}
      className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
    >
      {children}
    </Label>
  );
}

function TypeIcon({ type }: { type: QRType }) {
  switch (type) {
    case "url":
      return <Link2 className="size-4" />;
    case "text":
      return <FileText className="size-4" />;
    case "wifi":
      return <Wifi className="size-4" />;
    case "email":
      return <Mail className="size-4" />;
    case "phone":
      return <Phone className="size-4" />;
    case "sms":
      return <Smartphone className="size-4" />;
    case "vcard":
      return <Share2 className="size-4" />;
    default:
      return <ScanLine className="size-4" />;
  }
}

function QRPreview({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex items-center justify-center rounded-2xl border bg-muted/20 p-6">
      <div
        ref={containerRef}
        className="flex w-full max-w-90 aspect-square items-center justify-center overflow-hidden rounded-xl p-3 shadow-sm"
      />
    </div>
  );
}

export function QrCodeGenerator({ tool }: ToolComponentProps) {
  const [type, setType] = useState<QRType>("url");
  const [forms, setForms] = useState<QRFormState>(initialForms);
  const [styling, setStyling] = useState<StylingState>(initialStyling);
  const [payload, setPayload] = useState("");
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState("");

  const qrContainerRef = useRef<HTMLDivElement | null>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);

  const warnings = useMemo(
    () => validateState(type, payload, styling, forms),
    [forms, payload, styling, type],
  );

  const qrOptions = useMemo(() => {
    if (!payload) return null;

    return {
      width: styling.size,
      height: styling.size,
      type: "svg" as const,
      data: payload,
      margin: styling.margin,
      qrOptions: {
        errorCorrectionLevel: styling.errorCorrection,
      },
      image: styling.logoUrl || undefined,
      dotsOptions: {
        color: styling.useGradient ? undefined : styling.fg,
        type: styling.dotsStyle,
        gradient: getGradient(styling),
      },
      cornersSquareOptions: {
        color: styling.useGradient ? undefined : styling.fg,
        type: styling.cornersSquareStyle,
        gradient: getGradient(styling),
      },
      cornersDotOptions: {
        color: styling.useGradient ? undefined : styling.fg,
        type: styling.cornersDotStyle,
        gradient: getGradient(styling),
      },
      backgroundOptions: {
        color: styling.transparent ? "transparent" : styling.bg,
      },
      imageOptions: {
        crossOrigin: "anonymous" as const,
        margin: 12,
        hideBackgroundDots: true,
      },
    };
  }, [payload, styling]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPayload(buildPayload(type, forms));
  }, [forms, type]);

  useEffect(() => {
    if (!qrContainerRef.current) return;

    let cancelled = false;

    const render = async () => {
      setLoading(true);

      try {
        if (!payload || !qrOptions) {
          qrContainerRef.current!.innerHTML = "";
          qrCodeRef.current = null;
          return;
        }

        if (!qrCodeRef.current) {
          if (qrContainerRef.current) qrContainerRef.current.innerHTML = "";
          qrCodeRef.current = new QRCodeStyling(qrOptions);
          if (qrContainerRef.current)
            qrCodeRef.current.append(qrContainerRef.current);
        } else {
          qrCodeRef.current.update(qrOptions);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) toast.error("QR render failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void render();

    return () => {
      cancelled = true;
    };
  }, [payload, qrOptions]);

  const updateForm = <K extends keyof QRFormState>(
    key: K,
    value: QRFormState[K],
  ) => {
    setForms((prev) => ({ ...prev, [key]: value }));
  };

  const handleExport = async (format: ExportFormat) => {
    if (!qrCodeRef.current) return;
    try {
      await qrCodeRef.current.download({
        name: `qr-${type}`,
        extension: format,
      });
      toast.success(`${format.toUpperCase()} exported`);
    } catch (error) {
      console.error(error);
      toast.error(`${format.toUpperCase()} export failed`);
    }
  };

  void tool;

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Tabs */}
      <Card className="w-full rounded-2xl">
        <CardHeader className="w-full flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TypeIcon type={type} />
                Generator
              </CardTitle>
              <CardDescription>Type: {type.toUpperCase()}</CardDescription>
            </div>
          </div>

          <Tabs
            className="w-full"
            value={type}
            onValueChange={(v) => setType(v as QRType)}
          >
            <TabsList className="flex h-auto w-full flex-wrap justify-evenly gap-2 data-horizontal:h-auto">
              {QR_TYPES.map((t) => (
                <TabsTrigger
                  key={t}
                  value={t}
                  className="rounded-xl text-xs capitalize data-[state=active]:shadow-sm"
                >
                  <span className="inline-flex align-middle">
                    <TypeIcon type={t} />
                  </span>
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="url" className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <LabelText htmlFor="url">URL</LabelText>
                <Input
                  id="url"
                  value={forms.url}
                  onChange={(e) => updateForm("url", e.target.value)}
                  placeholder="example.com or https://example.com"
                />
              </div>
            </TabsContent>

            <TabsContent value="text" className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <LabelText htmlFor="text">Text</LabelText>
                <Textarea
                  id="text"
                  value={forms.text}
                  onChange={(e) => updateForm("text", e.target.value)}
                  placeholder="Plain text to encode"
                  rows={5}
                />
              </div>
            </TabsContent>

            <TabsContent value="wifi" className="mt-6 flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <LabelText htmlFor="wifi-ssid">SSID</LabelText>
                  <Input
                    id="wifi-ssid"
                    value={forms.wifi.ssid}
                    onChange={(e) =>
                      updateForm("wifi", {
                        ...forms.wifi,
                        ssid: e.target.value,
                      })
                    }
                    placeholder="Network name"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <LabelText htmlFor="wifi-password">Password</LabelText>
                  <Input
                    id="wifi-password"
                    value={forms.wifi.password}
                    onChange={(e) =>
                      updateForm("wifi", {
                        ...forms.wifi,
                        password: e.target.value,
                      })
                    }
                    placeholder="Password"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <LabelText>Security</LabelText>
                  <Select
                    value={forms.wifi.security}
                    onValueChange={(v) =>
                      updateForm("wifi", {
                        ...forms.wifi,
                        security: v as QRFormState["wifi"]["security"],
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WPA">WPA/WPA2</SelectItem>
                      <SelectItem value="WEP">WEP</SelectItem>
                      <SelectItem value="nopass">No password</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 rounded-xl border p-3">
                  <Switch
                    checked={forms.wifi.hidden}
                    onCheckedChange={(checked) =>
                      updateForm("wifi", { ...forms.wifi, hidden: checked })
                    }
                  />
                  <div>
                    <div className="text-sm font-medium">Hidden network</div>
                    <div className="text-xs text-muted-foreground">
                      Mark the network as hidden.
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="email" className="mt-6 flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2 md:col-span-2">
                  <LabelText htmlFor="email-recipient">Recipient</LabelText>
                  <Input
                    id="email-recipient"
                    value={forms.email.to}
                    onChange={(e) =>
                      updateForm("email", {
                        ...forms.email,
                        to: e.target.value,
                      })
                    }
                    placeholder="name@example.com"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <LabelText htmlFor="email-subject">Subject</LabelText>
                  <Input
                    id="email-subject"
                    value={forms.email.subject}
                    onChange={(e) =>
                      updateForm("email", {
                        ...forms.email,
                        subject: e.target.value,
                      })
                    }
                    placeholder="Subject"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <LabelText htmlFor="email-body">Body</LabelText>
                  <Input
                    id="email-body"
                    value={forms.email.body}
                    onChange={(e) =>
                      updateForm("email", {
                        ...forms.email,
                        body: e.target.value,
                      })
                    }
                    placeholder="Message body"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="phone" className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <LabelText htmlFor="phone-number">Phone number</LabelText>
                <Input
                  id="phone-number"
                  value={forms.phone}
                  onChange={(e) => updateForm("phone", e.target.value)}
                  placeholder="+1 555 123 4567"
                />
              </div>
            </TabsContent>

            <TabsContent value="sms" className="mt-6 flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <LabelText htmlFor="sms-phone">Phone number</LabelText>
                  <Input
                    id="sms-phone"
                    value={forms.sms.phone}
                    onChange={(e) =>
                      updateForm("sms", {
                        ...forms.sms,
                        phone: e.target.value,
                      })
                    }
                    placeholder="+1 555 123 4567"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <LabelText htmlFor="sms-message">Message</LabelText>
                  <Input
                    id="sms-message"
                    value={forms.sms.body}
                    onChange={(e) =>
                      updateForm("sms", {
                        ...forms.sms,
                        body: e.target.value,
                      })
                    }
                    placeholder="Hello..."
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="vcard" className="mt-6 flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <LabelText htmlFor="vcard-first-name">First name</LabelText>
                  <Input
                    id="vcard-first-name"
                    value={forms.vcard.firstName}
                    onChange={(e) =>
                      updateForm("vcard", {
                        ...forms.vcard,
                        firstName: e.target.value,
                      })
                    }
                    placeholder="John"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <LabelText htmlFor="vcard-last-name">Last name</LabelText>
                  <Input
                    id="vcard-last-name"
                    value={forms.vcard.lastName}
                    onChange={(e) =>
                      updateForm("vcard", {
                        ...forms.vcard,
                        lastName: e.target.value,
                      })
                    }
                    placeholder="Doe"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <LabelText htmlFor="vcard-organization">Organization</LabelText>
                  <Input
                    id="vcard-organization"
                    value={forms.vcard.org}
                    onChange={(e) =>
                      updateForm("vcard", {
                        ...forms.vcard,
                        org: e.target.value,
                      })
                    }
                    placeholder="Acme Inc."
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <LabelText htmlFor="vcard-role">Role</LabelText>
                  <Input
                    id="vcard-role"
                    value={forms.vcard.role}
                    onChange={(e) =>
                      updateForm("vcard", {
                        ...forms.vcard,
                        role: e.target.value,
                      })
                    }
                    placeholder="Product Manager"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <LabelText htmlFor="vcard-phone">Phone</LabelText>
                  <Input
                    id="vcard-phone"
                    value={forms.vcard.phone}
                    onChange={(e) =>
                      updateForm("vcard", {
                        ...forms.vcard,
                        phone: e.target.value,
                      })
                    }
                    placeholder="+1 555 123 4567"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <LabelText htmlFor="vcard-email">Email</LabelText>
                  <Input
                    id="vcard-email"
                    value={forms.vcard.email}
                    onChange={(e) =>
                      updateForm("vcard", {
                        ...forms.vcard,
                        email: e.target.value,
                      })
                    }
                    placeholder="john@acme.com"
                  />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <LabelText htmlFor="vcard-website">Website</LabelText>
                  <Input
                    id="vcard-website"
                    value={forms.vcard.website}
                    onChange={(e) =>
                      updateForm("vcard", {
                        ...forms.vcard,
                        website: e.target.value,
                      })
                    }
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>

      {/* Preview */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="size-4" />
            Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <QRPreview containerRef={qrContainerRef} />
          <div className="flex items-center justify-between">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={!payload || loading}>
                  <Download data-icon="inline-start" /> Download
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {exportTypes.map((elem) => (
                  <DropdownMenuItem
                    key={elem}
                    onClick={() => void handleExport(elem)}
                    disabled={!payload || loading}
                  >
                    <span className="uppercase">{elem}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="text-xs text-muted-foreground">
              Payload length:{" "}
              <span className="font-medium text-foreground">
                {payload.length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Styles */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="size-4" /> Styling
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {/* Size */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <LabelText>Size</LabelText>
              <span className="text-xs text-muted-foreground">
                {styling.size}px
              </span>
            </div>
            <Slider
              value={[styling.size]}
              min={180}
              max={720}
              step={10}
              onValueChange={([v]) =>
                setStyling((prev) => ({ ...prev, size: v }))
              }
            />
          </div>

          {/* Margin */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <LabelText>Margin</LabelText>
              <span className="text-xs text-muted-foreground">
                {styling.margin}
              </span>
            </div>
            <Slider
              value={[styling.margin]}
              min={0}
              max={12}
              step={1}
              onValueChange={([v]) =>
                setStyling((prev) => ({ ...prev, margin: v }))
              }
            />
          </div>

          {/* Transparent background */}
          <div className="flex items-center gap-3 rounded-xl border p-3">
            <Switch
              checked={styling.transparent}
              onCheckedChange={(checked) =>
                setStyling((prev) => ({
                  ...prev,
                  transparent: checked,
                }))
              }
            />
            <div>
              <div className="text-sm font-medium">Transparent background</div>
              <div className="text-xs text-muted-foreground">
                Use for overlays and branded assets.
              </div>
            </div>
          </div>

          {/* Gradient fill */}
          <div className="flex items-center gap-3 rounded-xl border p-3">
            <Switch
              checked={styling.useGradient}
              onCheckedChange={(checked) =>
                setStyling((prev) => ({
                  ...prev,
                  useGradient: checked,
                }))
              }
            />
            <div>
              <div className="text-sm font-medium">Gradient fill</div>
              <div className="text-xs text-muted-foreground">
                Applies to dots and corners.
              </div>
            </div>
          </div>

          {/* Color */}
          <div className="grid gap-4 md:grid-cols-2">
            {styling.useGradient ? (
              <>
                <div className="flex flex-col gap-2">
                  <LabelText htmlFor="gradient-from">Gradient from</LabelText>
                  <Input
                    id="gradient-from"
                    type="color"
                    value={styling.gradientFrom}
                    onChange={(e) =>
                      setStyling((prev) => ({
                        ...prev,
                        gradientFrom: e.target.value,
                      }))
                    }
                    className="h-10 p-1"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <LabelText htmlFor="gradient-to">Gradient to</LabelText>
                  <Input
                    id="gradient-to"
                    type="color"
                    value={styling.gradientTo}
                    onChange={(e) =>
                      setStyling((prev) => ({
                        ...prev,
                        gradientTo: e.target.value,
                      }))
                    }
                    className="h-10 p-1"
                  />
                </div>
                {/* Gradient rotation */}
                <div className="col-span-full flex flex-col gap-2">
                  <LabelText>Gradient rotation</LabelText>
                  <Slider
                    value={[styling.gradientRotation]}
                    min={0}
                    max={Math.PI * 2}
                    step={0.05}
                    onValueChange={([v]) =>
                      setStyling((prev) => ({
                        ...prev,
                        gradientRotation: v,
                      }))
                    }
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <LabelText htmlFor="color-foreground">Foreground</LabelText>
                  <Input
                    id="color-foreground"
                    type="color"
                    value={styling.fg}
                    onChange={(e) =>
                      setStyling((prev) => ({
                        ...prev,
                        fg: e.target.value,
                      }))
                    }
                    className="h-10 p-1"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <LabelText htmlFor="color-background">Background</LabelText>
                  <Input
                    id="color-background"
                    type="color"
                    value={styling.bg}
                    onChange={(e) =>
                      setStyling((prev) => ({
                        ...prev,
                        bg: e.target.value,
                      }))
                    }
                    className="h-10 p-1"
                  />
                </div>
              </>
            )}
            <div className="flex flex-col gap-2">
              <LabelText>Error correction</LabelText>
              <Select
                value={styling.errorCorrection}
                onValueChange={(v) =>
                  setStyling((prev) => ({
                    ...prev,
                    errorCorrection: v as ErrorCorrection,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">L</SelectItem>
                  <SelectItem value="M">M</SelectItem>
                  <SelectItem value="Q">Q</SelectItem>
                  <SelectItem value="H">H</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <LabelText>Dots style</LabelText>
              <Select
                value={styling.dotsStyle}
                onValueChange={(v) =>
                  setStyling((prev) => ({
                    ...prev,
                    dotsStyle: v as DotsStyle,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">Square</SelectItem>
                  <SelectItem value="rounded">Rounded</SelectItem>
                  <SelectItem value="dots">Dots</SelectItem>
                  <SelectItem value="classy">Classy</SelectItem>
                  <SelectItem value="classy-rounded">Classy Rounded</SelectItem>
                  <SelectItem value="extra-rounded">Extra Rounded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <LabelText>Corner square</LabelText>
              <Select
                value={styling.cornersSquareStyle}
                onValueChange={(v) =>
                  setStyling((prev) => ({
                    ...prev,
                    cornersSquareStyle: v as CornerStyle,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">Square</SelectItem>
                  <SelectItem value="dot">Dot</SelectItem>
                  <SelectItem value="rounded">Rounded</SelectItem>
                  <SelectItem value="extra-rounded">Extra Rounded</SelectItem>
                  <SelectItem value="dots">Dots</SelectItem>
                  <SelectItem value="classy">Classy</SelectItem>
                  <SelectItem value="classy-rounded">Classy Rounded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <LabelText>Corner dot</LabelText>
              <Select
                value={styling.cornersDotStyle}
                onValueChange={(v) =>
                  setStyling((prev) => ({
                    ...prev,
                    cornersDotStyle: v as CornerStyle,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">Square</SelectItem>
                  <SelectItem value="dot">Dot</SelectItem>
                  <SelectItem value="rounded">Rounded</SelectItem>
                  <SelectItem value="extra-rounded">Extra Rounded</SelectItem>
                  <SelectItem value="dots">Dots</SelectItem>
                  <SelectItem value="classy">Classy</SelectItem>
                  <SelectItem value="classy-rounded">Classy Rounded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logo */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <CardDescription>
            Center an image on the QR code. Best with error correction H.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LogoUploader
            value={logoPreview}
            onChange={(dataUrl) => {
              setLogoPreview(dataUrl);
              setStyling((prev) => ({
                ...prev,
                logoUrl: dataUrl,
              }));
            }}
            onRemove={() => {
              setLogoPreview("");
              setStyling((prev) => ({
                ...prev,
                logoUrl: "",
              }));
            }}
          />
        </CardContent>
      </Card>

      {warnings.length > 0 ? (
        <Alert variant="destructive">
          <X className="size-4" />
          <AlertTitle>Scan warnings</AlertTitle>
          <AlertDescription className="flex flex-col gap-2 pt-2">
            {warnings.map((warning) => (
              <div
                key={warning.title}
                className="rounded-xl border bg-background p-3 text-foreground"
              >
                <div className="font-medium">{warning.title}</div>
                <div className="text-sm text-muted-foreground">
                  {warning.description}
                </div>
              </div>
            ))}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
