import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import ts from "typescript";

// Compare an already-built frontend with an untouched hosting download.
// This checks compiled structure and identifier bindings, not original TSX text.
const frontend = fileURLToPath(new URL("../", import.meta.url));
const hosting = process.argv[2];
assert.ok(hosting, "Usage: node scripts/compare-deployment.mjs /path/to/hosting/root");

function entryScript(root) {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const script = html.match(/<script[^>]+src="([^"]+\.js)"/);
  assert.ok(script, `No JavaScript entry found in ${root}/index.html`);
  return path.resolve(root, script[1].replace(/^\//, ""));
}

function signature(filename) {
  const program = ts.createProgram([filename], {
    allowJs: true,
    noResolve: true,
    noLib: true,
    target: ts.ScriptTarget.Latest,
  });
  const source = program.getSourceFile(filename);
  const checker = program.getTypeChecker();
  const symbols = new Map();
  const tokens = [];

  function identifier(node) {
    const parent = node.parent;
    const property = (ts.isPropertyAccessExpression(parent) && parent.name === node)
      || ((ts.isPropertyAssignment(parent) || ts.isMethodDeclaration(parent)
        || ts.isPropertyDeclaration(parent) || ts.isGetAccessorDeclaration(parent)
        || ts.isSetAccessorDeclaration(parent)) && parent.name === node)
      || (ts.isBindingElement(parent) && parent.propertyName === node);
    if (property) return node.text;
    const symbol = checker.getSymbolAtLocation(node);
    if (!symbol) return node.text; // Preserve globals such as document and fetch.
    if (!symbols.has(symbol)) symbols.set(symbol, `symbol${symbols.size}`);
    return symbols.get(symbol);
  }

  function visit(node) {
    if (ts.isIdentifier(node)) {
      tokens.push(`Identifier ${identifier(node)}`);
      return;
    }
    if (ts.isLiteralExpression(node) || ts.isTemplateHead(node)
      || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      // The hosting build preserved CRLF whitespace inside class strings.
      tokens.push(`${ts.SyntaxKind[node.kind]} ${JSON.stringify(node.text.replace(/\r/g, ""))}`);
      return;
    }
    tokens.push(`${ts.SyntaxKind[node.kind]}(`);
    if (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) {
      tokens.push(`operator ${ts.SyntaxKind[node.operator]}`);
    }
    ts.forEachChild(node, visit);
    tokens.push(")");
  }

  visit(source);
  return createHash("sha256").update(tokens.join("\n")).digest("hex");
}

const built = path.join(frontend, "dist");
const recoveredScript = entryScript(built);
const hostedScript = entryScript(path.resolve(hosting));
const recoveredSignature = signature(recoveredScript);
const hostedSignature = signature(hostedScript);
assert.equal(recoveredSignature, hostedSignature,
  "Compiled JavaScript differs after normalizing local identifier names and CRLF literals");
console.log("PASS: normalized JavaScript syntax, bindings, properties and literal values match");
console.log(`Normalized SHA-256: ${recoveredSignature}`);

let assetCount = 0;
for (const entry of fs.readdirSync(path.join(hosting, "assets"), { withFileTypes: true })) {
  if (!entry.isFile() || /\.(js|css|map)$/.test(entry.name)) continue;
  const hosted = fs.readFileSync(path.join(hosting, "assets", entry.name));
  const recovered = fs.readFileSync(path.join(built, "assets", entry.name));
  assert.ok(hosted.equals(recovered), `Static asset differs: ${entry.name}`);
  assetCount++;
}
console.log(`PASS: all ${assetCount} non-bundle hosting assets match byte for byte`);

function entryCss(root) {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const css = html.match(/<link[^>]+href="([^"]+\.css)"/);
  assert.ok(css, `No stylesheet entry found in ${root}/index.html`);
  return path.resolve(root, css[1].replace(/^\//, ""));
}

function cssRules(filename) {
  const rules = new Map();
  const css = postcss.parse(fs.readFileSync(filename, "utf8"));
  css.walkRules((rule) => {
    const context = [];
    for (let parent = rule.parent; parent && parent.type !== "root"; parent = parent.parent) {
      if (parent.type === "atrule") context.unshift(`@${parent.name} ${parent.params}`);
    }
    const key = JSON.stringify([...context, rule.selector]);
    const declarations = rule.nodes.map((node) => node.toString());
    if (!rules.has(key)) rules.set(key, []);
    rules.get(key).push(declarations);
  });
  return rules;
}

const recoveredRules = cssRules(entryCss(built));
const hostedRules = cssRules(entryCss(hosting));
for (const [selector, declarations] of recoveredRules) {
  assert.deepEqual(declarations, hostedRules.get(selector), `CSS rule differs: ${selector}`);
}
const extraHostedRules = [...hostedRules.keys()].filter((key) => !recoveredRules.has(key));
console.log(`PASS: all rebuilt CSS rule declarations match hosting (${extraHostedRules.length} extra hosting rules)`);

function normalizedHtml(root) {
  return fs.readFileSync(path.join(root, "index.html"), "utf8")
    .replace(/\/assets\/index-[^"\s]+\.js/g, "/assets/ENTRY.js")
    .replace(/\/assets\/index-[^"\s]+\.css/g, "/assets/ENTRY.css")
    .replace(/\s+/g, " ").replace(/>\s+</g, "><").trim();
}
assert.equal(normalizedHtml(built), normalizedHtml(hosting), "HTML differs beyond bundle names and whitespace");
console.log("PASS: HTML matches after normalizing bundle names and whitespace");
console.log("This is a structural comparison, not a browser or backend integration test.");
