## Menu, progress window

oc-menu-check =
    .label = Check for OSCOLA…
oc-progress-headline = Checking items for OSCOLA
oc-progress-item = Checking { $current } of { $total }: { $title }
oc-progress-none = Select one or more regular items (not notes or attachments).
oc-progress-applied = Updated { $count ->
    [one] 1 item
   *[other] { $count } items
}.

## Review dialog

oc-dialog-window =
    .title = OSCOLA check
oc-dialog-intro = Tick the changes to apply. Nothing is changed until you click “Apply selected”. Values fetched online should be checked against the source.
oc-dialog-apply =
    .label = Apply selected
oc-dialog-cancel =
    .label = Cancel
oc-dialog-select-all =
    .label = Tick all
oc-dialog-select-none =
    .label = Untick all
oc-dialog-col-field = Field
oc-dialog-col-current = Current
oc-dialog-col-suggested = Suggested
oc-dialog-col-why = Why
oc-dialog-no-changes = No changes suggested.
oc-dialog-no-issues = No problems found.
oc-dialog-empty-value = (empty)
oc-dialog-type-change-note = Changing the item type moves fields around. Run the check again afterwards.
oc-dialog-summary = { $items ->
    [one] 1 item
   *[other] { $items } items
} checked · { $suggestions } suggested changes · { $issues } notes

oc-severity-error = Error
oc-severity-warning = Warning
oc-severity-info = Note

oc-field-creators = Creators
oc-field-itemType = Item type

## Data sources

oc-source-rules = OSCOLA rules
oc-source-crossref = Crossref
oc-source-openalex = OpenAlex
oc-source-openlibrary = Open Library
oc-source-legislation-gov-uk = legislation.gov.uk
oc-source-find-case-law = Find Case Law (The National Archives)
oc-source-eur-lex = EUR-Lex
oc-source-hudoc = HUDOC (ECtHR)
oc-source-lovdata = Lovdata
oc-source-un-digital-library = UN Digital Library
oc-source-untc = UN Treaty Collection
oc-source-icj = International Court of Justice

## Reasons for suggested changes

oc-reason-filled = Empty field filled from { $source }.
oc-reason-differs = { $source } has a different value. Not ticked: compare before applying.
oc-reason-extra = Identifier from { $source } kept in Extra for later look-ups.
oc-reason-whitespace = Removes extra spaces.
oc-reason-doi-normalise = DOI stored without the “https://doi.org/” prefix.
oc-reason-doi-from-url = DOI found in the URL.
oc-reason-pages-prefix = No “p”/“pp” before page numbers in OSCOLA.
oc-reason-full-stops = OSCOLA uses no full stops in abbreviations.
oc-reason-edition-number = The style prints the edition as “2nd edn”, so the field must contain only the number.
oc-reason-first-edition = OSCOLA does not cite the first edition. Not ticked: only remove it if this really is the first edition.
oc-reason-item-type = The identifiers suggest this is a { $type }. Not ticked: changing the type moves fields.
oc-reason-statute-year-in-title = The OSCOLA style adds the year ({ $year }) after the title itself, so it would appear twice.
oc-reason-statute-year-from-title = Year taken from the title.
oc-reason-si-number = Statutory instrument number.
oc-reason-celex = CELEX number kept in Extra for look-ups.
oc-reason-ecli = ECLI kept in Extra.
oc-reason-no-act-date = Date taken from the Lovdata ID.
oc-reason-no-act-id = Lovdata ID of the act.
oc-reason-no-act-title = Norwegian citation form: “Lov [date] nr. [number] om …”. Not ticked: check the wording.
oc-reason-case-name-v = OSCOLA writes “v”, without a full stop.
oc-reason-ncn-court = For the neutral citation { $ncn } the Court field must hold the court code.
oc-reason-ncn-docket = For the neutral citation { $ncn } the Docket Number field must hold the number.
oc-reason-ncn-year = Year taken from the neutral citation.
oc-reason-report-split = Law report citation { $citation } split into Reporter, Reporter Volume and First Page so the style can print it.
oc-reason-square-volume = Without a neutral citation the style prints the year in square brackets only when Reporter Volume is empty. A volume number moves in front of the reporter (e.g. “1 WLR”).
oc-reason-citation-in-name = The citation belongs in its own fields, not in the case name.
oc-reason-first-page = First Page should hold only the first page number.
oc-reason-echr = OSCOLA form for European Court of Human Rights cases.
oc-reason-echr-docket-with-report = With a report citation the application number would be printed as a neutral citation. Not ticked.
oc-reason-eu-case-prefix = OSCOLA puts the case number first: “Case C-176/03 Commission v Council”.
oc-reason-eu-docket = The case number is now in the case name. If it stays in Docket Number the style prints it as a neutral citation.
oc-reason-no-case = Norwegian case { $citation }.
oc-reason-title-citation = The whole citation was in the Title field; author, title and date go in their own fields.
oc-reason-un-resolution-title = No title found online; resolutions are cited by number, so this is enough.
oc-reason-extended = { $source } adds to the current value.
oc-reason-un-doc-type = UN documents are cited with “UN Doc” and the document symbol.
oc-reason-un-symbol = The UN document symbol.
oc-reason-un-institution = OSCOLA names the issuing body as author, not “United Nations” as publisher.
oc-reason-un-body = OSCOLA abbreviation of the issuing body: { $body }.
oc-reason-un-resolution = Resolution number ({ $number }), so the adjusted OSCOLA style can print “Res { $number }”.
oc-reason-treaty-type = Marks the item as a treaty, so the style formats it as one.
oc-reason-treaty-series = Treaty series reference { $citation } split into Code, Code Number and Pages (or Public Law Number).
oc-reason-icj-report = ICJ Reports citation { $citation } split into Reporter, First Page and year.
oc-reason-icj-court = OSCOLA does not name the court for ICJ decisions. The style would print it.

