#!/usr/bin/env node
/**
 * Inficy ChatGPT plugin package validation.
 *
 * Structural and safety checks over `.agents/plugins/marketplace.json` and
 * `plugins/inficy`. Pure filesystem reads, no network, so it can run in CI, in a
 * clean clone, and inside the test suite.
 *
 * Usage:
 *   node scripts/validate-plugin-package.mjs            structural checks
 *   node scripts/validate-plugin-package.mjs --release  also rejects placeholders
 *   node scripts/validate-plugin-package.mjs --root DIR validate a copied tree
 */
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, resolve, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const MARKETPLACE_PATH = ".agents/plugins/marketplace.json";
export const PLUGIN_DIR = "plugins/inficy";
export const PLACEHOLDER_APP_ID = "plugin_asdk_app_REPLACE_ME";

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Patterns that must never appear in committed plugin files. */
const SECRET_PATTERNS = [
  [/ifc_setup_[A-Za-z0-9]/, "Inficy setup code"],
  [/ifc_(?:live|rt)_[A-Za-z0-9]/, "Inficy reporting token"],
  [/sb_secret_[A-Za-z0-9]/, "Supabase secret key"],
  [/\bsk-[A-Za-z0-9]{16,}/, "API key"],
  [/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./, "JWT / OAuth token"],
  [/\baccess_token\s*[":=]/i, "OAuth access token"],
  [/\brefresh_token\s*[":=]/i, "OAuth refresh token"],
  [/\bclient_secret\s*[":=]/i, "OAuth client secret"],
  [/\bset-cookie\b/i, "cookie"],
  [
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/,
    "workspace or user identifier (UUID)",
  ],
];

const FORBIDDEN_FILES = [
  ["ai-plugin.json", "legacy plugin manifest"],
  [".well-known/ai-plugin.json", "legacy plugin manifest"],
  [".mcp.json", "bundled local MCP process definition"],
  ["hooks", "lifecycle hooks"],
  [".codex-plugin/hooks", "lifecycle hooks"],
  [".codex-plugin/hooks.json", "lifecycle hooks"],
  [".env", "environment file"],
  [".env.local", "environment file"],
];

function readJson(path, errors, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    errors.push(`${label}: invalid JSON (${e.message})`);
    return null;
  }
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

export function validatePluginPackage({ root = process.cwd(), release = false } = {}) {
  const errors = [];
  const warnings = [];
  const rootAbs = resolve(root);
  const marketplaceFile = join(rootAbs, MARKETPLACE_PATH);
  const pluginDir = join(rootAbs, PLUGIN_DIR);

  // ---- marketplace -------------------------------------------------------
  if (!existsSync(marketplaceFile)) {
    errors.push(`${MARKETPLACE_PATH}: missing`);
  } else {
    const market = readJson(marketplaceFile, errors, MARKETPLACE_PATH);
    if (market) {
      if (market.name !== "inficy-plugins") errors.push("marketplace: name must be inficy-plugins");
      if (!market.interface?.displayName) errors.push("marketplace: interface.displayName missing");
      const entry = (market.plugins ?? []).find((p) => p.name === "inficy");
      if (!entry) errors.push("marketplace: no inficy plugin entry");
      else {
        if (entry.source?.source !== "local") errors.push("marketplace: source.source must be local");
        const p = entry.source?.path ?? "";
        if (!p.startsWith("./")) errors.push("marketplace: source.path must begin with ./");
        // Resolved relative to the marketplace root, i.e. the repository root.
        const resolved = resolve(rootAbs, p);
        const rel = relative(rootAbs, resolved);
        if (rel.startsWith("..") || resolved === rootAbs) {
          errors.push("marketplace: source.path escapes the repository root");
        }
        if (!existsSync(resolved)) errors.push(`marketplace: source.path does not exist (${p})`);
        if (entry.policy?.installation !== "AVAILABLE")
          errors.push("marketplace: policy.installation must be AVAILABLE");
        if (entry.policy?.authentication !== "ON_INSTALL")
          errors.push("marketplace: policy.authentication must be ON_INSTALL");
        if (entry.category !== "Productivity") errors.push("marketplace: category must be Productivity");
      }
    }
  }

  // ---- plugin manifest ---------------------------------------------------
  const manifestFile = join(pluginDir, ".codex-plugin/plugin.json");
  let manifest = null;
  if (!existsSync(manifestFile)) {
    errors.push("plugins/inficy/.codex-plugin/plugin.json: missing");
  } else {
    manifest = readJson(manifestFile, errors, "plugin.json");
  }

  if (manifest) {
    if (manifest.name !== "inficy") errors.push("plugin.json: name must be inficy");
    if (!KEBAB.test(manifest.name ?? "")) errors.push("plugin.json: name must be kebab-case");
    if (!SEMVER.test(manifest.version ?? "")) errors.push("plugin.json: version must be semver");
    for (const field of ["description", "homepage", "repository", "license", "publisher", "keywords"]) {
      if (!manifest[field] || (Array.isArray(manifest[field]) && manifest[field].length === 0)) {
        errors.push(`plugin.json: ${field} missing`);
      }
    }
    if (manifest.license !== "MIT") warnings.push("plugin.json: license is not MIT");
    const iface = manifest.interface ?? {};
    if (!iface.displayName) errors.push("plugin.json: interface.displayName missing");
    if (iface.category !== "Productivity") errors.push("plugin.json: interface.category must be Productivity");
    const caps = iface.capabilities ?? [];
    for (const cap of ["read", "write"]) {
      if (!caps.includes(cap)) errors.push(`plugin.json: interface.capabilities must include ${cap}`);
    }
    if (!Array.isArray(iface.starterPrompts) || iface.starterPrompts.length < 3) {
      errors.push("plugin.json: at least three starter prompts required");
    }
    for (const key of ["privacyPolicyUrl", "termsOfServiceUrl", "supportUrl"]) {
      const url = iface[key];
      if (!url) errors.push(`plugin.json: interface.${key} missing`);
      else if (!url.startsWith("https://")) errors.push(`plugin.json: interface.${key} must use HTTPS`);
    }
    if (typeof manifest.homepage === "string" && !manifest.homepage.startsWith("https://")) {
      errors.push("plugin.json: homepage must use HTTPS");
    }

    // every declared path is ./-relative and exists
    const pathFields = [
      ["skills", manifest.skills],
      ["apps", manifest.apps],
      ["interface.icon", iface.icon],
      ["interface.logo", iface.logo],
    ];
    for (const [label, value] of pathFields) {
      if (!value) {
        errors.push(`plugin.json: ${label} missing`);
        continue;
      }
      if (!value.startsWith("./")) errors.push(`plugin.json: ${label} must begin with ./`);
      const target = resolve(pluginDir, value);
      if (relative(pluginDir, target).startsWith("..")) {
        errors.push(`plugin.json: ${label} escapes the plugin directory`);
      } else if (!existsSync(target)) {
        errors.push(`plugin.json: ${label} points at a missing path (${value})`);
      }
    }

    if (release && /REPLACE_ME/.test(manifest.repository ?? "")) {
      errors.push("plugin.json: repository still contains a placeholder");
    }
  }

  // ---- app connection ----------------------------------------------------
  for (const file of [".app.json", ".app.example.json"]) {
    const full = join(pluginDir, file);
    if (!existsSync(full)) {
      errors.push(`plugins/inficy/${file}: missing`);
      continue;
    }
    const app = readJson(full, errors, file);
    if (!app) continue;
    const entry = (app.apps ?? [])[0];
    if (!entry) {
      errors.push(`${file}: apps[0] missing`);
      continue;
    }
    const id = entry.connection?.id ?? "";
    if (!id.startsWith("plugin_asdk_app")) {
      errors.push(`${file}: connection.id must be a ChatGPT plugin_asdk_app... identifier`);
    }
    const url = entry.server?.url ?? "";
    if (!url.startsWith("https://")) errors.push(`${file}: server.url must use HTTPS`);
    if (/\?|token|key=|@/.test(url)) errors.push(`${file}: server.url must not carry credentials`);
    if (file === ".app.example.json" && id !== PLACEHOLDER_APP_ID) {
      errors.push(".app.example.json: must keep the documented placeholder id");
    }
    if (file === ".app.json" && release && id === PLACEHOLDER_APP_ID) {
      errors.push(".app.json: placeholder technical id in a release build");
    }
  }

  // ---- advertised tools --------------------------------------------------
  // Nothing may be advertised that the MCP server does not expose. This file is
  // the declared surface; a test asserts it matches the real tools/list.
  const toolsFile = join(pluginDir, "tools.json");
  let advertised = [];
  if (!existsSync(toolsFile)) {
    errors.push("plugins/inficy/tools.json: missing");
  } else {
    const doc = readJson(toolsFile, errors, "tools.json");
    if (doc) {
      advertised = Array.isArray(doc.tools) ? doc.tools : [];
      if (advertised.length === 0) errors.push("tools.json: tools must be a non-empty list");
      const known = new Set(advertised);
      for (const [scope, tools] of Object.entries(doc.scopes ?? {})) {
        if (!/^[a-z]+:[a-z]+$/.test(scope)) {
          errors.push(`tools.json: scope ${scope} is not an <area>:<action> scope`);
        }
        for (const tool of tools) {
          if (!known.has(tool)) errors.push(`tools.json: scope ${scope} maps to unknown tool ${tool}`);
        }
      }
      const mapped = doc.starterPrompts ?? {};
      for (const prompt of manifest?.interface?.starterPrompts ?? []) {
        const needs = mapped[prompt];
        if (!Array.isArray(needs) || needs.length === 0) {
          errors.push(`plugin.json: starter prompt is not mapped to any tool (${prompt})`);
          continue;
        }
        for (const tool of needs) {
          if (!known.has(tool)) {
            errors.push(`starter prompt "${prompt}" needs tool ${tool}, which is not advertised`);
          }
        }
      }
      for (const prompt of Object.keys(mapped)) {
        if (!(manifest?.interface?.starterPrompts ?? []).includes(prompt)) {
          warnings.push(`tools.json: maps a prompt that plugin.json does not advertise (${prompt})`);
        }
      }
      // Capability claims must be backed by at least one tool of that kind.
      const caps = manifest?.interface?.capabilities ?? [];
      const writeTools = Object.entries(doc.scopes ?? {})
        .filter(([scope]) => scope.endsWith(":write"))
        .flatMap(([, tools]) => tools);
      if (caps.includes("write") && writeTools.length === 0) {
        errors.push("plugin.json: declares the write capability but no write tool is advertised");
      }
      if (caps.includes("read") && advertised.length === writeTools.length) {
        errors.push("plugin.json: declares the read capability but no read tool is advertised");
      }
    }
  }

  // ---- skill -------------------------------------------------------------
  const skillFile = join(pluginDir, "skills/inficy-session-analytics/SKILL.md");
  if (!existsSync(skillFile)) {
    errors.push("skills/inficy-session-analytics/SKILL.md: missing");
  } else {
    const text = readFileSync(skillFile, "utf8");
    const fm = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
    if (!fm) errors.push("SKILL.md: missing YAML frontmatter");
    else {
      const front = fm[1];
      const body = fm[2];
      const name = /^name:\s*(.+)$/m.exec(front)?.[1]?.trim();
      const description = /^description:\s*(.+)$/m.exec(front)?.[1]?.trim();
      if (name !== "inficy-session-analytics") errors.push("SKILL.md: frontmatter name mismatch");
      if (!description || description.length < 40) errors.push("SKILL.md: description too vague");
      if (description && !/only when/i.test(description)) {
        errors.push("SKILL.md: description must narrow activation");
      }
      if (body.trim().length < 400) errors.push("SKILL.md: instructions too short");
      for (const ref of body.match(/`([a-z_]{3,})`/g) ?? []) {
        const name = ref.slice(1, -1);
        if (!/^(get|list|start|record|finish|verify|connect|create|purchase|request)_/.test(name)) continue;
        if (!advertised.includes(name)) {
          errors.push(`SKILL.md: instructs the model to call ${name}, which is not advertised in tools.json`);
        }
      }
      for (const claim of [
        /tracking begins only when selected/i,
        /cannot observe every chatgpt conversation/i,
        /agent-reported|self-reported/i,
        /hidden reasoning/i,
        /checkpoint/i,
      ]) {
        if (!claim.test(body)) errors.push(`SKILL.md: missing required disclosure ${claim}`);
      }
    }
  }

  // ---- assets ------------------------------------------------------------
  for (const [name, minSize] of [
    ["assets/icon.png", 128],
    ["assets/logo.png", 128],
  ]) {
    const full = join(pluginDir, name);
    if (!existsSync(full)) {
      errors.push(`plugins/inficy/${name}: missing`);
      continue;
    }
    const buf = readFileSync(full);
    if (buf.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
      errors.push(`${name}: must be a PNG`);
      continue;
    }
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    if (width !== height) errors.push(`${name}: must be square (got ${width}x${height})`);
    if (width < minSize) errors.push(`${name}: must be at least ${minSize}px (got ${width}px)`);
    if (width > 1024) errors.push(`${name}: must be at most 1024px (got ${width}px)`);
  }

  // ---- forbidden files ---------------------------------------------------
  for (const [name, why] of FORBIDDEN_FILES) {
    const full = join(pluginDir, name);
    if (existsSync(full)) errors.push(`plugins/inficy/${name}: ${why} is not allowed`);
  }
  const codexDir = join(pluginDir, ".codex-plugin");
  if (existsSync(codexDir) && statSync(codexDir).isDirectory()) {
    const extras = readdirSync(codexDir).filter((f) => f !== "plugin.json");
    if (extras.length) errors.push(`.codex-plugin/ must contain only plugin.json (found ${extras.join(", ")})`);
  }

  // ---- secret scan -------------------------------------------------------
  const scanned = [];
  if (existsSync(pluginDir)) scanned.push(...walk(pluginDir));
  if (existsSync(marketplaceFile)) scanned.push(marketplaceFile);
  for (const file of scanned) {
    if (/\.(png|jpg|jpeg|webp|gif|ico)$/i.test(file)) continue;
    const text = readFileSync(file, "utf8");
    for (const [pattern, label] of SECRET_PATTERNS) {
      if (pattern.test(text)) {
        errors.push(`${relative(rootAbs, file)}: possible ${label} committed`);
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings, release };
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const args = process.argv.slice(2);
  const rootIndex = args.indexOf("--root");
  const root = rootIndex >= 0 ? args[rootIndex + 1] : resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const report = validatePluginPackage({ root, release: args.includes("--release") });
  for (const w of report.warnings) console.warn(`warn  ${w}`);
  for (const e of report.errors) console.error(`error ${e}`);
  console.log(
    report.ok
      ? `Inficy plugin package OK (${report.release ? "release" : "structural"} mode)`
      : `Inficy plugin package FAILED with ${report.errors.length} error(s)`,
  );
  process.exit(report.ok ? 0 : 1);
}
