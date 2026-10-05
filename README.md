# Extension Performance Facts

A skill's description tells you what it's for, not whether it works. Say a skill claims to make an agent better at writing docs or reviewing code. How would you know? "It works great for me" isn't evidence, and neither is a slick demo, a starred repo, or one good-looking output. And even if the skill does improve results, it might use twice the tokens to do it. That's a tradeoff only you can judge, for your own workload.

Extension Performance Facts is a nutritional label for agent extensions: skills, MCP servers, instructions, custom agents, and plugins that bundle them. It shows whether an extension makes the agent better (lift) or worse (drag) compared with the same agent without it. Next to that it shows what the extension costs in tokens and dollars, the exact agent setup it was measured on, and links to the eval behind every number.

Each extension version gets a machine-readable facts document. The 76-column text label is rendered from it.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ EXTENSION PERFORMANCE FACTS                                EPF-1 · REV A │
├──────────────────────────────────────────────────────────────────────────┤
│ EXTENSION  gitload 1.2.0 · skill                                         │
│ SCOPE      Download files, folders or whole repos from GitHub URLs.      │
├──────────────────────────────────────────────────────────────────────────┤
│ TASKS 11   PROFILES 2   RUNS/ROW 5   EVAL 2026-10-05                     │
╞══════════════════════════════════════════════════════════════════════════╡
│ CONFIGURATION          SCORE¹  RANGE     Δ²   DRAG│LIFT       TOK³  USD³ │
├──────────────────────────────────────────────────────────────────────────┤
│ T9  PRIVATE REPO FOLDER WITH GH CLI SIGNED IN                 6 CRITERIA │
│     Copilot SDK 1.0.14 · gpt-5.6-terra · default · macOS 27              │
│     baseline              50%  50–100     —       │            18k 0.046 │
│     gitload 1.2.0        100%  100–100  +50       ┼██████████  31k 0.054 │
│                                                                          │
│     Copilot SDK 1.0.14 · claude-sonnet-5.5 · default · macOS 27          │
│     baseline             100%  100–100    —       │            44k 0.042 │
│     gitload 1.2.0        100%  100–100    0       ┼            48k 0.044 │
╞══════════════════════════════════════════════════════════════════════════╡
│ ¹ SCORE  median criteria passed · RANGE min–max · n=5                    │
│ ² Δ      median score vs baseline · ░ drag ◄ ┼ ► lift █ · cell=5 pp      │
│ ³ USAGE  input + output + cache · TOK total · USD list @ eval date       │
│   SCOPE  task + profile specific · no transfer implied                   │
├──────────────────────────────────────────────────────────────────────────┤
│ EVAL  .evals/gitload@1.2.0                                   SHA 9f55e19 │
└──────────────────────────────────────────────────────────────────────────┘
```

This is an excerpt. See the [full label](schemas/v1.0/examples/gitload-1.2.0.txt) and the [facts document](schemas/v1.0/examples/gitload-1.2.0.json) it is rendered from.

In this excerpt, the gitload skill doubles GPT-5.6 Terra's score on downloading from a private repo with the GitHub CLI signed in. It also raises the median cost of a run from $0.046 to $0.054. For Claude Sonnet 5.5, the same skill changes nothing except a slightly higher cost. Whether that's worth it is your decision. The label just gives you what you need to make it.

## Why a label

- **One result isn't the whole picture.** When you look at a single output, you see the improvement the extension promised. You don't see the extra tokens it took, or the runs where it left out something you needed. A label reports repeated runs against a baseline, including the range and the cost.
- **Results depend on the agent profile.** A lift measured with one harness, model, and setup can disappear with another. "This extension works" claims too much. The label says under which conditions it was measured, and at what cost.
- **A score needs its evidence.** A badge saying "+27% lift" with no inspectable eval behind it is "trust me" with a decimal point. The label is where you start looking at the evidence: the tasks, how they were scored, how many runs, which agent profiles. That way you can decide whether it says anything about your work.
- **It's evidence, not certification.** Nobody approves extensions. The label replaces the author's judgment, or a persuasive README, with measurements you can check for yourself.
- **It compares like with like.** Skills, MCP servers, and other extensions often compete to solve the same task. One label format lets you put them next to each other against the same baseline.

## Do you need one?

Not for every extension. A small automation you wrote for yourself and can easily check by hand probably isn't worth an eval suite. You know your setup, and you live with the result.

The more an extension is used, the more it's worth knowing what it really does. Publish facts when:

- The extension runs often. A small inefficiency at 50 runs a day adds up.
- A team depends on it.
- You distribute it to people whose models, harnesses, other extensions, and tasks you don't control.

Once other people run your extension, "it seems to work" isn't enough.

## Reading the label

- **Extension**: the name, version, and type of the extension under test.
- **Task** (`T1`, `T2`, …): one eval scenario. Each run of the task is graded against a fixed number of pass/fail criteria.
- **Agent profile**: the setup that ran the task: harness and version, model, reasoning effort, and platform.
- **Configuration**: what was added to the agent profile. `baseline` is the agent profile on its own. The other rows add the extension under test or a competing extension.
- **SCORE / RANGE**: the median and the min–max of the percentage of criteria each run passed. A wide range means the agent profile gets the task right only some of the time.
- **Δ, DRAG, LIFT**: the median score compared with the baseline of the same agent profile, in percentage points. Each bar cell is 5 points. Lift means the extension helped, drag means it hurt. A bar holds up to 10 lift cells or 6 drag cells. A longer bar is cut off, and an arrow (`►` or `◄`) marks the cut end. The Δ number always shows the full value.
- **TOK / USD**: median usage per run, in tokens and in US dollars at the list price on the eval date. Compare these with the baseline to see what the lift costs.

A row only describes that task on that agent profile. Don't assume the same result on other tasks, models, or harnesses.

## Shipping facts with an extension

Wherever the facts live, follow the same rules:

- **Keep the facts out of the agent's context.** Nothing the agent loads, like `SKILL.md`, tool descriptions, or instructions, should point to them. That way the facts cost nothing at runtime.
- **Publish the eval and the evidence.** The label is only as credible as what's behind it. Make the eval suite inspectable: its tasks, criteria, and scoring. Then reference it in `eval.suite` and `eval.sha`. Keep heavy evidence like readouts and transcripts out of the extension package. Publish it as release assets or in the eval repo, and list each item in `eval.evidence` with its URI and SHA-256 hash.
- **Regenerate the facts for every release.** A label describes the exact extension content it was measured on (see [Digest](#digest)).

### Skills and plugins

Put the facts in a `facts/` folder inside the skill or plugin:

```text
my-skill/
  SKILL.md
  scripts/  references/  assets/   # optional, as usual
  facts/
    facts.json    # the facts document (required)
    label.txt     # rendered label (recommended)
