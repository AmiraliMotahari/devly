"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { ToolComponentProps } from "@/tools/tool-props";
import { Copy } from "lucide-react";
import { useState } from "react";

export function WhitespaceCleaner({ tool }: ToolComponentProps) {
  const getBool = (key: string, fallback: boolean) => {
    const opt = tool.options?.find((o) => o.key === key);
    return opt ? Boolean(opt.default) : fallback;
  };

  const [text, setText] = useState("");
  const [trimLines, setTrimLines] = useState(getBool("trimLines", true));
  const [collapseSpaces, setCollapseSpaces] = useState(
    getBool("collapseSpaces", true),
  );
  const [removeBlankLines, setRemoveBlankLines] = useState(
    getBool("removeBlankLines", false),
  );

  let output = text;
  if (trimLines)
    output = output
      .split("\n")
      .map((l) => l.trim())
      .join("\n");
  if (collapseSpaces) output = output.replace(/[ \t]+/g, " ");
  if (removeBlankLines)
    output = output
      .split("\n")
      .filter((l) => l.trim() !== "")
      .join("\n");
  output = output.replace(/\n{3,}/g, "\n\n");

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
      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <Switch
            id="ws-trim-lines"
            checked={trimLines}
            onCheckedChange={setTrimLines}
          />
          <Label htmlFor="ws-trim-lines" className="font-normal">
            Trim each line
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="ws-collapse-spaces"
            checked={collapseSpaces}
            onCheckedChange={setCollapseSpaces}
          />
          <Label htmlFor="ws-collapse-spaces" className="font-normal">
            Collapse spaces
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="ws-remove-blank"
            checked={removeBlankLines}
            onCheckedChange={setRemoveBlankLines}
          />
          <Label htmlFor="ws-remove-blank" className="font-normal">
            Remove blank lines
          </Label>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="ws-input">Input</Label>
        <Textarea
          id="ws-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text..."
          className="min-h-30"
        />
      </div>
      {output && output !== text && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Label htmlFor="ws-output">Cleaned output</Label>
              <Button variant="ghost" size="sm" onClick={copy}>
                <Copy data-icon="inline-start" />
                Copy
              </Button>
            </div>
            <Textarea
              id="ws-output"
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