## Notes (problems without an automatic fix)

oc-issue-missing-field = “{ $field }” is empty.
oc-issue-missing-creator = No { $type } entered.
oc-issue-report-no-author = Reports need an author or an institution.
oc-issue-access-date = OSCOLA gives an access date for online sources (“accessed 1 May 2024”).
oc-issue-item-type = This looks like a { $type }. The OSCOLA style formats it correctly only with that item type.
oc-issue-statute-year-mismatch = The year in the title ({ $titleYear }) differs from Date Enacted ({ $dateYear }).
oc-issue-si-number-not-printed = The OSCOLA style does not print the SI number. Add it to the note text if needed (“…, SI 1998/3132”).
oc-issue-eu-oj-reference = OSCOLA cites EU legislation with its Official Journal reference (e.g. “[2016] OJ L119/1”). The OSCOLA style has no field for it.
oc-issue-no-act-year = The OSCOLA style adds the year after the title, so Norwegian titles that already contain the date show the year twice. Check the output.
oc-issue-ncn-year-mismatch = The neutral citation { $ncn } has a different year from Date Decided ({ $year }).
oc-issue-case-no-citation = No neutral citation or law report citation found.
oc-issue-case-court = Without a neutral citation OSCOLA gives the court in brackets if the report series does not make it clear.
oc-issue-echr-no-appno = No application number found (e.g. “App no 23452/94”).
oc-issue-echr-full-date = OSCOLA gives the full date for unreported ECtHR judgments.
oc-issue-eu-ecli = From 2012 onwards, cite CJEU cases by ECLI if they are not in the ECR.
oc-issue-eu-court = OSCOLA does not name the court for CJEU cases reported in the ECR. The style prints the Court field in brackets.
oc-issue-no-case-unrecognised = No Norwegian case reference recognised (e.g. HR-2020-1234-A or Rt. 2005 s. 1234). Norwegian case law cannot be fetched (Lovdata Pro).
oc-issue-source-failed = Could not reach { $source }: { $error }
oc-issue-source-no-match = Nothing found in { $source }.
oc-issue-source-low-confidence = { $source } found a similar but not matching record. Ignored.
oc-issue-no-lookup = Nothing in this item could be looked up online. Add an identifier, such as a DOI, ISBN, UN document symbol (e.g. A/RES/70/1 or CCPR/C/GC/36), neutral citation or Lovdata ID, and run the check again.
oc-issue-un-no-symbol = No UN document symbol found (e.g. A/HRC/43/52). OSCOLA cites UN documents with “UN Doc” and the symbol. Add it in Report Number.
oc-issue-un-gc-not-listed = General comment/recommendation no. { $number } has no separate UN document. Older ones were published in the committee's annual report or in the compilation HRI/GEN/1/Rev.9. Add that symbol in Report Number.
oc-issue-un-ambiguous = Several UN documents have this title ({ $symbols }). Add the year in Date, or the document symbol in Report Number, and run the check again.
oc-issue-un-personal-author = OSCOLA cites UN documents by the issuing body ({ $body }), not by personal authors such as a Special Rapporteur.
oc-issue-intl-style = For exactly correct OSCOLA output, use the “OSCOLA (international materials)” style (Settings → OSCOLA Check). The standard OSCOLA style prints this item slightly differently.
oc-issue-treaty-series = No treaty series found (e.g. “1465 UNTS 85” or “ETS 5”).
oc-issue-treaty-adopted = The adoption date (Date Enacted) is missing.
oc-issue-treaty-eif = No entry-into-force date. Add a line “event-date: YYYY-MM-DD” to Extra if the treaty is in force.
oc-issue-icj-no-report = No ICJ Reports citation found. Add Reporter “ICJ Rep” and the first page when the decision is published in the ICJ Reports.
oc-issue-icj-phase = OSCOLA adds the phase after the case name, e.g. “(Merits)”, “(Preliminary Objections)” or “(Advisory Opinion)”.
oc-issue-icj-several = The case has several decisions: { $dates }. Enter the year in Date Decided and run the check again.

