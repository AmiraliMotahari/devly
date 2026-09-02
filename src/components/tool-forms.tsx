"use client";

import { AlertCircle, Download } from "lucide-react";
import type { ReactNode } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CopyToClipboard } from "@/components/copy-to-clipboard";
import { CodeBlock, resolveCodeLanguage } from "@/components/code-block";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/* ── Layout ─────────────────────────────────────────────── */

export function ToolContainer({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}

export function ToolRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-4">{children}</div>;
}

/* ── Labeled field ───────────────────────────────────────── */

export function ToolField({
  label,
  htmlFor,
  help,
  children,
}: {
  label: string;
  htmlFor?: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

/* ── Text areas ──────────────────────────────────────────── */

export function ToolInput({
  label,
  value,
  onChange,
  placeholder,
  help,
  id,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  help?: string;
  id?: string;
  rows?: number;
}) {
  return (
    <ToolField label={label} htmlFor={id} help={help}>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows ?? 8}
        className="min-h-40 font-mono text-sm"
        spellCheck={false}
      />
    </ToolField>
  );
}

export function ToolOutput({
  label,
  value,
  filename,
  mimeType,
  id,
}: {
  label: string;
  value: string;
  filename: string;
  mimeType: string;
  id?: string;
}) {
  const handleDownload = () => {
    const blob = new Blob([value], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const language = resolveCodeLanguage({ filename, mimeType });

  return (
    <ToolField label={label} htmlFor={id}>
      <CodeBlock
        code={value}
        language={language}
        filename={filename}
        showLineNumbers={false}
        maxHeight="max-h-96"
        className="w-full"
      />
      <div className="flex flex-wrap gap-2">
        <CopyToClipboard value={value} variant="outline" size="sm" showLabel />
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download data-icon="inline-start" />
          Download {filename.split(".").pop()?.toUpperCase() ?? "file"}
        </Button>
      </div>
    </ToolField>
  );
}

/* ── Controls ────────────────────────────────────────────── */

export function ToolCheckbox({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = `tool-checkbox-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(Boolean(v))}
      />
      <Label htmlFor={id} className="cursor-pointer font-normal">
        {label}
      </Label>
    </div>
  );
}

export type ToolSelectOption = { label: string; value: string };

export function ToolSelect({
  label,
  value,
  onValueChange,
  options,
  help,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: ToolSelectOption[];
  help?: string;
}) {
  return (
    <ToolField label={label} help={help}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </ToolField>
  );
}

/* ── Feedback ────────────────────────────────────────────── */

export function ToolError({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="size-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

/* ── Actions ─────────────────────────────────────────────── */

export function ToolActions({
  onRun,
  onClear,
  runLabel = "Convert",
  disabled,
  isRunning,
}: {
  onRun: () => void;
  onClear?: () => void;
  runLabel?: string;
  disabled?: boolean;
  isRunning?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={onRun} disabled={disabled || isRunning}>
        {isRunning ? "Working…" : runLabel}
      </Button>
      {onClear && (
        <Button variant="ghost" onClick={onClear}>
          Clear
        </Button>
      )}
    </div>
  );
}
