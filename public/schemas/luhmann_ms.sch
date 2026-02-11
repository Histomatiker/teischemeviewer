<?xml version="1.0" encoding="UTF-8"?>
<schema xmlns="http://purl.oclc.org/dsdl/schematron" queryBinding="xslt2">
	<ns prefix="tei" uri="http://www.tei-c.org/ns/1.0"/>
	<let name="zk" value="/tei:TEI[@rendition = 'luhmann_zettel']"/>
	<let name="dummy" value="/tei:TEI[@rendition = 'luhmann_zettel' and //tei:idno[@type='dir-zettelkasten'][matches(.,'0')]]"/>
	
	<pattern id="fileName">
		<rule context="/">
			<let name="fileName_ohneExt" value="substring-before(tokenize(document-uri(/), '/')[last()],'.xml')"/>
			<let name="fileName_Ext" value="tokenize(document-uri(/), '/')[last()]"/>
			<let name="fileID_ohneExt" value="descendant::tei:idno[@type='file_location']/@n"/>
			<let name="fileID_Ext" value="descendant::tei:idno[@type='file-in-dir-batch']/text()"/>
			<assert test="$fileID_ohneExt = $fileName_ohneExt">Dateiname "<value-of select="$fileName_ohneExt"/>" und Datei-ID (ohne Endung) "<value-of select="$fileID_ohneExt"/>" stimmen nicht überein.</assert>
			<assert test="$fileID_Ext = $fileName_Ext">Dateiname "<value-of select="$fileName_Ext"/>" und Datei-ID (mit Endung) "<value-of select="$fileID_Ext"/>" stimmen nicht überein.</assert>
			
			
		</rule>
	</pattern>
	<!-- QM Kleine Fehlerquellen -->
	<pattern id="unusual-characters">
		<rule context="tei:text//*">
			<report test="text()[contains(., '  ')]" role="ERROR">Doppeltes Leerzeichen vorhanden - //text/descendant::text()[contains(.,'  ')]</report>
			<report test="text()[contains(., ' ff.')][not(preceding-sibling::*[1][self::tei:ref])]" role="Warning">Vor ff. soll kein Leerzeichen gesetzt werden - //text/descendant::text()[contains(.,' ff.')]</report>
			<report test="text()[contains(., ' f.')][not(preceding-sibling::*[1][self::tei:ref])]" role="Warning">Vor f. soll kein Leerzeichen gesetzt werden - //text/descendant::text()[contains(.,' f.')]</report>
		</rule>
	</pattern>
	<!-- Leerzeichenfehler -->
	<pattern id="semikolon-leerzeichen">
		<rule context="tei:p/text()">
			<report test="matches(., ';[^\s]')">Auf Semikolon soll ein Leerzeichen folgen - //text/descendant::text()[contains(.,';')]</report>
		</rule>
	</pattern>
	<pattern id="hi-sup-leerzeichen">
		<rule context="tei:hi[@rendition = '#sup']">
			<report test="preceding::node()[1][ends-with(., ' ')]" role="warning">Bitte prüfen: Leerzeichen steht vor hi[@rendition='#sup'], sollte aber i.d.R. danach stehen</report>
		</rule>
	</pattern>
	<pattern id="lb-leerzeichen">
		<rule context="tei:lb">
			<report test="preceding::node()[1][ends-with(., ' ')]">Leerzeichen steht fälschlicherweise vor lb</report>
			<report test="following-sibling::node()[1][starts-with(., ' ')]">Leerzeichen steht fälschlicherweise nach lb</report>
		</rule>
	</pattern>
	<pattern id="pb-leerzeichen">
		<rule context="tei:pb">
			<report test="preceding::node()[1][ends-with(., ' ')]">Leerzeichen steht fälschlicherweise vor pb</report>
			<report test="following-sibling::node()[1][starts-with(., ' ')]">Leerzeichen steht fälschlicherweise nach pb</report>
		</rule>
	</pattern>
	<pattern id="luhmann-wichtig_fraglich-leerzeichen">
		<rule context="tei:anchor[following-sibling::node()]">
			<assert test="following-sibling::node()[1][starts-with(., ' ') or starts-with(.,',') or starts-with(.,'.') or starts-with(.,';') or starts-with(.,'?') or starts-with(.,'!') or self::tei:lb]" role="warn">Kein geschütztes Leerzeichen [oder Satzzeichen/Zeilenumbruch] hinter Luhmann-wichtig oder Luhmann-fraglich Markierung</assert>
		</rule>
	</pattern>
	<!--lb allgemein-->
	<pattern id="lb">
		<rule context="tei:lb[@type]">
			<assert test="@type = 'inWord' or @type = 'inCompositum'">type_attribut enthält unzulässigen Wert</assert>
		</rule>
	</pattern>
	<!--	<pattern id="fw-leerzeichen">
		<rule context="tei:fw">
			<assert test="following-sibling::node()[1][starts-with(.,' ')]">Hinter Luhmannscher Zettelnummer soll ein Leerzeichen stehen</assert>
		</rule>
	</pattern>-->
	<!-- Auszeichnungsfehler  -->
	<pattern id="hi-3">
		<rule context="tei:hi">
			<report test="tei:hi/tei:hi" role="warning">Texthervorhebung (hi) dreifach geschachtelt</report>
		</rule>
	</pattern>
	<pattern id="hi-fw">
		<rule context="tei:hi">
			<report test="tei:fw" role="error">Zettelnummer (fw) innerhalb einer Texthervorhebung (hi) gefunden (bitte umgekehrt schachteln)</report>
		</rule>
	</pattern>
	<!--<pattern id="hi_u-red-u">
		<rule context="tei:hi[@rendition = '#u_red']">
			<report test="tei:hi[@rendition = '#u']">Texthervorhebung (hi): #u_red gedoppelt mit #u</report>
		</rule>
	</pattern>
	<pattern id="hi_u-u_red">
		<rule context="tei:hi[@rendition = '#u']">
			<report test="tei:hi[@rendition = '#u_red']">Texthervorhebung (hi): #u gedoppelt mit #u_red</report>
		</rule>
	</pattern>-->
	<pattern id="ref-2">
		<rule context="tei:ref">
			<report test="tei:ref">Verweisauszeichnung gedoppelt, bitte eine Verweisauszeichnung löschen</report>
		</rule>
	</pattern>
	<pattern id="choice">
		<rule context="tei:choice">
			<report test="tei:expan/following-sibling::tei:expan">expan soll nur eimal innerhalb von choice vokommen</report>
			<report test="descendant::tei:choice" role="warning">choice steht in choice: sollte vermieden werden, könnte Probleme bei der Anzeige nach sich ziehen</report>
		</rule>
	</pattern>
	<pattern id="add-ref">
		<rule context="tei:ref">
			<report test="tei:mod[@type='addition']">Schachtelung ungünstig: Hinzufügungen steht innerhalb eines Verweises, es soll aber anders herum sein: Hinzufügung außen/Link innen</report>
		</rule>
	</pattern>
	<pattern id="name-hi">
		<rule context="tei:name[not(text())]">
			<report test="tei:hi">Schachtelung ungünstig: Layouthervorhebung (hi)  ist einziges Kindelement von Person/Ort/Begriff, es soll aber anders herum sein: Layouthervorhebung (hi) außen - Person/Ort/Begriff innen</report>
		</rule>
	</pattern>
	<pattern id="bibl-hi">
		<rule context="tei:bibl[not(text())]">
			<report test="tei:hi">Schachtelung ungünstig: Layouthervorhebung (hi) ist einziges Kindelement von bibl, es soll aber anders herum sein: Layouthervorhebung (hi) außen - bibl innen</report>
		</rule>
	</pattern>
	<pattern id="name-note">
		<rule context="tei:note">
			<report test="ancestor::tei:ref">Schachtelung ungünstig: Note steht innerhalb einer Auszeichnung als Verweis</report>
		</rule>
	</pattern>
	<pattern id="milestone-text">
		<rule context="tei:p/tei:milestone[@unit]">
			<report test="following-sibling::node()" role="warning">Text direkt nach einem Milestone, bitte prüfen, ob das gewollt ist.</report>
		</rule>
	</pattern>
	<!-- Standardkonstruktionen  -->
	<pattern id="abbr">
		<rule context="tei:abbr">
			<assert test="parent::tei:choice">Auszzeichnung unvollständig (abbr soll in choice stehen) - bitte neu auszeichnen über Button</assert>
			<assert test="following-sibling::tei:expan">Auszzeichnung unvollständig (abbr soll in Kombination mit expan in choice stehen) - bitte neu auszeichnen über Button</assert>
		</rule>
	</pattern>
	<pattern id="orig">
		<rule context="tei:orig">
			<assert test="parent::tei:choice">Auszzeichnung unvollständig (orig soll in choice stehen) - bitte neu auszeichnen über Button</assert>
			<assert test="following-sibling::tei:reg">Auszzeichnung unvollständig (orig soll in Kombination mit reg in choice stehen) - bitte neu auszeichnen über Button</assert>
		</rule>
	</pattern>
	<pattern id="mod-deletion-addition">
		<rule context="tei:del[parent::tei:mod[@type='deletion-addition']]">
			<assert test="following-sibling::tei:add">Auszzeichnung unvollständig (del soll in Kombination mit add in mod stehen) - bitte neu auszeichnen über Button</assert>
		</rule>
	</pattern>
	<pattern id="addition">
		<rule context="tei:add">
			<assert test="parent::tei:mod">Auszzeichnung unvollständig (add soll in mod stehen) - bitte neu auszeichnen über Button</assert>
		</rule>
	</pattern>	
	<pattern id="deletion">
		<rule context="tei:del">
			<assert test="parent::tei:mod">Auszzeichnung unvollständig (del soll in mod stehen) - bitte neu auszeichnen über Button</assert>
		</rule>
	</pattern>	
	<pattern id="correction-sic">
		<rule context="tei:sic">
			<assert test="parent::tei:mod">Auszzeichnung unvollständig (sic soll in mod stehen) - bitte neu auszeichnen über Button</assert>
			<assert test="following-sibling::tei:corr">Auszzeichnung unvollständig (sic soll in Kombination mit corr in mod stehen) - bitte neu auszeichnen über Button</assert></rule>
	</pattern>	
	<pattern id="correction-corr">
		<rule context="tei:corr">
			<assert test="parent::tei:mod">Auszzeichnung unvollständig (sic soll in mod stehen) - bitte neu auszeichnen über Button</assert>
		</rule>
	</pattern>	
	<!-- Verlinkungsfehler -->
	<pattern id="ref">
		<rule context="tei:ref[@type = 'nl_vw_einzel_nah' or @type = 'nl_vw_gliederung' or @type = 'nl_vw_rueckseite' or @type = 'nl_vw_sammlung_E']">
			<assert test="starts-with(@target, '#')">Verweis: zu Beginn fehlt ein # </assert>
			<report test="contains(@target, '##')">Verweis: # zweifach enthalten</report>
			<assert test="contains(@target, 'ZK')">Noch kein Sprungziel angegeben</assert>
		</rule>
	</pattern>
	<pattern id="ref-nl_vw_einzel_entf">
		<rule context="tei:ref[@type = 'nl_vw_einzel_entf'][not(string-length(@target) gt 1)]">
			<!--nur refs anwarnen, die noch kein befülltes target haben (denn die werden normalerweise automatisch gesetzt, nur in Ausnahmefällen vom Editor, dann aber gleich mit @target)-->
			<!--string-length gt 1, damit sowohl leere, als auch "#" abgefangen werden-->
			<report test="contains(., ' ') or contains(., '.') or contains(., ';') or contains(., ':')">ref enthält Leerzeichen, Punkt, Semikolon oder einen  Doppelpunkt - dies führt zu Fehlern bei der automatischen Verlinkung</report>
			<report test="ends-with(., '/') or ends-with(., ',')">ref endet mit einem Slash oder Komma - dies führt zu Fehlern bei der automatischen Verlinkung</report>
			<report test="starts-with(., '/') or starts-with(., ',')">ref beginnt mit einem Slash oder Komma - dies führt zu Fehlern bei der automatischen Verlinkung</report>
		</rule>
	</pattern>
	<pattern id="externe-links-ausweisen">
		<rule context="tei:ref[not(@type='extern')][not(ancestor::tei:teiHeader)]">
			<report test="@target/contains(.,'http')">Externe Links sollen über den Attributwert "extern" markiert werden</report>
		</rule>
	</pattern>
	<pattern id="ptr">
		<rule context="tei:ptr">
			<assert test="starts-with(@target, '#')">Verweis: zu Beginn fehlt ein # </assert>
			<report test="contains(@target, '##')">Verweis: # zweifach enthalten</report>
		</rule>
	</pattern>
	<pattern id="Segmente">
		<rule context="tei:ptr[@target[contains(., 'Z')] or @target[contains(., 'K')]]">
			<!-- Testet das erste Segment (ZK) -->
			<assert test="matches(tokenize(@target, '_')[1], '^#ZK$')">erstes Segment fehlerhaft: (Test 1)</assert>
			<!-- Testet das zweite Segment (Ziffer 1 oder 2) -->
			<assert test="matches(tokenize(@target, '_')[2], '^[1-2]$')">zweites Segment fehlerhaft: (Test 2)</assert>
			<!-- Testet das sechste und letzte Segment (Buchstabe V oder R) -->
			<assert test="ends-with(@target, '_V') or ends-with(@target, '_R')">letztes Segment fehlerhaft: (Test 3: Soll V oder R)</assert>
		</rule>
	</pattern>
	<pattern id="key">
		<rule context="tei:name/@key">
			<assert test="starts-with(., '#')">Verweis: zu Beginn fehlt ein # </assert>
			<report test="contains(., '##')">Verweis: # zweifach enthalten</report>
			<!--<assert test="contains(., 'ZK')">Noch kein Sprungziel angegeben</assert>-->
		</rule>
	</pattern>
	<!-- bibl-Datensätze -->
	<pattern id="bibl">
		<rule context="tei:bibl">
			<assert test="starts-with(@sameAs, '#')">sameAs: zu Beginn fehlt ein # </assert>
			<report test="contains(@sameAs, '##')">sameAs: # zweifach enthalten</report>
		</rule>
	</pattern>
	<pattern id="bibl2">
		<rule context="tei:bibl">
			<!--Prüfen, dass @type und @sameAs zusammenpassen-->
			<let name="reg1" value="'#nla_W_\d{4}[a-z]?$'"/>
			<let name="reg2" value="'#luhmann_MS_\d{4}[a-z]?$'"/>
			<let name="reg3" value="'#luhmann_A_'"/>
			<let name="reg4" value="'#luhmann_V_'"/>
			<let name="reg5" value="'#MS_'"/>
			<let name="reg6" value="'#AV_'"/>
			<let name="reg7" value="'#PR_'"/>
			<!--Achtung: die ersten erst prüfen, wenn in sameAs mehr als nur # steht-->
			<report test="matches(@sameAs,'#.+?') and @type = 'Niklas-Luhmann-Werk' and not(matches(@sameAs, $reg1))">Link auf BiblDS (Werk) - Fehler im @sameAs (Format "#nla_W_0000").</report>
			<report test="matches(@sameAs,'#.+?') and @type = 'ms' and not(matches(@sameAs, $reg2))">Link auf BiblDS (Manuskript) - Fehler im @sameAs (Format "#luhmann_MS_0000").</report>
			<report test="matches(@sameAs,'#.+?') and @type = 'av' and not(starts-with(@sameAs, $reg3) or starts-with(@sameAs, $reg4))">Link auf BiblDS (Audio-Video) - Fehler im @sameAs (muss beginnen mit "#luhmann_A_" oder "#luhmann_V_").</report>
			<!--<report test="(@type = 'literatur' or @type = 'Niklas-Luhmann-Arbeitsbibliothek') and (matches(@sameAs, $reg2) or matches(@sameAs, $reg3) or matches(@sameAs, $reg4) or matches(@sameAs, $reg1))">Link auf BiblDS falsch typisiert, Wert in @sameAs passt nicht zum Typ (Links auf "MS/AV/Werk-BiblDS" typisieren als "ms/av/Niklas-Luhmann-Werk", nicht als "literatur/Niklas-Luhmann-Arbeitsbibliothek").</report>-->
			<report test="matches(@sameAs, $reg5) or matches(@sameAs, $reg6) or matches(@sameAs, $reg7)">Link auf Manifestation (MS/AV/Werkbeschreibung) als "ref" auszeichnen, nicht als "bibl".</report>
			<report test="@sameAs[matches(., '^#$')]" role="warn">bibl/@sameAs ist leer, bitte Referenz-ID eintragen.</report>
		</rule>
	</pattern>
	<pattern id="bibl_ZK_2_BG1a">
		<rule context="tei:bibl[@type='ZK_2_BG1a']">
			<assert test="contains(@sameAs, '_')">sameAs: soll nach  # einen Wert enthalten</assert>
		</rule>
	</pattern>
