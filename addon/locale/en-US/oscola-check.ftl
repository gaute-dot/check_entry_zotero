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
