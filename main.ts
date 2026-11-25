import * as fs from "node:fs";
import * as path from "node:path";

// Winning tip, chosen by screening in SCREENING.md (10 candidates scored
// against the judge brief's five criteria, in order). The reversal: usually
// the human waits for the agent; here the agent is done and waits for the
// hovering human. Punch word ("hovering") lands last.
const LINE =
  "Tip: your AI already wrote the fix. It is patiently waiting for you to stop hovering.";

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

// --- Validation: the gate wants UTF-8 text, 1-200 chars, not only whitespace.
const chars = [...LINE].length;
if (chars < 1 || chars > 200) {
  fail(`line is ${chars} chars, must be 1-200`);
}
if (LINE.trim().length === 0) {
  fail("line is only whitespace");
}
if (LINE.includes("\n") || LINE.includes("\r")) {
  fail("line must be a single line");
}
if (LINE !== LINE.trim()) {
  fail("line has leading or trailing whitespace");
}
if (LINE.includes("  ")) {
  fail("line contains a double space");
}
// Every character must be printable ASCII or a normal space (no control
// characters, no exotic whitespace that a loading screen would mangle).
for (const ch of LINE) {
  const code = ch.codePointAt(0)!;
  if (code < 0x20 || code === 0x7f) {
    fail(`line contains control character U+${code.toString(16).padStart(4, "0")}`);
  }
}
// Reject Unicode whitespace beyond the plain ASCII space (e.g. U+00A0,
// U+2003): a loading screen may render those as odd gaps, and a judge
// reading the raw bytes would see a different line than the eye does.
if (/[^\x20-\x7E]/.test(LINE)) {
  fail("line contains a non-ASCII character");
}
// A one-line tip should end on its punch, with terminal punctuation.
if (!/[.!?]$/.test(LINE)) {
  fail("line must end with terminal punctuation");
}

// --- Write, then read back and verify byte-exact, with no trailing newline.
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "entry.txt");
fs.writeFileSync(outPath, LINE, "utf8");

const readBack = fs.readFileSync(outPath, "utf8");
if (readBack !== LINE) {
  fail("read-back mismatch: entry.txt does not equal the validated line");
}
if (readBack.endsWith("\n")) {
  fail("entry.txt must not end with a trailing newline");
}
const bytes = fs.statSync(outPath).size;
if (bytes !== Buffer.byteLength(LINE, "utf8")) {
  fail(`entry.txt is ${bytes} bytes, expected ${Buffer.byteLength(LINE, "utf8")}`);
}

console.log(`entry.txt written: ${chars} chars, ${bytes} bytes, verified byte-exact`);
console.log(LINE);