<!--Referenzen-->
	<pattern id="ref2">
		<!--Links auf Manifestationen: Prüfen, dass bei refs @type und @target zusammenpassen-->
		<rule context="tei:ref[@type = 'ms']">
			<assert test="matches(@target, '#MS_\d{4}[a-z]?$')">Link auf Manifestation (MS) - Fehler im @target (Format "#MS_0000") [falls Link auf BiblDS gemeint ist, diesen als "bibl" auszeichnen, nicht als "ref"].</assert>
		</rule>
		<rule context="tei:ref[@type = 'av']">
			<assert test="starts-with(@target, '#AV_')">Link auf Manifestation (AV) - Fehler im @target (muss beginnen mit "#AV_") [falls Link auf BiblDS gemeint ist, diesen als "bibl" auszeichnen, nicht als "ref"].</assert>
		</rule>
		<rule context="tei:ref[@type = 'wb']">
			<assert test="matches(@target, '#PR_WB_\d{4}$')">Link auf Manifestation (Werkbeschreibung) - Fehler im @target (Format "#PR_WB_0000") [falls Link auf BiblDS gemeint ist, diesen als "bibl" auszeichnen, nicht als "ref"].</assert>
		</rule>
	</pattern>
	<!-- notes -->
	<pattern id="notes">
		<rule context="tei:note">
			<assert test="@type">note soll über @type klassifiziert sein</assert>
		</rule>
	</pattern>
	<pattern id="note-luhmann">
		<rule context="tei:note[@type='luhmann']">
			<assert test="@place">bei Luhmann-Anmerkungen soll das place-Attribut einen Wert tragen</assert>
		</rule>
	</pattern>
	<!-- relatedItem-->
	<pattern id="relatedItem-bibl">
		<rule context="tei:relatedItem/tei:bibl">
			<assert test="@type='relatedItem'">@type von bibl in relatedItem soll auf Zetteln einfach related item lauten, infos zur Art des relatedITem findet sich in @teype des übergeordenten relatedItems </assert>
		</rule>
	</pattern>
	<pattern id="relatedItem">
		<rule context="tei:relatedItem">
			<assert test="parent::tei:bibl">relatedItem soll direkt in bibl stehen</assert>
			<assert test="child::*[1][self::tei:bibl]">erstes Kind soll bibl sein</assert>
			<assert test="tei:bibl[@sameAs and string-length(@sameAs) != 1] ">sameAs soll mit Sprunziel befüllt sein</assert>
			<assert test="tei:bibl/@sameAs[starts-with(.,'#')] ">sameAs soll mit ' beginnen</assert>
		</rule>
	</pattern>
	<!-- idno: typen und werte -->
	<pattern id="idno-zettelkasten">
		<!--normale Zettel-->
		<rule context="tei:idno[@type='orig_position'][not(@n='0-00-00000')]/tei:idno[@type = 'zettelkasten']">
			<assert test="text() = 1 or text() = 2">idno type="zettelkasten" darf nur den Wert 1 oder 2 enthalten</assert>
		</rule>
		<!--Dummy-Zettel-->
		<rule context="tei:idno[@type='orig_position'][@n='0-00-00000']/tei:idno[@type = 'zettelkasten']">
			<assert test="text() = 0">idno type="zettelkasten" muss bei Dummy-Zetteln den Wert 0 haben</assert>
		</rule>
	</pattern>
	<!-- Minimum Inhalte -->
	<!--	<pattern id="title-zettel">
		<rule context="tei:fileDesc/tei:titleStmt/tei:title">
			<assert test="text()">Titel fehlt!</assert>
		</rule>
	</pattern>-->
	<!--Auskommentiert bis übergreifend geloest-->
