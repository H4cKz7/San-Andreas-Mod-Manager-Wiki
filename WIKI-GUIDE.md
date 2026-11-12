# Wiki guide: structure and how to add things

This repo is read by the **Wiki** button in SA Mod Manager. The app shows a navigation tree, search, tags, previous/next links and a cached offline copy. It builds all of that from two generated files, `index.json` and `search.json`, so you only ever edit Markdown.

## Adding content (the whole workflow)

1. Add or edit `.md` files inside a numbered section folder.
2. Run `node tools/build-index.js` (or let the GitHub Action do it after you push).
3. Commit and push. The app picks up the change the next time the Wiki is opened.

## Folder layout

```
San-Andreas-Mod-Manager-Wiki/
├─ wiki.config.json            title, description, home page
├─ index.json  search.json     generated, never edit by hand
├─ tools/build-index.js
├─ images/                     screenshots, shared by all pages
├─ _template.md                copy this for every new page
├─ 01-getting-started/
│  ├─ _section.json            optional: title, summary, order
│  ├─ 01-welcome.md
│  └─ 02-installing-the-app.md
├─ 02-mod-list/
├─ 03-installing-mods/
├─ 04-config-editor/
├─ 05-modloader-reference/
│  ├─ 01-modloader-ini.md
│  └─ profiles/                sub-section (one level of nesting is plenty)
│     ├─ _section.json
│     └─ 01-inheritance.md
├─ 06-tools/
├─ 07-customization/
├─ 08-troubleshooting/
├─ 09-faq/
└─ 10-reference/
```

Rules the builder follows:

- **Sections are folders.** A folder becomes a section if it contains at least one page. Folders starting with `_` or `.`, and `tools`, `images`, `assets`, are ignored.
- **Order comes from the number prefix.** `02-` shows before `10-`. Leave gaps (`10-`, `20-`, `30-`) in busy folders so you can slot pages in later without renaming.
- **Titles** come from `title:` in the page, or from `_section.json` for folders. Without them the file name is used.
- **Files starting with `_`, `README.md` and pages with `draft: true`** are not published. Use `draft: true` for unfinished pages you still want to commit.
- **Sub-sections** are folders inside a section. They appear indented in the navigation.

## Suggested sections for the full wiki

| Folder | What goes in it |
|---|---|
| `01-getting-started` | What it is, requirements, installer vs portable, choosing the GTA folder, first launch |
| `02-mod-list` | Profiles, parents and inheritance, enabling and disabling, folders, search, drag and drop, cut/copy/paste, trash |
| `03-installing-mods` | Smart installer, archives and passwords, installing into an existing folder, undoing an install |
| `04-config-editor` | Form view, tree view, raw view, search, collapsing sections, booleans as text, colour picker, backups, undo history |
| `05-modloader-reference` | `modloader.ini` keys, Folder.Config, priorities, ignore patterns, plugins, reading `modloader.log` |
| `06-tools` | Logs, shortcuts, launch options, export (txt/html), version and essentials checker, game installs |
| `07-customization` | Light and dark theme, Appearance dialog and custom colours |
| `08-troubleshooting` | Mod does not load, crashes on start, missing ASI or CLEO, wrong game version, update problems |
| `09-faq` | Short questions with short answers; link out to the long pages |
| `10-reference` | Keyboard shortcuts, glossary, file locations, changelog per version |

Start small: create the folder, add one page, grow from there. A section with a single page is fine.

## Page format

Every page starts with front matter, then Markdown. Copy `_template.md`.

```
---
title: Installing a mod
summary: One sentence shown under the title and in search results.
tags: install, archive, zip
order: 20
updated: 2026-11-12
---
```

| Field | Required | Notes |
|---|---|---|
| `title` | yes | Shown in the navigation, page header and search. Keep titles unique. |
| `summary` | recommended | Also searched, so use the words people would type. |
| `tags` | recommended | Comma separated, lowercase, reuse existing tags (see below). |
| `order` | no | Overrides the number prefix when you need it. |
| `updated` | no | `YYYY-MM-DD`. The newest value is shown as "Wiki updated". |
| `draft` | no | `true` hides the page. |

**Do not write a `# Title` heading.** The title comes from front matter, and a first `#` heading is ignored. Start sections with `##` and use `###` below that. `##` headings are searched and shown in "On this page".

## Linking

- **By title (preferred):** `[[Installing a mod]]` or `[[Installing a mod|how to install]]`. The link survives moving or renumbering pages. Unknown titles are shown with a dashed underline and reported by the builder.
- **By path:** `[text](../03-installing-mods/01-installing-a-mod.md#steps)`. Paths are relative to the current page.
- **External:** `[text](https://example.com)` opens in the browser.
- **Images:** put files in `images/` and use `![Profiles menu](../images/profiles-menu.png)` (relative to the page). Use file names without spaces. Images need an internet connection; text works offline.

## Formatting that the reader supports

Headings `##`–`####`, **bold**, *italic*, ~~strike~~, `inline code`, fenced code blocks with a Copy button, bullet and numbered lists (nested by indenting two spaces), task lists, tables, block quotes, horizontal rules, `<kbd>Ctrl</kbd>` for keys.

Callouts:

```
> [!NOTE]
> Extra context.

> [!TIP]
> A shortcut or better way.

> [!IMPORTANT]
> Something the reader must not miss.

> [!WARNING]
> Can cause problems if ignored.

> [!CAUTION]
> Can break the game or lose data.
```

Raw HTML is not rendered (it is shown as text) apart from `<kbd>`, `<sub>`, `<sup>` and `<br>`.

## Tags

Tags are the second way to find things, next to the folder tree. Keep the vocabulary small and reuse it. Suggested starting set:

`basics` `setup` `install` `archive` `profiles` `modloader` `config` `ini` `json` `backup` `logs` `troubleshooting` `shortcuts` `theme` `export` `checker`

Searching `tag:ini` lists every page with that tag. Combine with words: `tag:ini boolean`.

## Writing style

- One page, one job: a task ("Install a mod"), a reference ("modloader.ini keys") or an explanation ("How profile inheritance works"). Say which in the summary.
- Open with what the reader can do after reading, then the steps.
- Use the names exactly as they appear on screen: **Scan GTA folder**, **Make current**, **Config editor**.
- Procedures are numbered lists, one action per step. Put warnings before the step they apply to.
- Aim for pages that fit one or two screens. Split long pages and link them.

## Checks

`node tools/build-index.js` prints warnings for missing titles, duplicate titles and broken links. Add `--strict` to turn broken links into errors. The included GitHub Action (`.github/workflows/build-index.yml`) runs the builder on every push that changes Markdown and commits the regenerated `index.json` and `search.json`, so remember to `git pull` before your next local edit.

## How the app uses these files

- On open, the app downloads `index.json` (small) and compares its `rev` value with its saved copy. If it changed, saved pages are discarded and fetched again when opened.
- `search.json` (all page text) is downloaded the first time you search. Until then, search covers titles, tags, headings and summaries.
- Everything viewed is saved on the user's computer, so the wiki also opens offline.
