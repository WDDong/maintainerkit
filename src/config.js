import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname } from "node:path";
import { defaultConfig, mergeConfig } from "./defaults.js";

export async function loadConfig(configPath = "maintainerkit.yml") {
  if (!existsSync(configPath)) {
    return defaultConfig;
  }

  const raw = await readFile(configPath, "utf8");
  const extension = extname(configPath).toLowerCase();
  const parsed = extension === ".json" ? JSON.parse(raw) : parseSimpleYaml(raw);
  return mergeConfig(defaultConfig, parsed);
}

export function parseSimpleYaml(raw) {
  const root = {};
  const stack = [{ indent: -1, value: root }];
  const lines = raw.split(/\r?\n/);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (!line.trim() || line.trimStart().startsWith("#")) {
      continue;
    }

    const indent = line.match(/^\s*/)[0].length;
    const text = line.trim();

    while (stack.length > 1 && indent <= stack.at(-1).indent) {
      stack.pop();
    }

    const parent = stack.at(-1).value;

    if (text.startsWith("- ")) {
      if (!Array.isArray(parent)) {
        throw new Error(`Invalid YAML list item: ${line}`);
      }
      parent.push(parseScalar(text.slice(2).trim()));
      continue;
    }

    const separator = text.indexOf(":");
    if (separator === -1) {
      throw new Error(`Invalid YAML entry: ${line}`);
    }

    const key = text.slice(0, separator).trim();
    const value = text.slice(separator + 1).trim();

    if (value) {
      parent[key] = parseScalar(value);
      continue;
    }

    const nextValue = nextSignificantLine(lines, lineIndex + 1, indent);
    parent[key] = nextValue?.trim().startsWith("- ") ? [] : {};
    stack.push({ indent, value: parent[key] });
  }

  return root;
}

function nextSignificantLine(lines, start, currentIndent) {
  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trimStart().startsWith("#")) {
      continue;
    }
    const indent = line.match(/^\s*/)[0].length;
    return indent > currentIndent ? line : null;
  }
  return null;
}

function parseScalar(value) {
  const unquoted = value.replace(/^['"]|['"]$/g, "");
  if (unquoted === "true") return true;
  if (unquoted === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(unquoted)) return Number(unquoted);
  return unquoted;
}