<!--Zettelstandards für Mindestfunktionalität Portal-->
	<pattern id="text-minimal">
		<rule context="tei:text">
			<let name="textN" value="@n"/>
			<let name="ekinN" value="substring(tei:body/tei:div[1]/@xml:id, 4, 1)"/>
			<assert test="@n">Zettelkastennummer (text/@n) fehlt</assert>
			<assert test="string(@n)">Zettelkastennummer (text/@n) ist leer</assert>
			<assert test="@n='1' or @n='2'">Zettelkastennummer (text/@n) muss "1" oder "2" lauten</assert>
			<assert test="@type and string-length(@type) != 0">Zettelkastenangabe (type-Attribut in text-Element) fehlt oder ist leer</assert>
			<assert test="$textN = $ekinN">Zettelkastennummer (<value-of select="$textN"/>) stimmt nicht mit ZK_Nr. in EKIN überein (<value-of select="$ekinN"/>)</assert>
			<assert test="tei:body/tei:div[@type='zettel-vorderseite' or @type='zettel-rueckseite' or @type='farbkarte']">Enthält kein als Vorder- oder Rückseite ausgewiesendes Zettel-div</assert>
			<report test="tei:body/tei:div[@type='farbkarte']">Als Farbkarte ausgewiesen, bitte prüfen.</report>
		</rule>
	</pattern>
	<pattern id="div-minimal">
		<rule context="tei:div[@type='zettel-vorderseite' or @type='zettel-rueckseite']">
			<assert test="@subtype and string-length(@subtype) != 0">Zettel-div subtype fehlt oder ist leer</assert>
			<assert test="@xml:id and string-length(@xml:id) != 0">Zettel-div xml:id fehlt oder ist leer</assert>
		</rule>
	</pattern>
	<pattern id="ergaenzungsnummer">
		<rule context="tei:altIdentifier[@type = 'luhmann']/tei:idno[@type = 'luhmann_zettelnummer'][@n[matches(., '-')]]">
			<assert test="tei:idno[@type = 'ergaenzung']/text()">Ergaenzungsnummer fehlt</assert>
		</rule>
	</pattern>
	<pattern id="logische-nummer-zettelkasten">
		<rule context="tei:altIdentifier[@type='logical_position']/tei:idno[@type='logical_position']/tei:idno[@type = 'zettelkasten']">
			<assert test="matches(.,'1') or matches(.,'2')">Zettelkastenummer fehlt oder trägt nicht den korrekten Wert</assert>
		</rule>
	</pattern>
	<!-- Schlagwortregister -->
	<pattern id="schlagwortregister-Typisierung">
		<rule context="tei:list[@type = 'index']">
			<assert test="@subtype='schlagwortregister'">soll als Schlagwortregister ausgewiesen sein</assert>
			<assert test="@n[matches(.,'SW1|SW2[abcd]')]">Abteilung im Zettelkasten soll in @n ausgeweisen werden (SW1, SW2[a-d])</assert>
		</rule>
	</pattern>
	<pattern id="schlagwortregister">
		<rule context="tei:list[@type = 'index'][@subtype = 'schlagwortregister']/tei:item">
			<let name="listN" value="parent::tei:list/@n"/>
			<let name="itemIDStart" value="concat($listN,'_')"/>
			<assert test="@n[matches(.,'SW1|SW2[abcd]')]">@n in item fehlt oder hat nicht den richtigen Wert (erwartet: SW1, SW2[a-d])</assert>
			<assert test="@n = $listN">Wert in item/@n (<value-of select="@n"/>) stimmt nicht mit Wert in übergeordneter list/@n überein (<value-of select="$listN"/>).</assert>
			<report test="@xml:id[not(starts-with(.,$itemIDStart))]">@xml:id beginnt nicht wie erwartet (erwartet wird: "<value-of select="$itemIDStart"/>")</report>
			<assert test="@corresp">@corresp fehlt</assert>
			<assert test="tei:label">kein label ausgezeichnet</assert>
			<assert test="descendant::tei:ref" role="information">kein ref enthalten</assert>
			<report test="descendant::tei:ref[@type='editor'][not(ancestor::tei:add) and not(ancestor::tei:note[@type='editor'])]">editor soll zu nl_vw_reg_intern_SW1 werden</report>
		</rule>
	</pattern>
	<pattern id="ref-intern-schlagwortregister">
		<rule context="tei:ref[@type='nl_vw_reg_intern_SW1']">
			<!--<assert test="@target/starts-with(., '#ZK_')">wenn nl_vw_reg_intern_SW1 dann soll @target mit "#ZK_" beginnen</assert>-->
			<assert test="@corresp[starts-with(., '#SW1_')]">wenn nl_vw_reg_intern_SW1 dann soll @corresp befüllt sein und mit "#SW1_" beginnen (dies ist hier nicht der Fall)</assert>
		</rule>
	</pattern>
	<!-- Listen -->
	<pattern id="item-lead">
		<rule context="tei:item">
			<report test="tei:p[@rendition='#item-lead']/following-sibling::tei:p[@rendition='#item-lead']">mehr als ein p-item-lead im aktuellen Item</report>
		</rule>
	</pattern>
	<pattern id="item-lead-list">
		<rule context="tei:p[@rendition='#item-lead']">
			<report test="not(parent::tei:item)" role="Warning">item-lead soll nur innerhalb einer Liste stehen, bitte den Wert in Attribut @rendition löschen</report>
		</rule>
	</pattern>
	<!-- Konsistenzprüfungen-->
	<!--<pattern id="ekin-facs">
		<let name="ekin_4" value="parent::tei:div/tokenize(@xml:id, '_')[4]"/>
		<rule context="tei:idno[@type='file-in-dir-batch']">
			<report test="contains(.,'$ekin_4')">Angegebene EKIN <value-of select="$ekin_4"/> weicht von Einträgen in der Rumpfdatei ab</report>
		</rule>
	</pattern>-->
	<!-- oxygen Kommentare -->
