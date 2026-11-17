## Meny, fremdriftsvindu

oc-menu-check =
    .label = Kontroller for OSCOLA …
oc-progress-headline = Kontrollerer elementer for OSCOLA
oc-progress-item = Kontrollerer { $current } av { $total }: { $title }
oc-progress-none = Velg ett eller flere vanlige elementer (ikke notater eller vedlegg).
oc-progress-applied = Oppdaterte { $count ->
    [one] 1 element
   *[other] { $count } elementer
}.

## Gjennomgangsvindu

oc-dialog-window =
    .title = OSCOLA-kontroll
oc-dialog-intro = Kryss av endringene som skal tas i bruk. Ingenting endres før du klikker «Bruk valgte». Verdier hentet på nett bør kontrolleres mot kilden.
oc-dialog-apply =
    .label = Bruk valgte
oc-dialog-cancel =
    .label = Avbryt
oc-dialog-select-all =
    .label = Kryss av alle
oc-dialog-select-none =
    .label = Fjern alle kryss
oc-dialog-col-field = Felt
oc-dialog-col-current = Nå
oc-dialog-col-suggested = Forslag
oc-dialog-col-why = Hvorfor
oc-dialog-no-changes = Ingen endringer foreslått.
oc-dialog-no-issues = Ingen problemer funnet.
oc-dialog-empty-value = (tomt)
oc-dialog-type-change-note = Når elementtypen endres, flyttes felt. Kjør kontrollen på nytt etterpå.
oc-dialog-summary = { $items ->
    [one] 1 element
   *[other] { $items } elementer
} kontrollert · { $suggestions } foreslåtte endringer · { $issues } merknader

oc-severity-error = Feil
oc-severity-warning = Advarsel
oc-severity-info = Merknad

oc-field-creators = Opphavspersoner
oc-field-itemType = Elementtype

## Datakilder

oc-source-rules = OSCOLA-regler
oc-source-crossref = Crossref
oc-source-openalex = OpenAlex
oc-source-openlibrary = Open Library
oc-source-legislation-gov-uk = legislation.gov.uk
oc-source-find-case-law = Find Case Law (The National Archives)
oc-source-eur-lex = EUR-Lex
oc-source-hudoc = HUDOC (EMD)
oc-source-lovdata = Lovdata

## Begrunnelser for foreslåtte endringer

oc-reason-filled = Tomt felt fylt ut fra { $source }.
oc-reason-differs = { $source } har en annen verdi. Ikke avkrysset: sammenlign før du tar den i bruk.
oc-reason-extra = Identifikator fra { $source } lagres i Ekstra for senere oppslag.
oc-reason-whitespace = Fjerner overflødige mellomrom.
oc-reason-doi-normalise = DOI lagres uten «https://doi.org/» foran.
oc-reason-doi-from-url = DOI funnet i URL-en.
oc-reason-pages-prefix = OSCOLA bruker ikke «p»/«pp» foran sidetall.
oc-reason-full-stops = OSCOLA bruker ikke punktum i forkortelser.
oc-reason-edition-number = Stilen skriver utgaven som «2nd edn», så feltet skal bare inneholde tallet.
oc-reason-first-edition = OSCOLA oppgir ikke førsteutgave. Ikke avkrysset: fjern bare hvis dette virkelig er førsteutgaven.
oc-reason-item-type = Identifikatorene tyder på at dette er en { $type }. Ikke avkrysset: endring av type flytter felt.
oc-reason-statute-year-in-title = OSCOLA-stilen legger selv til årstallet ({ $year }) etter tittelen, så det ville stått to ganger.
oc-reason-statute-year-from-title = Årstall hentet fra tittelen.
oc-reason-si-number = Nummer på statutory instrument.
oc-reason-celex = CELEX-nummer lagres i Ekstra for oppslag.
oc-reason-ecli = ECLI lagres i Ekstra.
oc-reason-no-act-date = Dato hentet fra Lovdata-ID-en.
oc-reason-no-act-id = Lovdata-ID for loven.
oc-reason-no-act-title = Norsk siteringsform: «Lov [dato] nr. [nummer] om …». Ikke avkrysset: kontroller ordlyden.
oc-reason-case-name-v = OSCOLA skriver «v» uten punktum.
oc-reason-ncn-court = For den nøytrale referansen { $ncn } må feltet Domstol inneholde domstolskoden.
oc-reason-ncn-docket = For den nøytrale referansen { $ncn } må feltet Saksnummer inneholde nummeret.
oc-reason-ncn-year = Årstall hentet fra den nøytrale referansen.
oc-reason-report-split = Domssamlingsreferansen { $citation } er delt opp i Reporter, Reporter Volume og First Page slik at stilen kan skrive den ut.
oc-reason-square-volume = Uten nøytral referanse skriver stilen året i hakeparentes bare når Reporter Volume er tomt. Et bindnummer flyttes foran domssamlingen (f.eks. «1 WLR»).
oc-reason-citation-in-name = Referansen hører hjemme i egne felt, ikke i saksnavnet.
oc-reason-first-page = First Page skal bare inneholde første sidetall.
oc-reason-echr = OSCOLA-form for saker fra Den europeiske menneskerettsdomstolen.
oc-reason-echr-docket-with-report = Med en domssamlingsreferanse ville klagenummeret blitt skrevet som en nøytral referanse. Ikke avkrysset.
oc-reason-eu-case-prefix = OSCOLA setter saksnummeret først: «Case C-176/03 Commission v Council».
oc-reason-eu-docket = Saksnummeret står nå i saksnavnet. Blir det stående i Saksnummer, skriver stilen det ut som en nøytral referanse.
oc-reason-no-case = Norsk avgjørelse { $citation }.

