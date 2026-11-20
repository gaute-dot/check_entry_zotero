/* global Zotero */
// Wires up the "Install the adjusted OSCOLA style" button in the settings pane.
document.getElementById("oscola-check-install-style")?.addEventListener("command", () => {
	Zotero.OscolaCheck?.installStyle().catch((e) => Zotero.logError(e));
});
