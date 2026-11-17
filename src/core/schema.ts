/* Generated from zotero/zotero-schema (schema.json). Field and creator types per item type. */
export const ITEM_TYPES: Record<string, { fields: string[]; creators: string[] }> = {
	"annotation": {
		"fields": [],
		"creators": []
	},
	"artwork": {
		"fields": [
			"title",
			"abstractNote",
			"artworkMedium",
			"artworkSize",
			"date",
			"eventPlace",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"archive",
			"archiveLocation",
			"shortTitle",
			"language",
			"libraryCatalog",
			"callNumber",
			"rights",
			"extra"
		],
		"creators": [
			"artist",
			"contributor"
		]
	},
	"attachment": {
		"fields": [
			"title",
			"accessDate",
			"url"
		],
		"creators": []
	},
	"audioRecording": {
		"fields": [
			"title",
			"abstractNote",
			"audioRecordingFormat",
			"seriesTitle",
			"volume",
			"numberOfVolumes",
			"label",
			"place",
			"date",
			"runningTime",
			"ISBN",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"archive",
			"archiveLocation",
			"shortTitle",
			"language",
			"libraryCatalog",
			"callNumber",
			"rights",
			"extra"
		],
		"creators": [
			"performer",
			"originalCreator",
			"composer",
			"wordsBy",
			"translator",
			"contributor"
		]
	},
	"bill": {
		"fields": [
			"title",
			"abstractNote",
			"billNumber",
			"code",
			"codeVolume",
			"section",
			"codePages",
			"legislativeBody",
			"session",
			"history",
			"date",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"shortTitle",
			"language",
			"rights",
			"extra"
		],
		"creators": [
			"sponsor",
			"cosponsor",
			"contributor"
		]
	},
	"blogPost": {
		"fields": [
			"title",
			"abstractNote",
			"blogTitle",
			"websiteType",
			"date",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"ISSN",
			"shortTitle",
			"language",
			"rights",
			"extra"
		],
		"creators": [
			"author",
			"translator",
			"commenter",
			"contributor"
		]
	},
	"book": {
		"fields": [
			"title",
			"abstractNote",
			"series",
			"seriesNumber",
			"volume",
			"numberOfVolumes",
			"edition",
			"date",
			"publisher",
			"place",
			"originalDate",
			"originalPublisher",
			"originalPlace",
			"format",
			"numPages",
			"ISBN",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"ISSN",
			"archive",
			"archiveLocation",
			"shortTitle",
			"language",
			"libraryCatalog",
			"callNumber",
			"rights",
			"extra"
		],
		"creators": [
			"author",
			"contributor",
			"editor",
			"translator",
			"seriesEditor"
		]
	},
	"bookSection": {
		"fields": [
			"title",
			"abstractNote",
			"bookTitle",
			"series",
			"seriesNumber",
			"volume",
			"numberOfVolumes",
			"edition",
			"date",
			"publisher",
			"place",
			"originalDate",
			"originalPublisher",
			"originalPlace",
			"format",
			"pages",
			"ISBN",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"ISSN",
			"archive",
			"archiveLocation",
			"shortTitle",
			"language",
			"libraryCatalog",
			"callNumber",
			"rights",
			"extra"
		],
		"creators": [
			"author",
			"contributor",
			"editor",
			"bookAuthor",
			"translator",
			"seriesEditor"
		]
	},
	"case": {
		"fields": [
			"caseName",
			"abstractNote",
			"court",
			"dateDecided",
			"docketNumber",
			"reporter",
			"reporterVolume",
			"firstPage",
			"history",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"shortTitle",
			"language",
			"rights",
			"extra"
		],
		"creators": [
			"author",
			"counsel",
			"contributor"
		]
	},
	"computerProgram": {
		"fields": [
			"title",
			"abstractNote",
			"seriesTitle",
			"versionNumber",
			"date",
			"system",
			"company",
			"place",
			"programmingLanguage",
			"rights",
			"citationKey",
			"url",
			"accessDate",
			"DOI",
			"ISBN",
			"archive",
			"archiveLocation",
			"libraryCatalog",
			"callNumber",
			"shortTitle",
			"extra"
		],
		"creators": [
			"programmer",
			"contributor"
		]
	},
	"conferencePaper": {
		"fields": [
			"title",
			"abstractNote",
			"proceedingsTitle",
			"conferenceName",
			"publisher",
			"place",
			"date",
			"eventPlace",
			"volume",
			"issue",
			"numberOfVolumes",
			"pages",
			"series",
			"seriesNumber",
			"DOI",
			"ISBN",
			"citationKey",
			"url",
			"accessDate",
			"ISSN",
			"archive",
			"archiveLocation",
			"shortTitle",
			"language",
			"libraryCatalog",
			"callNumber",
			"rights",
			"extra"
		],
		"creators": [
			"author",
			"contributor",
			"editor",
			"translator",
			"seriesEditor"
		]
	},
	"dataset": {
		"fields": [
			"title",
			"abstractNote",
			"identifier",
			"type",
			"versionNumber",
			"date",
			"repository",
			"repositoryLocation",
			"format",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"archive",
			"archiveLocation",
			"shortTitle",
			"language",
			"libraryCatalog",
			"callNumber",
			"rights",
			"extra"
		],
		"creators": [
			"author",
			"contributor"
		]
	},
	"dictionaryEntry": {
		"fields": [
			"title",
			"abstractNote",
			"dictionaryTitle",
			"series",
			"seriesNumber",
			"volume",
			"numberOfVolumes",
			"edition",
			"date",
			"publisher",
			"place",
			"pages",
			"ISBN",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"archive",
			"archiveLocation",
			"shortTitle",
			"language",
			"libraryCatalog",
			"callNumber",
			"rights",
			"extra"
		],
		"creators": [
			"author",
			"contributor",
			"editor",
			"translator",
			"seriesEditor"
		]
	},
	"document": {
		"fields": [
			"title",
			"abstractNote",
			"type",
			"date",
			"publisher",
			"place",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"archive",
			"archiveLocation",
			"shortTitle",
			"language",
			"libraryCatalog",
			"callNumber",
			"rights",
			"extra"
		],
		"creators": [
			"author",
			"contributor",
			"editor",
			"translator",
			"reviewedAuthor"
		]
	},
	"email": {
		"fields": [
			"subject",
			"abstractNote",
			"date",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"shortTitle",
			"language",
			"rights",
			"extra"
		],
		"creators": [
			"author",
			"translator",
			"contributor",
			"recipient"
		]
	},
	"encyclopediaArticle": {
		"fields": [
			"title",
			"abstractNote",
			"encyclopediaTitle",
			"series",
			"seriesNumber",
			"volume",
			"numberOfVolumes",
			"edition",
			"date",
			"publisher",
			"place",
			"pages",
			"ISBN",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"archive",
			"archiveLocation",
			"shortTitle",
			"language",
			"libraryCatalog",
			"callNumber",
			"rights",
			"extra"
		],
		"creators": [
			"author",
			"contributor",
			"editor",
			"translator",
			"seriesEditor"
		]
	},
	"film": {
		"fields": [
			"title",
			"abstractNote",
			"distributor",
			"place",
			"date",
			"genre",
			"videoRecordingFormat",
			"runningTime",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"archive",
			"archiveLocation",
			"shortTitle",
			"language",
			"libraryCatalog",
			"callNumber",
			"rights",
			"extra"
		],
		"creators": [
			"director",
			"producer",
			"scriptwriter",
			"castMember",
			"host",
			"guest",
			"narrator",
			"translator",
			"contributor"
		]
	},
	"forumPost": {
		"fields": [
			"title",
			"abstractNote",
			"forumTitle",
			"postType",
			"date",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"shortTitle",
			"language",
			"rights",
			"extra"
		],
		"creators": [
			"author",
			"contributor"
		]
	},
	"hearing": {
		"fields": [
			"title",
			"abstractNote",
			"committee",
			"publisher",
			"numberOfVolumes",
			"documentNumber",
			"pages",
			"legislativeBody",
			"session",
			"history",
			"date",
			"place",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"shortTitle",
			"language",
			"rights",
			"extra"
		],
		"creators": [
			"contributor"
		]
	},
	"instantMessage": {
		"fields": [
			"title",
			"abstractNote",
			"date",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"shortTitle",
			"language",
			"rights",
			"extra"
		],
		"creators": [
			"author",
			"contributor",
			"recipient"
		]
	},
	"interview": {
		"fields": [
			"title",
			"abstractNote",
			"interviewMedium",
			"date",
			"publisher",
			"place",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"archive",
			"archiveLocation",
			"shortTitle",
			"language",
			"libraryCatalog",
			"callNumber",
			"rights",
			"extra"
		],
		"creators": [
			"interviewee",
			"contributor",
			"interviewer",
			"translator"
		]
	},
	"journalArticle": {
		"fields": [
			"title",
			"abstractNote",
			"publicationTitle",
			"publisher",
			"place",
			"date",
			"volume",
			"issue",
			"section",
			"partNumber",
			"partTitle",
			"pages",
			"series",
			"seriesTitle",
			"seriesText",
			"journalAbbreviation",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"PMID",
			"PMCID",
			"ISSN",
			"archive",
			"archiveLocation",
			"shortTitle",
			"language",
			"libraryCatalog",
			"callNumber",
			"rights",
			"extra"
		],
		"creators": [
			"author",
			"contributor",
			"editor",
			"translator",
			"reviewedAuthor"
		]
	},
	"letter": {
		"fields": [
			"title",
			"abstractNote",
			"letterType",
			"date",
			"eventPlace",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"archive",
			"archiveLocation",
			"shortTitle",
			"language",
			"libraryCatalog",
			"callNumber",
			"rights",
			"extra"
		],
		"creators": [
			"author",
			"recipient",
			"contributor",
			"translator"
		]
	},
	"magazineArticle": {
		"fields": [
			"title",
			"abstractNote",
			"publicationTitle",
			"publisher",
			"place",
			"date",
			"volume",
			"issue",
			"pages",
			"ISSN",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"archive",
			"archiveLocation",
			"shortTitle",
			"language",
			"libraryCatalog",
			"callNumber",
			"rights",
			"extra"
		],
		"creators": [
			"author",
			"contributor",
			"translator",
			"reviewedAuthor"
		]
	},
	"manuscript": {
		"fields": [
			"title",
			"abstractNote",
			"manuscriptType",
			"institution",
			"place",
			"date",
			"numPages",
			"number",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"archive",
			"archiveLocation",
			"shortTitle",
			"language",
			"libraryCatalog",
			"callNumber",
			"rights",
			"extra"
		],
		"creators": [
			"author",
			"contributor",
			"translator"
		]
	},
	"map": {
		"fields": [
			"title",
			"abstractNote",
			"mapType",
			"scale",
			"seriesTitle",
			"edition",
			"publisher",
			"place",
			"date",
			"DOI",
			"ISBN",
			"citationKey",
			"url",
			"accessDate",
			"archive",
			"archiveLocation",
			"shortTitle",
			"language",
			"libraryCatalog",
			"callNumber",
			"rights",
			"extra"
		],
		"creators": [
			"cartographer",
			"contributor",
			"seriesEditor"
		]
	},
	"newspaperArticle": {
		"fields": [
			"title",
			"abstractNote",
			"publicationTitle",
			"publisher",
			"place",
			"date",
			"volume",
			"issue",
			"edition",
			"section",
			"pages",
			"ISSN",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"archive",
			"archiveLocation",
			"shortTitle",
			"language",
			"libraryCatalog",
			"callNumber",
			"rights",
			"extra"
		],
		"creators": [
			"author",
			"contributor",
			"translator",
			"reviewedAuthor"
		]
	},
	"note": {
		"fields": [],
		"creators": []
	},
	"patent": {
		"fields": [
			"title",
			"abstractNote",
			"place",
			"country",
			"assignee",
			"issuingAuthority",
			"patentNumber",
			"filingDate",
			"pages",
			"applicationNumber",
			"priorityNumbers",
			"issueDate",
			"priorityDate",
			"references",
			"legalStatus",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"shortTitle",
			"language",
			"rights",
			"extra"
		],
		"creators": [
			"inventor",
			"attorneyAgent",
			"contributor"
		]
	},
	"podcast": {
		"fields": [
			"title",
			"abstractNote",
			"seriesTitle",
			"episodeNumber",
			"audioFileType",
			"date",
			"publisher",
			"place",
			"runningTime",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"shortTitle",
			"language",
			"rights",
			"extra"
		],
		"creators": [
			"podcaster",
			"guest",
			"producer",
			"executiveProducer",
			"seriesCreator",
			"director",
			"scriptwriter",
			"castMember",
			"translator",
			"contributor"
		]
	},
	"preprint": {
		"fields": [
			"title",
			"abstractNote",
			"genre",
			"repository",
			"archiveID",
			"place",
			"date",
			"series",
			"seriesNumber",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"archive",
			"archiveLocation",
			"shortTitle",
			"language",
			"libraryCatalog",
			"callNumber",
			"rights",
			"extra"
		],
		"creators": [
			"author",
			"contributor",
			"editor",
			"translator",
			"reviewedAuthor"
		]
	},
	"presentation": {
		"fields": [
			"title",
			"abstractNote",
			"presentationType",
			"date",
			"meetingName",
			"place",
			"series",
			"sessionTitle",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"shortTitle",
			"language",
			"rights",
			"extra"
		],
		"creators": [
			"presenter",
			"chair",
			"organizer",
			"contributor",
			"translator"
		]
	},
	"radioBroadcast": {
		"fields": [
			"title",
			"abstractNote",
			"programTitle",
			"episodeNumber",
			"audioRecordingFormat",
			"network",
			"place",
			"date",
			"runningTime",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"archive",
			"archiveLocation",
			"shortTitle",
			"language",
			"libraryCatalog",
			"callNumber",
			"rights",
			"extra"
		],
		"creators": [
			"creator",
			"host",
			"guest",
			"producer",
			"executiveProducer",
			"seriesCreator",
			"director",
			"scriptwriter",
			"castMember",
			"translator",
			"contributor"
		]
	},
	"report": {
		"fields": [
			"title",
			"abstractNote",
			"reportNumber",
			"reportType",
			"institution",
			"place",
			"date",
			"seriesTitle",
			"seriesNumber",
			"pages",
			"DOI",
			"ISBN",
			"citationKey",
			"url",
			"accessDate",
			"ISSN",
			"archive",
			"archiveLocation",
			"shortTitle",
			"language",
			"libraryCatalog",
			"callNumber",
			"rights",
			"extra"
		],
		"creators": [
			"author",
			"editor",
			"contributor",
			"translator",
			"seriesEditor"
		]
	},
	"standard": {
		"fields": [
			"title",
			"abstractNote",
			"organization",
			"committee",
			"type",
			"number",
			"versionNumber",
			"edition",
			"status",
			"date",
			"publisher",
			"place",
			"partNumber",
			"partTitle",
			"ISBN",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"archive",
			"archiveLocation",
			"shortTitle",
			"numPages",
			"language",
			"libraryCatalog",
			"callNumber",
			"rights",
			"extra"
		],
		"creators": [
			"author",
			"editor",
			"contributor"
		]
	},
	"statute": {
		"fields": [
			"nameOfAct",
			"abstractNote",
			"code",
			"codeNumber",
			"publicLawNumber",
			"dateEnacted",
			"pages",
			"section",
			"session",
			"history",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"shortTitle",
			"language",
			"rights",
			"extra"
		],
		"creators": [
			"author",
			"contributor"
		]
	},
	"thesis": {
		"fields": [
			"title",
			"abstractNote",
			"thesisType",
			"university",
			"place",
			"date",
			"series",
			"seriesNumber",
			"numPages",
			"DOI",
			"ISBN",
			"citationKey",
			"url",
			"accessDate",
			"ISSN",
			"archive",
			"archiveLocation",
			"shortTitle",
			"language",
			"libraryCatalog",
			"callNumber",
			"rights",
			"extra"
		],
		"creators": [
			"author",
			"contributor"
		]
	},
	"tvBroadcast": {
		"fields": [
			"title",
			"abstractNote",
			"programTitle",
			"episodeNumber",
			"videoRecordingFormat",
			"network",
			"place",
			"date",
			"runningTime",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"archive",
			"archiveLocation",
			"shortTitle",
			"language",
			"libraryCatalog",
			"callNumber",
			"rights",
			"extra"
		],
		"creators": [
			"director",
			"producer",
			"executiveProducer",
			"seriesCreator",
			"scriptwriter",
			"castMember",
			"host",
			"guest",
			"narrator",
			"translator",
			"contributor"
		]
	},
	"videoRecording": {
		"fields": [
			"title",
			"abstractNote",
			"videoRecordingFormat",
			"seriesTitle",
			"volume",
			"numberOfVolumes",
			"studio",
			"place",
			"date",
			"runningTime",
			"ISBN",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"archive",
			"archiveLocation",
			"shortTitle",
			"language",
			"libraryCatalog",
			"callNumber",
			"rights",
			"extra"
		],
		"creators": [
			"creator",
			"director",
			"producer",
			"scriptwriter",
			"executiveProducer",
			"castMember",
			"host",
			"guest",
			"narrator",
			"translator",
			"contributor"
		]
	},
	"webpage": {
		"fields": [
			"title",
			"abstractNote",
			"websiteTitle",
			"websiteType",
			"date",
			"publisher",
			"place",
			"DOI",
			"citationKey",
			"url",
			"accessDate",
			"shortTitle",
			"language",
			"rights",
			"extra"
		],
		"creators": [
			"author",
			"contributor",
			"translator"
		]
	}
};

export function isValidField(itemType: string, field: string): boolean {
	return !!ITEM_TYPES[itemType]?.fields.includes(field);
}