## Merknader (problemer uten automatisk retting)

oc-issue-missing-field = «{ $field }» er tomt.
oc-issue-missing-creator = Ingen { $type } er oppgitt.
oc-issue-report-no-author = Rapporter trenger en forfatter eller en institusjon.
oc-issue-access-date = OSCOLA oppgir tilgangsdato for nettkilder («accessed 1 May 2024»).
oc-issue-item-type = Dette ser ut som en { $type }. OSCOLA-stilen formaterer det riktig bare med den elementtypen.
oc-issue-statute-year-mismatch = Året i tittelen ({ $titleYear }) er forskjellig fra vedtaksdatoen ({ $dateYear }).
oc-issue-si-number-not-printed = OSCOLA-stilen skriver ikke ut SI-nummeret. Legg det til i fotnoteteksten ved behov («…, SI 1998/3132»).
oc-issue-eu-oj-reference = OSCOLA siterer EU-regelverk med referanse til EU-tidende (f.eks. «[2016] OJ L119/1»). OSCOLA-stilen har ikke noe felt for dette.
oc-issue-no-act-year = OSCOLA-stilen legger til året etter tittelen, så norske titler som allerede inneholder datoen, viser året to ganger. Kontroller resultatet.
oc-issue-ncn-year-mismatch = Den nøytrale referansen { $ncn } har et annet år enn avgjørelsesdatoen ({ $year }).
oc-issue-case-no-citation = Fant verken nøytral referanse eller domssamlingsreferanse.
oc-issue-case-court = Uten nøytral referanse oppgir OSCOLA domstolen i parentes hvis den ikke går fram av domssamlingen.
oc-issue-echr-no-appno = Fant ikke klagenummer (f.eks. «App no 23452/94»).
oc-issue-echr-full-date = OSCOLA oppgir full dato for upubliserte EMD-avgjørelser.
oc-issue-eu-ecli = Fra 2012 skal EU-domstolens avgjørelser siteres med ECLI hvis de ikke står i ECR.
oc-issue-eu-court = OSCOLA navngir ikke domstolen for EU-saker i ECR. Stilen skriver feltet Domstol i parentes.
oc-issue-no-case-unrecognised = Fant ingen norsk avgjørelsesreferanse (f.eks. HR-2020-1234-A eller Rt. 2005 s. 1234). Norsk rettspraksis kan ikke hentes (Lovdata Pro).
oc-issue-source-failed = Fikk ikke kontakt med { $source }: { $error }
oc-issue-source-no-match = Fant ingenting i { $source }.
oc-issue-source-low-confidence = { $source } fant en lignende, men ikke samsvarende post. Ignorert.

## Innstillinger

oc-prefs-sources = Nettkilder
oc-prefs-sources-help = Kontrollen sender bare identifikatorer, titler og etternavn på forfattere til kildene som er avkrysset.
oc-prefs-email =
    .value = E-post for Crossrefs «polite pool» (valgfritt):
oc-prefs-email-help = Crossref svarer raskere når en e-postadresse er oppgitt. La feltet stå tomt for ikke å sende noen.
oc-prefs-source-crossref =
    .label = Crossref (tidsskriftartikler, bokkapitler)
oc-prefs-source-openalex =
    .label = OpenAlex (når Crossref ikke finner noe)
oc-prefs-source-openlibrary =
    .label = Open Library (bøker etter ISBN)
oc-prefs-source-legislation-gov-uk =
    .label = legislation.gov.uk (britisk lovgivning)
oc-prefs-source-find-case-law =
    .label = Find Case Law (britiske dommer, fra ca. 2001)
oc-prefs-source-eur-lex =
    .label = EUR-Lex (EU-regelverk og EU-domstolens saker)
oc-prefs-source-hudoc =
    .label = HUDOC (Den europeiske menneskerettsdomstolen)
oc-prefs-source-lovdata =
    .label = Lovdata (norske lover og forskrifter, åpne sider)
