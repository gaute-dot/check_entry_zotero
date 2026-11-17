/* global Components, Services, ChromeUtils */
/* Bootstrap for the OSCOLA Check plugin (Zotero 8 and later). */

var chromeHandle;

function install() {}

async function startup({ id, version, rootURI }) {
	await Zotero.initializationPromise;

	var aomStartup = Components.classes["@mozilla.org/addons/addon-manager-startup;1"].getService(
		Components.interfaces.amIAddonManagerStartup,
	);
	var manifestURI = Services.io.newURI(rootURI + "manifest.json");
	chromeHandle = aomStartup.registerChrome(manifestURI, [["content", "oscola-check", rootURI + "content/"]]);

	var ctx = { Zotero, rootURI };
	ctx._globalThis = ctx;
	Services.scriptloader.loadSubScript(rootURI + "content/scripts/oscola-check.js", ctx);
	Zotero.OscolaCheck = ctx.OscolaCheck;
	await Zotero.OscolaCheck.startup({ id, version, rootURI });

	for (const win of Zotero.getMainWindows()) {
		Zotero.OscolaCheck.onMainWindowLoad(win);
	}
}

function onMainWindowLoad({ window }) {
	Zotero.OscolaCheck?.onMainWindowLoad(window);
}

function onMainWindowUnload({ window }) {
	Zotero.OscolaCheck?.onMainWindowUnload(window);
}

function shutdown(data, reason) {
	if (reason === APP_SHUTDOWN) return;
	Zotero.OscolaCheck?.shutdown();
	delete Zotero.OscolaCheck;
	if (chromeHandle) {
		chromeHandle.destruct();
		chromeHandle = null;
	}
}

function uninstall() {}
