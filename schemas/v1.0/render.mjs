#!/usr/bin/env node
// Renders an Extension Performance Facts v1.0 document as a 76-column text label.
// Usage: node render.mjs <facts.json> > label.txt
import { readFileSync } from "node:fs";

const VERSION = "1.0";
const WIDTH = 74;
const RIGHT_EDGE = WIDTH - 2;
const PP_PER_CELL = 5;
// Content columns (0-based, inside the border).
const COL = {
  name: 5,
  scoreEnd: 29,
  range: 32,
  deltaEnd: 43,
  dragEnd: 50,
  axis: 51,
  lift: 52,
  tokensEnd: 66,
  usdEnd: RIGHT_EDGE,
};
const DRAG_CELLS = COL.dragEnd - COL.deltaEnd - 1;
const LIFT_CELLS = COL.tokensEnd - 4 - COL.lift;

const file = process.argv[2];
if (!file) {
  console.error("Usage: node render.mjs <facts.json>");
  process.exit(2);
}
const facts = JSON.parse(readFileSync(file, "utf8"));
if (facts.schemaVersion !== VERSION) {
  console.error(`Expected schemaVersion ${VERSION}, got ${facts.schemaVersion}; use the matching renderer.`);
  process.exit(2);
}
try {
  process.stdout.write(`${render(facts).join("\n")}\n`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

function render({ extension, eval: evaluation, tasks }) {
  const profileKeys = new Set(tasks.flatMap((task) => task.profiles.map(profileLine)));
  let header = put(blank(), " CONFIGURATION", 0);
  header = right(header, "SCORE¹", COL.scoreEnd);
  header = put(header, "RANGE", COL.range);
  header = right(header, "Δ²", COL.deltaEnd);
  header = right(header, "DRAG", COL.dragEnd);
  header = put(header, "│", COL.axis);
  header = put(header, "LIFT", COL.lift);
  header = right(header, "TOK³", COL.tokensEnd);
  header = right(header, "USD³", COL.usdEnd);

  const lines = [
    rule("┌", "─", "┐"),
    row(right(put(blank(), " EXTENSION PERFORMANCE FACTS", 0), formatId(VERSION), RIGHT_EDGE)),
    rule("├", "─", "┤"),
    ...wrap(" EXTENSION  ", [`${extension.name} ${extension.version}`, extension.type]),
    row(` SCOPE      ${extension.scope}`),
    rule("├", "─", "┤"),
    row(` TASKS ${tasks.length}   PROFILES ${profileKeys.size}   RUNS/ROW ${evaluation.runsPerRow}   EVAL ${evaluation.date}`),
    rule("╞", "═", "╡"),
    row(header),
  ];
  for (const task of tasks) {
    lines.push(rule("├", "─", "┤"));
    const criteria = `${task.criteria} ${task.criteria === 1 ? "CRITERION" : "CRITERIA"}`;
    lines.push(row(right(put(blank(), `${task.id.padEnd(4)}${task.title.toUpperCase()}`, 1), criteria, RIGHT_EDGE)));
    task.profiles.forEach((profile, index) => {
      if (index > 0) lines.push(row());
      lines.push(...wrap("     ", profileSegments(profile)));
      const baseline = profile.rows.find((item) => item.baseline);
      for (const item of profile.rows) {
        lines.push(configurationRow(item, item.baseline ? undefined : percent(item.score.mean) - percent(baseline.score.mean)));
      }
    });
  }
  lines.push(
    rule("╞", "═", "╡"),
    row(` ¹ SCORE  mean criteria passed · RANGE min–max · n=${evaluation.runsPerRow}`),
    row(` ² Δ      mean score vs baseline · ░ drag ◄ ┼ ► lift █ · cell=${PP_PER_CELL} pp`),
    row(" ³ USAGE  mean per run · input + output + cache · USD list @ eval date"),
    row("   SCOPE  task + profile specific · no transfer implied"),
    rule("├", "─", "┤"),
    row(right(put(blank(), ` EVAL  ${evaluation.suite}`, 0), `SHA ${evaluation.sha.slice(0, 7)}`, RIGHT_EDGE)),
    rule("└", "─", "┘"),
  );
  return lines;
}

function configurationRow(item, delta) {
  let line = put(blank(), item.configuration, COL.name);
  line = right(line, `${percent(item.score.mean)}%`, COL.scoreEnd);
  line = put(line, `${percent(item.score.min)}–${percent(item.score.max)}`, COL.range);
  if (delta === undefined) {
    line = right(line, "—", COL.deltaEnd);
    line = put(line, "│", COL.axis);
  } else {
    line = right(line, delta > 0 ? `+${delta}` : `${delta}`, COL.deltaEnd);
    line = put(line, "┼", COL.axis);
    const cells = delta === 0 ? 0 : Math.max(1, Math.round(Math.abs(delta) / PP_PER_CELL));
    if (delta > 0) line = put(line, bar(cells, LIFT_CELLS, "█", "►", false), COL.lift);
    if (delta < 0) line = right(line, bar(cells, DRAG_CELLS, "░", "◄", true), COL.dragEnd);
  }
  line = right(line, formatTokens(item.usage.tokens), COL.tokensEnd);
  line = right(line, formatUsd(item.usage.usd), COL.usdEnd);
  return row(line);
}

// A bar longer than its area is clipped, with an arrow marking the clipped end.
function bar(cells, max, fill, arrow, leading) {
  if (cells <= max) return fill.repeat(cells);
  return leading ? arrow + fill.repeat(max - 1) : fill.repeat(max - 1) + arrow;
}

function profileLine(profile) {
  return profileSegments(profile).join(" · ");
}

function profileSegments({ harness, model, reasoningEffort, platform }) {
  return [`${harness.name} ${harness.version}`, model, reasoningEffort, platform];
}

// Joins segments with " · "; a segment that doesn't fit starts a continuation line with "· ".
function wrap(prefix, segments) {
  const lines = [];
  let current = prefix + segments[0];
  for (const segment of segments.slice(1)) {
    const joined = `${current} · ${segment}`;
    if (joined.length <= RIGHT_EDGE + 1) {
      current = joined;
    } else {
      lines.push(row(current));
      current = `${" ".repeat(prefix.length)}· ${segment}`;
    }
  }
  lines.push(row(current));
  return lines;
}

function percent(value) {
  return Math.round(value);
}

// Schema 1.0 is EPF-1 REV A, 1.1 is REV B, 2.0 is EPF-2 REV A.
function formatId(version) {
  const [major, minor] = version.split(".").map(Number);
  return `EPF-${major} · REV ${String.fromCharCode(65 + minor)}`;
}

// At most 4 characters.
function formatTokens(tokens) {
  if (tokens < 1000) return String(tokens);
  if (tokens < 999_500) return `${Math.round(tokens / 1000)}k`;
  if (tokens < 9_950_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens < 999_500_000) return `${Math.round(tokens / 1_000_000)}M`;
  if (tokens < 9_950_000_000) return `${(tokens / 1_000_000_000).toFixed(1)}G`;
  return `${Math.round(tokens / 1_000_000_000)}G`;
}

// At most 5 characters.
function formatUsd(usd) {
  if (usd > 0 && usd < 0.0005) return "<.001";
  if (usd < 0.9995) return usd.toFixed(3);
  if (usd < 99.995) return usd.toFixed(2);
  if (usd < 99_999.5) return String(Math.round(usd));
  return `${Math.round(usd / 1000)}k`;
}

function blank() {
  return " ".repeat(WIDTH);
}

function put(line, text, at) {
  const end = at + text.length;
  if (at < 0 || end > WIDTH || line.slice(at, end).trim() !== "") {
    throw new Error(`Label content collides or overflows at column ${at}: "${text}" in\n${line}`);
  }
  return line.slice(0, at) + text + line.slice(end);
}

function right(line, text, end) {
  return put(line, text, end - text.length + 1);
}

function row(text = "") {
  if (text.trimEnd().length > RIGHT_EDGE + 1) {
    throw new Error(`Label content runs into the right margin:\n${text}`);
  }
  return `│${text.padEnd(WIDTH)}│`;
}

function rule(left, fill, end) {
  return `${left}${fill.repeat(WIDTH)}${end}`;
}
