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
oc-source-un-digital-library = FNs digitale bibliotek (UN Digital Library)
oc-source-untc = FNs traktatsamling (UN Treaty Collection)
oc-source-icj = Den internasjonale domstolen (ICJ)

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
oc-reason-title-citation = Hele referansen stod i Tittel-feltet; forfatter, tittel og dato skal i egne felt.
oc-reason-un-resolution-title = Fant ingen tittel på nett; resolusjoner siteres med nummer, så dette er nok.
oc-reason-extended = { $source } utvider den nåværende verdien.
oc-reason-un-doc-type = FN-dokumenter siteres med «UN Doc» og dokumentsymbolet.
oc-reason-un-symbol = FN-dokumentets symbol.
oc-reason-un-institution = OSCOLA oppgir organet som utgav dokumentet som forfatter, ikke «United Nations» som utgiver.
oc-reason-un-body = OSCOLA-forkortelse for organet: { $body }.
oc-reason-un-resolution = Resolusjonsnummer ({ $number }), slik at den tilpassede OSCOLA-stilen kan skrive «Res { $number }».
oc-reason-treaty-type = Merker elementet som en traktat, slik at stilen formaterer det som en.
oc-reason-treaty-series = Traktatsamlingsreferansen { $citation } er delt opp i Code, Code Number og Pages (eller Public Law Number).
oc-reason-icj-report = ICJ Reports-referansen { $citation } er delt opp i Reporter, First Page og år.
oc-reason-icj-court = OSCOLA navngir ikke domstolen for ICJ-avgjørelser. Stilen ville skrevet den ut.

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
oc-issue-no-lookup = Ingenting i dette elementet kunne slås opp på nett. Legg til en identifikator, som DOI, ISBN, FN-dokumentsymbol (f.eks. A/RES/70/1 eller CCPR/C/GC/36), nøytral referanse eller Lovdata-ID, og kjør kontrollen på nytt.
oc-issue-un-no-symbol = Fant ikke FN-dokumentsymbol (f.eks. A/HRC/43/52). OSCOLA siterer FN-dokumenter med «UN Doc» og symbolet. Legg det inn i Report Number.
oc-issue-un-gc-not-listed = Generell kommentar/anbefaling nr. { $number } har ikke et eget FN-dokument. Eldre kommentarer ble publisert i komiteens årsrapport eller i samlingen HRI/GEN/1/Rev.9. Legg det symbolet inn i Report Number.
oc-issue-un-ambiguous = Flere FN-dokumenter har denne tittelen ({ $symbols }). Legg inn året i Dato, eller dokumentsymbolet i Report Number, og kjør kontrollen på nytt.
oc-issue-un-personal-author = OSCOLA siterer FN-dokumenter med organet som utgav dem ({ $body }), ikke med personlige forfattere som en spesialrapportør.
oc-issue-intl-style = For helt riktig OSCOLA-format, bruk stilen «OSCOLA (international materials)» (Innstillinger → OSCOLA Check). Den vanlige OSCOLA-stilen skriver dette elementet litt annerledes.
oc-issue-treaty-series = Fant ingen traktatsamlingsreferanse (f.eks. «1465 UNTS 85» eller «ETS 5»).
oc-issue-treaty-adopted = Vedtaksdatoen (Date Enacted) mangler.
oc-issue-treaty-eif = Ingen ikrafttredelsesdato. Legg til en linje «event-date: ÅÅÅÅ-MM-DD» i Ekstra hvis traktaten er i kraft.
oc-issue-icj-no-report = Fant ingen ICJ Reports-referanse. Legg til Reporter «ICJ Rep» og første side når avgjørelsen er publisert i ICJ Reports.
oc-issue-icj-phase = OSCOLA legger til fasen etter saksnavnet, f.eks. «(Merits)», «(Preliminary Objections)» eller «(Advisory Opinion)».
oc-issue-icj-several = Saken har flere avgjørelser: { $dates }. Skriv året i avgjørelsesdatoen og kjør kontrollen på nytt.

## Filer uten element

oc-progress-file = Leser fil { $current } av { $total }: { $file }
oc-dialog-new-item = Nytt element for filen «{ $file }»
oc-dialog-new-item-help = Filen har ikke noe Zotero-element ennå. Kryss av feltene for det nye elementet; «Elementtype» må være avkrysset for at elementet skal opprettes. Filen legges deretter under det nye elementet.
oc-source-file = Filen
oc-source-zotero = Zoteros egen gjenkjenning
oc-reason-new-item = Identifisert fra filen: { $via }.
oc-reason-new-item-draft = Filen kunne ikke identifiseres på nett. Ikke avkrysset: kontroller feltene først.
oc-reason-from-file = Lest fra filen.
oc-reason-from-zotero = Funnet av Zoteros egen gjenkjenning (som i «Hent metadata for PDF»).
oc-issue-file-no-text = Ingen tekst kunne leses fra filen. Den kan være en skanning uten tekstgjenkjenning (OCR).
oc-issue-file-not-identified = Filen kunne ikke identifiseres. Det foreslåtte elementet er bygd fra de første linjene i teksten, og ingenting er avkrysset: kontroller og kryss av det som stemmer, eller legg inn elementet manuelt.

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
oc-prefs-source-un-digital-library =
    .label = FNs digitale bibliotek (FN-resolusjoner og -dokumenter)
oc-prefs-source-untc =
    .label = FNs traktatsamling (multilaterale traktater)
oc-prefs-source-icj =
    .label = Den internasjonale domstolen (dommer og rådgivende uttalelser)
oc-prefs-style = Siteringsstil for internasjonale kilder
oc-prefs-style-help = Den vanlige OSCOLA-stilen kan ikke skrive FN-resolusjoner («UNGA Res 70/1 (25 September 2015) UN Doc A/RES/70/1») eller traktater («(adopted …, entered into force …) 1465 UNTS 85») slik OSCOLA krever. Den tilpassede stilen «OSCOLA 4th edition (international materials)» gjør det. Alt annet skrives nøyaktig som med den vanlige stilen.
oc-prefs-style-install =
    .label = Installer den tilpassede OSCOLA-stilen …
