"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { ToolComponentProps } from "@/tools/tool-props";
import { Copy } from "lucide-react";
import { useState } from "react";

function convertCase(text: string, caseType: string): string {
  switch (caseType) {
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    case "title":
      return text.replace(
        /\w\S*/g,
        (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
      );
    case "camel":
      return text
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase());
    case "pascal": {
      const camel = text
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase());
      return camel.charAt(0).toUpperCase() + camel.slice(1);
    }
    case "snake":
      return text
        .trim()
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
    case "kebab":
      return text
        .trim()
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    case "sentence":
      return text
        .toLowerCase()
        .replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase());
    default:
      return text;
  }
}

export function CaseConverter({ tool }: ToolComponentProps) {
  const caseOption = tool.options?.find((o) => o.key === "case");
  const defaultCase = (caseOption?.default as string) ?? "upper";

  const [text, setText] = useState("");
  const [caseType, setCaseType] = useState(defaultCase);

  const output = text ? convertCase(text, caseType) : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy — clipboard unavailable");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="case-select">Case</Label>
        <Select value={caseType} onValueChange={setCaseType}>
          <SelectTrigger id="case-select" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="upper">UPPERCASE</SelectItem>
            <SelectItem value="lower">lowercase</SelectItem>
            <SelectItem value="title">Title Case</SelectItem>
            <SelectItem value="camel">camelCase</SelectItem>
            <SelectItem value="pascal">PascalCase</SelectItem>
            <SelectItem value="snake">snake_case</SelectItem>
            <SelectItem value="kebab">kebab-case</SelectItem>
            <SelectItem value="sentence">Sentence case</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="case-input">Input</Label>
        <Textarea
          id="case-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text..."
          className="min-h-30"
        />
      </div>
      {output && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Label htmlFor="case-output">Output</Label>
              <Button variant="ghost" size="sm" onClick={copy}>
                <Copy data-icon="inline-start" />
                Copy
              </Button>
            </div>
            <Textarea
              id="case-output"
              readOnly
              value={output}
              className="min-h-30"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
