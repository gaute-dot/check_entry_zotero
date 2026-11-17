# OSCOLA Check for Zotero

A Zotero plugin that checks items against the requirements of OSCOLA (the Oxford University Standard for Citation of Legal Authorities). It looks up missing metadata in online legal and academic sources and **suggests** changes. Nothing is changed until you tick a suggestion and click **Apply selected**.

The interface is available in English and Norwegian (Bokmål). It follows Zotero's language setting.

> *Norsk:* Et tillegg til Zotero som kontrollerer elementer mot OSCOLA, henter manglende metadata fra nettkilder og foreslår endringer. Ingenting endres før du krysser av og klikker «Bruk valgte».

## Requirements

- Zotero 8 or later. The plugin uses the menu API introduced in Zotero 8.
- The **OSCOLA 4th edition** citation style installed in Zotero (Settings → Cite → Styles → Get Additional Styles). The rules are written to match how this style prints each field.

## Installation

1. Build the plugin (see [Development](#development)) or download `oscola-check-<version>.xpi` from a release.
2. In Zotero: **Tools → Plugins → ⚙ → Install Plugin From File…** and choose the `.xpi` file.

## Usage

1. Select one or more items in your library.
2. Right-click and choose **Check for OSCOLA…**
3. The review window lists, for each item:
   - **Notes:** problems that cannot be fixed automatically (missing fields, year mismatches, limits of the style).
   - **Suggested changes:** each with the current value, the suggested value, the reason and the source.
     - Most rule-based fixes, and empty fields filled from an online source, start ticked.
     - Values that would *overwrite* something you entered start unticked. Online values that differ from yours appear as an extra row under the same field. Only one row per field can be ticked.
     - A suggested item type change always starts unticked. After changing the item type, run the check again.
4. Click **Apply selected**.

Settings (**Zotero Settings → OSCOLA Check**):
- Turn individual online sources on or off.
- Optionally give an e-mail address for Crossref's "polite pool" (faster responses). None is sent by default.

## Data sources

| Source | Used for | Looked up by |
|---|---|---|
| [Crossref](https://api.crossref.org) | Journal articles, book chapters, books with a DOI | DOI, or title + first author for articles |
| [OpenAlex](https://openalex.org) | Fallback when Crossref returns nothing | DOI |
| [Open Library](https://openlibrary.org) | Books, edited books | ISBN |
| [legislation.gov.uk](https://www.legislation.gov.uk) | UK Acts and statutory instruments | URL, SI number, or title + year |
| [Find Case Law](https://caselaw.nationalarchives.gov.uk) (The National Archives) | UK judgments, roughly 2001 onwards | Neutral citation, or exact case name |
| [EUR-Lex](https://eur-lex.europa.eu) (Publications Office SPARQL endpoint) | EU legislation and CJEU/General Court cases | CELEX, case number (C-/T-), ECLI |
| [HUDOC](https://hudoc.echr.coe.int) | European Court of Human Rights | Application number |
| [Lovdata](https://lovdata.no) (public pages) | Norwegian acts and regulations | Lovdata ID, URL, or "lov 17. juni 2005 nr. 62" |

Search results are only used when the title matches closely and, where the item has an author, the first author's surname matches. Weaker matches are reported as a note and ignored.

**What is sent:** identifiers (DOI, ISBN, CELEX, citation), titles and first-author surnames, and only to the sources that are switched on.

## How the fields must be filled in for OSCOLA

The OSCOLA style in Zotero decides what to print from which fields. The plugin applies these conventions:

| Material | Convention | Example |
|---|---|---|
| UK case with neutral citation | Court = court code, Docket Number = number (with division) | Court `EWHC`, Docket `456 (Ch)` → `[2018] EWHC 456 (Ch)` |
| …plus a law report | Reporter Volume carries the bracketed year | Volume `[2015] 1`, Reporter `WLR` |
| Case without neutral citation, year-ordered series | Reporter Volume **empty**; any volume number goes in front of the reporter | Reporter `1 WLR` → `[1990] 1 WLR 358` |
| Case without neutral citation, numbered series | Reporter Volume = volume | `(1998) 29 EHRR 245` |
| Case name | "v" without a full stop; no citation inside the name | `Donoghue v Stevenson` |
| CJEU case | Case number first in the name; Docket Number empty | `Case C-176/03 Commission v Council` |
| ECtHR case | Court `ECtHR`, Docket Number `App no 23452/94` (when unreported) | |
| UK statute | Title **without** the year (the style adds it from Date Enacted) | `Equality Act` + 2010 |
| Book edition | Number only (the style prints "2nd edn"); first editions are not cited | `2` |
| Norwegian Act | `Lov [date] nr. [n] om …`, Lovdata ID in Public Law Number | `Lov 17. juni 2005 nr. 62 om arbeidsmiljø …` |
| Norwegian case | `HR-2020-1234-A (popular name)` as the case name; Rt. as reporter | `Rt` + first page `1234` |

## Known limitations

- **Norwegian case law cannot be fetched.** Høyesterett and lagmannsrett decisions are only available through Lovdata Pro. The plugin recognises and tidies `HR-…-A` and `Rt. … s. …` references but cannot look them up.
- **The OSCOLA style has no fields for some OSCOLA elements:** SI numbers, Official Journal references for EU legislation, and the date format OSCOLA expects for Norwegian legislation. The plugin flags these instead of guessing.
- **BAILII is not used.** It has no official API and its terms restrict automated access.
- **HUDOC's API is unofficial** and may change without notice.
- **Lovdata's public pages are parsed as HTML.** Check Lovdata's terms of use before relying on this source, and switch it off in the settings if needed. Only one page is fetched per item, and only when you run a check.
- **Not yet tested live:** the response formats for legislation.gov.uk, Find Case Law, EUR-Lex, HUDOC and Lovdata were written from their documentation and tested against sample responses (`test/fixtures`). The development environment could not reach these services. If a source changes its format, the check shows *"Could not reach …"* or *"Nothing found in …"* for that source and carries on with the others.

## Development

```bash
npm install
```

```bash
npm run check      # type-check, unit tests, build
```

```bash
npm run build      # build/oscola-check-<version>.xpi
```

Layout:

```
addon/                 static plugin files (manifest, bootstrap, dialog, prefs, locales)
src/core/              rules engine, citation parsers, change model (no Zotero dependency)
src/resolvers/         one resolver per online source
src/zotero/            Zotero glue: menu, item read/write, review dialog
test/                  unit tests (vitest) and sample API responses
```

The core is plain TypeScript and runs in Node, so all rules and resolvers are unit-tested without Zotero. To add a rule, edit `src/core/rules.ts` and add its message to **both** locale files (`addon/locale/en-US` and `addon/locale/nb-NO`). A test fails if a message is missing in either language.

For a quick development loop, use a separate Zotero profile and point a proxy file at `build/addon`. See Zotero's plugin development documentation.

### Releasing

1. Bump `version` in `package.json`.
2. Run `npm run build`.
3. Attach the `.xpi` to a GitHub release tagged `v<version>`.
4. Add the version to `updates.json`. Zotero checks that file for updates.
