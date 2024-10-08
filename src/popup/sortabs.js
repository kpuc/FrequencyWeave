/**
 * Sort tabs web extension
 */

/**
 * menu definitions
 */
let menuDefs = [
	{
		id : "FrequencyWeave-by-domain",
		title : "FrequencyWeave non-pinned tabs by domain for this window",
		contexts : ["tools_menu", "browser_action"],
		icons : {
			16 : "icons/WeaveTabs-16.png"
		}
	}
	,
	{
		id : "FrequencyWeave-by-domain-v1-LeftTenPercent",
		title : "FrequencyWeave non-pinned leftmost ~10% tabs v1",
		contexts : ["tools_menu", "browser_action"],
		icons : {
			16 : "icons/WeaveTabs-16.png"
		}
	}
	,
	{
		id : "FrequencyWeave-by-domain-v2",
		title : "FrequencyWeave v2",
		contexts : ["tools_menu", "browser_action"],
		icons : {
			16 : "icons/WeaveTabs-16.png"
		}
	}
	,
	{
		id : "FrequencyWeave-by-domain-v2-LeftTenPercent",
		title : "FrequencyWeave ~10% v2",
		contexts : ["tools_menu", "browser_action"],
		icons : {
			16 : "icons/WeaveTabs-16.png"
		}
	}/*,
	{
		id : "FrequencyWeave-by-domain-v3",
		title : "FrequencyWeave v3",
		contexts : ["tools_menu", "browser_action"],
		icons : {
			16 : "icons/WeaveTabs-16.png"
		}
	}
	,
	{
		id : "FrequencyWeave-by-domain-v3-LeftTenPercent",
		title : "FrequencyWeave ~10% v3",
		contexts : ["tools_menu", "browser_action"],
		icons : {
			16 : "icons/WeaveTabs-16.png"
		}
	}*/
	
	,
	{
		id : "FrequencyWeave-by-domain-RoundRobin-ltr",
		title : "FrequencyWeave RoundRobin Left to Right",
		contexts : ["tools_menu", "browser_action"],
		icons : {
			16 : "icons/WeaveTabs-16.png"
		}
	}
	,
	{
		id : "FrequencyWeave-by-domain-RoundRobin-ltr-LeftTenPercent",
		title : "FrequencyWeave ~10% RoundRobin Left to Right",
		contexts : ["tools_menu", "browser_action"],
		icons : {
			16 : "icons/WeaveTabs-16.png"
		}
	}
	,
	{
		id : "FrequencyWeave-by-domain-RoundRobin-rtl",
		title : "FrequencyWeave RoundRobin Right to Left",
		contexts : ["tools_menu", "browser_action"],
		icons : {
			16 : "icons/WeaveTabs-16.png"
		}
	}
	,
	{
		id : "FrequencyWeave-by-domain-RoundRobin-rtl-LeftTenPercent",
		title : "FrequencyWeave ~10% RoundRobin Right to Left",
		contexts : ["tools_menu", "browser_action"],
		icons : {
			16 : "icons/WeaveTabs-16.png"
		}
	}
];



function onError(error) {
  console.trace(error);
}

function clickHandler(evt) 
{
	console.log("Target ID: '" + evt.target.id + "'" );
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