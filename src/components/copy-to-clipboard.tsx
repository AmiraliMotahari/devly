"use client";

import { ComponentProps, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCheckIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Props = {
  value: string;
  label?: string;
  showLabel?: boolean;
} & Omit<ComponentProps<typeof Button>, "onClick" | "type">;

export function CopyToClipboard({
  value,
  label = "Copy",
  showLabel,
  ...props
}: Props) {
  const [isCopied, setIsCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      toast.success("Copied to clipboard");

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
      setIsCopied(false);
    }
  };

  if (showLabel) {
    return (
      <Button onClick={handleCopy} {...props}>
        {isCopied ? <CheckCheckIcon /> : <CopyIcon />}
        {isCopied ? "Copied" : label}
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          onClick={handleCopy}
          aria-label={isCopied ? "Copied to clipboard" : "Copy to clipboard"}
          {...props}
        >
          {isCopied ? <CheckCheckIcon /> : <CopyIcon />}
          <span className="sr-only">{isCopied ? "Copied" : label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{isCopied ? "Copied!" : label}</TooltipContent>
    </Tooltip>
  );
}
