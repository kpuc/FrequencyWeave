/**
 * Sort tabs web extension
 */

/**
 * menu definitions
 */
let menuDefs = [{
	id : "FrequencyWeave-by-domain",
	title : "FrequencyWeave non-pinned tabs by domain for this window",
	contexts : ["tools_menu", "browser_action"],
	icons : {
		16 : "icons/WeaveTabs-16.png"
	}
}];



function onError(error) {
  console.trace(error);
}

function clickHandler(evt) 
{
	let backgroundWindow = browser.runtime.getBackgroundPage();
	backgroundWindow.then( (w) => w.sortTabsComparatorName(evt.target.id))
		.then(
			(tab) => {
				console.log("Click handler: " + evt.target.id);
				window.close();
				}
			, onError
			);
}

function settingsClickHandler(evt, settings) {
  let backgroundWindow = browser.runtime.getBackgroundPage();
  return backgroundWindow.then(
    (w) => w.settingChanged(evt));
}

function createButton(buttonDef) {
	let newEl = document.createElement('div');
	newEl.id = buttonDef.id;
	newEl.innerText = buttonDef.title;
	// newEl.src = "../" + buttonDef.icons[16];
	newEl.addEventListener(
		"click",
		(evt) => clickHandler(evt)
	);
	return newEl;
}

function createPopup() 
{
	const buttons = menuDefs.map(
		(menuDef) => createButton(menuDef));
	const buttonGroup = document.createElement("div");
	buttons.forEach((button) => buttonGroup.appendChild(button));

	let cont = document.getElementById("options");
	cont.appendChild(buttonGroup);
}

/**
 * init
 */
document.addEventListener(
	"DOMContentLoaded",
	(evt) => {
		createPopup();
	}
);