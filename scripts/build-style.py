#!/usr/bin/env python3
"""
Builds styles/oscola-international.csl from the official Zotero OSCOLA style.

The official style is downloaded (or read from the path given as the first
argument) and patched so that it prints, exactly as OSCOLA requires:

  UN resolutions   UNGA Res 70/1 (25 September 2015) UN Doc A/RES/70/1
                   (Report items with Series Title "Res" and Series Number "70/1")
  Treaties         Convention against Torture ... (adopted 10 December 1984,
                   entered into force 26 June 1987) 1465 UNTS 85
                   (Extra "Type: treaty"; entry into force in Extra "event-date:")

Everything else is printed exactly as by the official style. Re-run this
script when the official style is updated:
  python3 scripts/build-style.py
"""
import sys
import urllib.request

SRC = "https://raw.githubusercontent.com/citation-style-language/styles/master/oscola.csl"
OUT = "styles/oscola-international.csl"

if len(sys.argv) > 1:
    csl = open(sys.argv[1], encoding="utf-8").read()
else:
    csl = urllib.request.urlopen(SRC, timeout=60).read().decode("utf-8")


def replace_once(text, old, new):
    count = text.count(old)
    if count != 1:
        sys.exit(f"Expected exactly one match, found {count}, for:\n{old}\nThe official style has changed; update this script.")
    return text.replace(old, new)


# ---- info block: a separate style with its own ID, crediting the original
csl = replace_once(csl, "<title>OSCOLA 4th edition</title>", "<title>OSCOLA 4th edition (international materials)</title>")
csl = replace_once(
    csl,
    '<id>http://www.zotero.org/styles/oscola</id>\n    <link href="http://www.zotero.org/styles/oscola" rel="self"/>',
    '<id>https://github.com/gaute-dot/check_entry_zotero/styles/oscola-international</id>\n'
    '    <link href="https://github.com/gaute-dot/check_entry_zotero/styles/oscola-international" rel="self"/>\n'
    '    <link href="http://www.zotero.org/styles/oscola" rel="template"/>',
)
csl = replace_once(
    csl,
    "<summary>Oxford University Standard for Citation of Legal Authorities, notes system.",
    "<summary>Variant of the OSCOLA 4th edition style by the OSCOLA Check plugin: prints UN resolutions "
    "(“UNGA Res 70/1 (date) UN Doc A/RES/70/1”) and treaties (“(adopted …, entered into force …) "
    "1465 UNTS 85”) as OSCOLA requires. Oxford University Standard for Citation of Legal Authorities, notes system.",
)

# ---- treaties are not italicised in OSCOLA
csl = csl.replace('<if match="any" type="book motion_picture treaty">', '<if match="any" type="book motion_picture">')
csl = csl.replace('<else-if match="any" type="bill legislation">', '<else-if match="any" type="bill legislation treaty">')

# ---- new macros, inserted before the citation
MACROS = """  <!-- OSCOLA Check: international materials -->
  <macro name="un-resolution">
    <group delimiter=" ">
      <names variable="author">
        <name initialize="false"/>
      </names>
      <text variable="collection-title"/>
      <text variable="collection-number"/>
    </group>
  </macro>
  <macro name="un-resolution-full">
    <group delimiter=" ">
      <text macro="un-resolution"/>
      <date form="text" prefix="(" suffix=")" variable="issued"/>
      <text variable="genre"/>
      <text variable="number"/>
    </group>
  </macro>
  <macro name="treaty-full">
    <group delimiter=" ">
      <text variable="title"/>
      <group delimiter=", " prefix="(" suffix=")">
        <group delimiter=" ">
          <text value="adopted"/>
          <date form="text" variable="issued"/>
        </group>
        <group delimiter=" ">
          <text value="entered into force"/>
          <date form="text" variable="event-date"/>
        </group>
      </group>
      <choose>
        <if variable="volume">
          <group delimiter=" ">
            <text variable="volume"/>
            <text variable="container-title"/>
            <text variable="page"/>
          </group>
        </if>
        <else>
          <group delimiter=" ">
            <text variable="container-title"/>
            <text variable="number"/>
          </group>
        </else>
      </choose>
      <text variable="genre"/>
    </group>
  </macro>
  <citation>"""
csl = replace_once(csl, "  <citation>", MACROS)

# ---- subsequent notes: "UNGA Res 70/1 (n 3) para 2"
csl = replace_once(
    csl,
    """        <else-if position="subsequent">
          <choose>
            <if match="any" type="bill hearing legal_case legislation regulation treaty">""",
    """        <else-if position="subsequent">
          <choose>
            <if match="all" type="report" variable="collection-number">
              <group delimiter=" ">
                <text macro="un-resolution"/>
                <text macro="label-first-reference-note-number" prefix="(" suffix=")"/>
                <text macro="label-locator-all"/>
              </group>
            </if>
            <else-if match="any" type="bill hearing legal_case legislation regulation treaty">""",
)
# the opening <if> became <else-if>: its matching </if> must become </else-if>
marker = """                <text macro="label-locator"/>
              </group>
            </if>
            <else>
              <!--general whole citation -->"""
csl = replace_once(
    csl,
    marker,
    """                <text macro="label-locator"/>
              </group>
            </else-if>
            <else>
              <!--general whole citation -->""",
)

# ---- first (full) notes
FULL_START = """        <else>
          <group delimiter=" ">
            <group delimiter=", ">
              <group delimiter=" ">
                <group delimiter=", ">
                  <text macro="author-note"/>"""
csl = replace_once(
    csl,
    FULL_START,
    """        <else>
          <choose>
            <if match="all" type="report" variable="collection-number">
              <group delimiter=", ">
                <text macro="un-resolution-full"/>
                <text macro="label-locator-all"/>
              </group>
            </if>
            <else-if type="treaty">
              <group delimiter=", ">
                <text macro="treaty-full"/>
                <text macro="label-locator-all"/>
              </group>
            </else-if>
            <else>
          <group delimiter=" ">
            <group delimiter=", ">
              <group delimiter=" ">
                <group delimiter=", ">
                  <text macro="author-note"/>""",
)
csl = replace_once(
    csl,
    """            <text macro="URL"/>
          </group>
        </else>
      </choose>
    </layout>
  </citation>""",
    """            <text macro="URL"/>
          </group>
            </else>
          </choose>
        </else>
      </choose>
    </layout>
  </citation>""",
)

# ---- bibliography
csl = replace_once(
    csl,
    """    <layout>
      <group delimiter=" ">
        <group delimiter=", ">
          <group delimiter=" ">
            <group delimiter=", ">
              <text macro="author-bib"/>""",
    """    <layout>
      <choose>
        <if match="all" type="report" variable="collection-number">
          <text macro="un-resolution-full"/>
        </if>
        <else-if type="treaty">
          <text macro="treaty-full"/>
        </else-if>
        <else>
      <group delimiter=" ">
        <group delimiter=", ">
          <group delimiter=" ">
            <group delimiter=", ">
              <text macro="author-bib"/>""",
)
csl = replace_once(
    csl,
    """        <text macro="URL"/>
      </group>
    </layout>
  </bibliography>""",
    """        <text macro="URL"/>
      </group>
        </else>
      </choose>
    </layout>
  </bibliography>""",
)

open(OUT, "w", encoding="utf-8").write(csl)
print(f"Wrote {OUT}")