## Files without an item

oc-progress-file = Reading file { $current } of { $total }: { $file }
oc-dialog-new-item = New item for the file “{ $file }”
oc-dialog-new-item-help = The file has no Zotero item yet. Tick the fields for the new item; “Item type” must be ticked for the item to be created. The file is then placed under the new item.
oc-source-file = The file
oc-source-zotero = Zotero's own recognition
oc-reason-new-item = Identified from the file: { $via }.
oc-reason-new-item-draft = The file could not be identified online. Not ticked: check the fields first.
oc-reason-from-file = Read from the file.
oc-reason-from-zotero = Found by Zotero's own recognition (as in “Retrieve Metadata for PDF”).
oc-issue-basics-guessed = Some values were guessed from the text of the file (not found online). Check title, author and year before applying.
oc-issue-basics-missing = Still missing after reading more of the file and searching online: { $fields }. Fill these in by hand.
oc-reason-basics-guessed = Guessed from the item's PDF (not found online). Check before applying.
oc-issue-basics-guessed-item = Title, author or year was missing; some values were guessed from the item's PDF. Check them before applying.
oc-issue-file-no-text = No text could be read from the file. It may be a scan without text recognition (OCR).
oc-issue-file-not-identified = The file could not be identified. The proposed item is built from the first lines of the text and nothing is ticked: check and tick what is correct, or add the item by hand.

## Preferences

oc-prefs-sources = Online sources
oc-prefs-sources-help = The check only sends identifiers, titles and author surnames to the sources that are ticked.
oc-prefs-email =
    .value = E-mail for Crossref’s “polite pool” (optional):
oc-prefs-email-help = Crossref answers faster when an e-mail address is given. Leave empty to send none.
oc-prefs-source-crossref =
    .label = Crossref (journal articles, chapters)
oc-prefs-source-openalex =
    .label = OpenAlex (when Crossref has nothing)
oc-prefs-source-openlibrary =
    .label = Open Library (books by ISBN)
oc-prefs-source-legislation-gov-uk =
    .label = legislation.gov.uk (UK legislation)
oc-prefs-source-find-case-law =
    .label = Find Case Law (UK judgments, about 2001 onwards)
oc-prefs-source-eur-lex =
    .label = EUR-Lex (EU legislation and CJEU cases)
oc-prefs-source-hudoc =
    .label = HUDOC (European Court of Human Rights)
oc-prefs-source-lovdata =
    .label = Lovdata (Norwegian acts and regulations, public pages)
oc-prefs-source-un-digital-library =
    .label = UN Digital Library (UN resolutions and documents)
oc-prefs-source-untc =
    .label = UN Treaty Collection (multilateral treaties)
oc-prefs-source-icj =
    .label = International Court of Justice (judgments and advisory opinions)
oc-prefs-style = Citation style for international materials
oc-prefs-style-help = The standard OSCOLA style cannot print UN resolutions (“UNGA Res 70/1 (25 September 2015) UN Doc A/RES/70/1”) or treaties (“(adopted …, entered into force …) 1465 UNTS 85”) exactly as OSCOLA requires. The adjusted style “OSCOLA 4th edition (international materials)” does. Everything else is printed exactly as by the standard style.
oc-prefs-style-install =
    .label = Install the adjusted OSCOLA style…
