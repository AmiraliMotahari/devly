import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type XmlNode = {
  type: "element" | "text";
  tagName?: string;
  attributes?: Record<string, string>;
  children?: XmlNode[];
  value?: string;
};

function unescapeXmlString(value: string): string {
  return value
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseAttributes(attrsStr: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrPattern = /([A-Za-z_][A-Za-z0-9_.-]*)(?:=("[^"]*"|'[^']*'))?/g;
  let match: RegExpExecArray | null;
  while ((match = attrPattern.exec(attrsStr)) !== null) {
    const name = match[1];
    let value = match[2] ? match[2].slice(1, -1) : "";
    value = unescapeXmlString(value);
    attrs[name] = value;
  }
  return attrs;
}

function tokenize(xml: string): XmlNode[] {
  const tokens: XmlNode[] = [];
  let pos = 0;

  while (pos < xml.length) {
    const tagStart = xml.indexOf("<", pos);
    if (tagStart === -1) {
      const text = xml.substring(pos).trim();
      if (text) {
        tokens.push({ type: "text", value: text });
      }
      break;
    }

    if (tagStart > pos) {
      const text = xml.substring(pos, tagStart).trim();
      if (text) {
        tokens.push({ type: "text", value: text });
      }
    }

    if (xml.substring(tagStart, tagStart + 4) === "<!--") {
      const endComment = xml.indexOf("-->", tagStart);
      if (endComment === -1) break;
      pos = endComment + 3;
      continue;
    }

    if (xml.substring(tagStart, tagStart + 9) === "<![CDATA[") {
      const endCdata = xml.indexOf("]]>", tagStart);
      if (endCdata === -1) break;
      tokens.push({
        type: "text",
        value: xml.substring(tagStart + 9, endCdata),
      });
      pos = endCdata + 3;
      continue;
    }

    const tagEnd = xml.indexOf(">", tagStart);
    if (tagEnd === -1) break;

    const tagContent = xml.substring(tagStart + 1, tagEnd);
    pos = tagEnd + 1;

    if (tagContent.startsWith("/")) {
      continue;
    }

    if (tagContent.endsWith("/")) {
      const selfCloseMatch = tagContent.match(/^([A-Za-z][A-Za-z0-9_.-]*)\s*([^>]*?)\s*\/$/);
      if (selfCloseMatch) {
        const tagName = selfCloseMatch[1];
        const attrsStr = selfCloseMatch[2] || "";
        tokens.push({
          type: "element",
          tagName,
          attributes: parseAttributes(attrsStr),
          children: [],
        });
        continue;
      }
    }

    const openMatch = tagContent.match(/^([A-Za-z][A-Za-z0-9_.-]*)\s*([^>]*)$/);
    if (openMatch) {
      const tagName = openMatch[1];
      const attrsStr = openMatch[2] || "";
      tokens.push({
        type: "element",
        tagName,
        attributes: parseAttributes(attrsStr),
        children: [],
      });
    }
  }

  return tokens;
}

function parseXml(xml: string): XmlNode | null {
  const trimmed = xml.trim();
  if (!trimmed) {
    return null;
  }

  const processed = trimmed
    .replace(/<\?xml[^?]*\?>/gi, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .trim();

  const tokens = tokenize(processed);

  let i = 0;
  function parseNode(): XmlNode | null {
    if (i >= tokens.length) return null;
    const token = tokens[i];

    if (token.type === "text") {
      i++;
      return token;
    }

    if (token.type === "element") {
      const element: XmlNode = {
        type: "element",
        tagName: token.tagName,
        attributes: token.attributes,
        children: [],
      };
      i++;

      while (i < tokens.length) {
        const next = tokens[i];
        if (next.type === "text" && next.value?.trim() === "") {
          i++;
          continue;
        }
        if (next.type === "element") {
          const child = parseNode();
          if (child) element.children?.push(child);
        } else {
          i++;
        }
      }

      return element;
    }

    i++;
    return null;
  }

  return parseNode();
}

function buildJson(node: XmlNode | null, keepAttributes: boolean): JsonValue {
  if (!node) return null;
  if (node.type === "text") {
    return node.value ?? "";
  }

  const result: Record<string, JsonValue> = {};

  if (keepAttributes && node.attributes && Object.keys(node.attributes).length > 0) {
    result["@attributes"] = node.attributes;
  }

  const childElements = (node.children || []).filter((c) => c.type === "element");
  const textChildren = (node.children || []).filter(
    (c) => c.type === "text" && c.value && c.value.trim() !== ""
  );

  const childGroups: Record<string, JsonValue[]> = {};
  for (const child of childElements) {
    const childName = child.tagName!;
    const childValue = buildJson(child, keepAttributes);
    if (!childGroups[childName]) {
      childGroups[childName] = [];
    }
    childGroups[childName].push(childValue);
  }

  for (const [key, values] of Object.entries(childGroups)) {
    result[key] = values.length === 1 ? values[0] : values;
  }

  if (textChildren.length > 0) {
    const text = textChildren.map((c) => c.value).join(" ").trim();
    if (childElements.length === 0) {
      if (Object.keys(result).length > 0) {
        result["#text"] = text;
      } else {
        return text;
      }
    } else {
      result["#text"] = text;
    }
  }

  return Object.keys(result).length > 0 ? result : "";
}

export function XmlToJsonTool({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [keepAttributes, setKeepAttributes] = useState(true);
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some XML data");
        return;
      }

      const tree = parseXml(input);
      if (!tree) {
        setError("Invalid XML format");
        return;
      }

      const jsonContent = buildJson(tree, keepAttributes);
      const finalOutput: Record<string, JsonValue> = {};
      finalOutput[tree.tagName || "root"] = jsonContent;

      setOutput(JSON.stringify(finalOutput, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse XML");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tool-container space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">XML Input</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Paste your XML data here, e.g. <root><item>value</item></root>'
          className="w-full h-48 p-3 border rounded font-mono text-sm"
        />
      </div>

      <div className="flex items-end">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={keepAttributes}
            onChange={(e) => setKeepAttributes(e.target.checked)}
          />
          Keep Attributes
        </label>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleConvert}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Convert
        </button>
        {output && (
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Download JSON
          </button>
        )}
      </div>

      {output && (
        <div>
          <label className="block text-sm font-medium mb-2">JSON Output</label>
          <pre className="w-full h-48 p-3 border rounded overflow-auto font-mono text-sm bg-gray-50">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}