<pattern id="oxygen-comment">
		<rule context="processing-instruction()">
			<report test="starts-with(name(), 'oxy_comment_start')" role="information">Kommentar vorhanden, soll geklärt und gelöscht werden</report>
		</rule>
	</pattern>
<pattern id="flagText">
	<rule context="$dummy//tei:change">
		<assert test="(@n = 'base_1' and matches(., 'XML-Dummy-Rumpfdatei wurde erstellt.')) 
			or (@n = 'hasBranchVisualization' and matches(., 'Branch-Visualisierung wurde erstellt.'))
			or (@n = 'ready-for-publication' and matches(., 'Datensatz ist freigegeben für die Veröffentlichung im Portal - Verlinkung mit bibliographischem Bestand ist erfolgt.'))">Fehler im Flag-Text (Dummy).</assert>
	</rule>
	<rule context="$zk//tei:change">
		<assert test="(@n = 'base_1' and matches(., 'XML-Rumpfdatei wurde erstellt auf Basis der Scandateien und ihrer Bennungslogik.')) 
			or (@n = 'hasBranchVisualization' and matches(., 'Branch-Visualisierung wurde erstellt.')) 
			or (@n = 'hasCorrectedImage' and matches(., 'Für diese Zettelseite existiert ein weiteres Digitalisat, das aufgrund der schlechten Lesbarkeit des Originals für die Portalansicht erstellt wurde.')) 
			or (@n = 'ready-for-publication' and matches(., 'Datensatz ist freigegeben für die Veröffentlichung im Portal - Verlinkung mit bibliographischem Bestand ist erfolgt.'))">Fehler im Flag-Text.</assert>
	</rule></pattern>
</schema>