```

Agents only load the files `SKILL.md` points them to, so don't link to `facts/` from it. Optionally, point to the facts from the frontmatter so tools can find them without guessing:

```yaml
metadata:
  facts: facts/facts.json
```

### MCP servers, instructions, and agents

Ship `facts.json` and `label.txt` in a `facts/` folder at the root of the repository or package that distributes the extension, next to its README. Don't put them where the agent reads them.

## Facts document

A facts document is JSON that validates against `schemas/v<version>/schema.json`. It has four parts:

- **`schemaVersion`** selects the schema and the renderer.
- **`extension`** holds the type, name, version, a one-line scope, and `digest`.
- **`eval`** identifies the suite and its hash, plus the date, the runs per row, and optional evidence.
- **`tasks`** holds, for each task, its agent profiles and their configuration rows.

Each agent profile must have exactly one baseline row. The renderer computes Δ and the agent profile count from the data, so they can't drift out of sync with it.

Text fields that appear on the label have maximum lengths in the schema. A document that validates always fits in 76 columns.

### Digest

`extension.digest` binds the facts to the exact extension they describe. Tools can recompute it to detect a label that no longer matches the extension. It's written as `sha256:<hex>`, and how it's computed depends on the type:

| Type | Digest over |
| --- | --- |
| `skill`, `plugin` | The extension folder, excluding `facts/`, as described below |
| `mcp-server` | The distributed artifact: the package tarball, or the OCI image manifest |
| `instructions`, `agent` | The file bytes |

To compute the digest of a folder:

1. List every regular file in the folder, excluding `facts/`.
2. Sort the files by POSIX relative path, byte order.
3. For each file, write the line `<path>\t<sha256 of file bytes>\n`.
4. Take the SHA-256 of all those lines concatenated.

```sh
cd my-skill
printf 'sha256:%s\n' "$(find . -type f -not -path './facts/*' | sed 's|^\./||' | LC_ALL=C sort \
  | while IFS= read -r f; do printf '%s\t%s\n' "$f" "$(shasum -a 256 "$f" | cut -d' ' -f1)"; done \
  | shasum -a 256 | cut -d' ' -f1)"
```

## Rendering the label

Each schema version ships a matching renderer with no dependencies (Node.js 20 or later):

```sh
node schemas/v1.0/render.mjs facts/facts.json > facts/label.txt
```

A renderer only accepts documents with its own `schemaVersion`.

## Versioning

```text
schemas/
  v1.0/
    schema.json
    render.mjs
    examples/
```

- **Released versions never change.** A facts document pins its `schemaVersion`, so its schema and renderer must stay exactly as released. Every change ships as a new folder.
- **A minor version (`1.0` → `1.1`) adds optional fields only.** Every document that was valid before stays valid. The label header shows the next revision: `EPF-1 · REV A` → `REV B`.
- **A major version (`1.x` → `2.0`) changes or removes fields, or changes what a number means.** The label header becomes `EPF-2 · REV A`.
- **Each version folder has examples whose rendered `.txt` acts as a test fixture.** Re-rendering an example must produce the committed output byte for byte.
