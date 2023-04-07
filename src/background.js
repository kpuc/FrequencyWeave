/**
 * Comparison functions
 */
function compareByUrlAsc(a, b) {
	let url1 = new URL(a.url);
	let url2 = new URL(b.url);

	return url1.hostname
		.localeCompare(url2.hostname);
}

function compareByUrlDesc(a, b) {
	let url1 = new URL(a.url);
	let url2 = new URL(b.url);

	return url2.hostname
		.localeCompare(url1.hostname);
}

function compareByDomainAsc(a, b) {
	let url1 = new URL(a.url);
	let url2 = new URL(b.url);

	let domain1 = url1.hostname
		  .split(".")
		  .slice(-2)
		  .join(".");
	let domain2 = url2.hostname
		  .split(".")
		  .slice(-2)
		  .join(".");

	return domain1.localeCompare(domain2);
}

function compareByDomainDesc(a, b) {
	let url1 = new URL(a.url);
	let url2 = new URL(b.url);

	let domain1 = url1.hostname
		  .split(".")
		  .slice(-2)
		  .join(".");
	let domain2 = url2.hostname
		  .split(".")
		  .slice(-2)
		  .join(".");

	return domain2.localeCompare(domain1);
}

function compareByTitleAsc(a, b) {
	return a.title.localeCompare(b.title);
}

function compareByTitleDesc(a, b) {
	return b.title.localeCompare(a.title);
}

function compareByLastAccessAsc(a, b) {
	if (a.lastAccessed < b.lastAccessed) {
		return -1;
	} else if (a.lastAccessed > b.lastAccessed) {
		return 1;
	} else {
		return 0;
	}
}

function compareByArrLenDesc(a, b)
{
	// assume a and b are arrays
	// sort in descending length order (a > b, return -1, etc)
	try
	{
		var lena = a.length, lenb = b.length;
		return ( lena > lenb ? -1 : lena < lenb ? 1 : 0 );
	}
	catch
	{
		return 0;
	}
}
function compareByArrLenAsc(a, b)
{
	// assume a and b are arrays
	// sort in ascending length order (a > b, return 1, etc)
	try
	{
		var lena = a.length, lenb = b.length;
		return ( lena > lenb ? 1 : lena < lenb ? -1 : 0 );
	}
	catch
	{
		return 0;
	}
}

function compareByLastAccessDesc(a, b) {
	if (b.lastAccessed < a.lastAccessed) {
		return -1;
	} else if (b.lastAccessed > a.lastAccessed) {
		return 1;
	} else {
		return 0;
	}
}

function onSettingsSortAuto(evt) {
  if (evt.target.checked) {
    browser.tabs.onUpdated.addListener(settingsSortAutoHandler);
    browser.tabs.onCreated.addListener(settingsSortAutoHandler);
  } else {
    browser.tabs.onUpdated.removeListener(settingsSortAutoHandler);
    browser.tabs.onCreated.removeListener(settingsSortAutoHandler);
  }

  return Promise.resolve();
}

function onSettingsSortPinned(evt) {
  return Promise.resolve();
}

let menuIdToComparator = {
	"Weave-by-domain": weaveByDomain
	//,"sort-by-url-asc" : compareByUrlAsc
};

let hardcodedSubWeaves = {
	//  "www.webtoons.com":{ pattern: /\/.*?\/.*?\/(.*?)\// }
	//, "www.gocomics.com":{ pattern: /\/(.*?)\//           }
	  "www.webtoons.com": /\/.*?\/.*?\/(.*?)\// 
	, "www.gocomics.com": /\/(.*?)\//           
}

let settingsMenuIdToHandler = {
  "settings-sort-auto": onSettingsSortAuto,
  "settings-sort-pinned": onSettingsSortPinned
};

//function sortTabsComparatorName(compName, settings) 
//{
//	if("Weave-by-domain" == compName)
//		return weaveByDomain();
//	return sortTabs(menuIdToComparator[compName], settings);
//	//return weaveByDomain();
//}
function sortTabsComparatorName(compName) 
{
	if("Weave-by-domain" == compName)
		return weaveByDomain();
	return weaveByDomain();
}

function settingsSortAutoHandler(tabId, changeInfo, tabInfo) 
{
	browser.storage.local.get({
		"last-comparator": undefined,
		"settings-sort-auto": false,
		"settings-sort-pinned": false
	}).then(
		(settings) => {
			if (menuIdToComparator[settings["last-comparator"]] !== undefined) {
			if("Weave-by-domain" == compName)
				return weaveByDomain();
			return sortTabs(menuIdToComparator[settings["last-comparator"]], settings);
		}
		}, onError);
}


function weaveByDomain()
{
	let num_pinned = 0;
	let debugging = true;
	return browser.tabs.query(
		{
			pinned : true,
			currentWindow : true
		})
		.then(
			// get the number of pinned tabs in this window.  We never sort pinned tabs, but this is the easiest way to do this
			(pinnedTabs) => 
			{
				num_pinned = pinnedTabs.length;
				return [];
			}, onError)
			.then(
				// get the list of tabs that aren't pinned
				(_) => 
				{
					return browser.tabs.query(
						{
							pinned : false,
							currentWindow : true
						}
					);
				}, onError)
				.then(
					// process the normal tabs
					(normalTabs) => 
					{
						console.log("Sorting normal " + normalTabs.length.toString());
						console.log("Starting at index " + num_pinned);
						
						// create lists of lists of tabs
						var tabBuckets = {};
						
						//if(debugging)console.log("number of tabs we are working with: "+(normalTabs.length - num_pinned));
						if(debugging)console.log("number of tabs we are working with: "+normalTabs.length);
						
						// prepopulate with domains
						for(var i = 0 ; i < normalTabs.length; i++)
							tabBuckets[""+(new URL(normalTabs[i].url).hostname)+""] = [];
						
						if(debugging)console.log("tabBuckets looks like:'"+JSON.stringify(tabBuckets)+"'");
						
						// add to our buckets 
						for(var i = 0 ; i < normalTabs.length; i++)
						{
							var hostname = new URL(normalTabs[i].url).hostname;
							
							if(debugging)console.log("Pushing tab '"+normalTabs[i].url+"' to bucket '"+hostname+"'");
							
							tabBuckets[""+hostname+""].push(normalTabs[i]);
						}
						
						// distribute our buckets over a new array of arrays, the outter the size of our tab count
						var tabBuckets2 = [];
						for(var i = 0; i < normalTabs.length; i++)
							tabBuckets2[i] = null;
						
						
						// convert our object of buckets into a sorted-by-length array of buckets
						var sblBuckets = [];
						for(var foo in tabBuckets)
							sblBuckets.push(tabBuckets[foo]);
						// sort 
						sblBuckets.sort(compareByArrLenDesc);
						//sblBuckets.sort(compareByArrLenAsc);
						
						
						// distribute the buckets via slide-insert
						for(var i = 0; i < sblBuckets.length; i++)
						{
							if(0 < sblBuckets[i].length)
							{
								var hostname = (new URL(sblBuckets[i][0].url)).hostname;
								if(debugging)console.log("working on bucket '"+hostname+"', with length "+sblBuckets[i].length);
								if('' == hostname)
								{
									console.log("found a blank hostname?  What is this guy?\n"+JSON.stringify(sblBuckets[i]));
								}
								//// webtoons and gocomics are two edge cases where we want to redistribute comics from these domains within the bucket.
								//if("www.webtoons.com" == hostname)
								//{
								//	var skipme = false;
								//	if(debugging)console.log("Found hostname for webtoons");
								//	var wtBucket = {};
								//	var skippedTabs = [];
								//	for(var j = 0 ; j < sblBuckets[i].length; j++)
								//	{
								//		if(debugging)console.log("workin' with URL '"+sblBuckets[i][j].url+"'");
								//		var url = new URL(sblBuckets[i][j].url);
								//		
								//		// capture the pattern that includes the comic's name, like "/en/challenge/plague-muffins/"
								//		var cmcPath = url.pathname.match(/\/.*?\/.*?\/(.*?)\//);
								//		// result should be like: Array [ "/en/challenge/the-safekeepers/", "the-safekeepers" ]
								//		if(debugging)console.log("pattern matching got us:"+JSON.stringify(cmcPath));
								//		if(2 > cmcPath.length || '' == cmcPath[1])
								//		{
								//			if(debugging)console.log("Failed to find a match.");
								//			skippedTabs.push(sblBuckets[i][j]);
								//			// we failed a match.  don't mangle this bucket
								//			//break;
								//			continue;
								//		}
								//		
								//		if(cmcPath[1] in wtBucket)
								//			wtBucket[""+cmcPath[1]+""].push(sblBuckets[i][j]);
								//		else
								//		{
								//			wtBucket[""+cmcPath[1]+""] = [];
								//			wtBucket[""+cmcPath[1]+""].push(sblBuckets[i][j]);
								//		}
								//	}
								//	var sblBuckets2 = [];
								//	for(var foo in wtBucket)
								//		sblBuckets2.push(wtBucket[foo]);
								//	// if we skipped tabs because we couldn't pattern match, add 'em back.
								//	if(null != skippedTabs && 0 < skippedTabs.length)
								//	{
								//		if(debugging)console.log("Skipped some tabs.  adding these guys back...:"+JSON.stringify(skippedTabs));
								//		do
								//		{
								//			var holeindx = 0;
								//			do
								//			{
								//				holeindx++;
								//			}while(null != sblBuckets2[holeindx]);
								//			sblBuckets2[holeindx] = skippedTabs.pop();
								//		}
								//		while(0 > skippedTabs.length);
								//	}
								//	
								//	// sort 
								//	sblBuckets2.sort(compareByArrLenDesc);
								//	// distribute
								//	var replacementBucket = new Array(sblBuckets[i].length);
								//	for(var k = 0 ; k < sblBuckets2.length; k++)
								//	{
								//		var tbfqncy = sblBuckets[i].length/sblBuckets2[k].length;
								//		for(var j = 0; j < sblBuckets2[k].length; j++)
								//		{
								//			var clcIndx = (tbfqncy*j);
								//			
								//			do
								//			{
								//				clcIndx++;
								//			}
								//			while(null != replacementBucket[Math.round(clcIndx)]);
								//			replacementBucket[Math.round(clcIndx)] = sblBuckets2[k][j];
								//		}
								//	}
								//	if(debugging)console.log("replacing our webtoons bucket with:"+JSON.stringify(replacementBucket));
								//	// replace the bucket
								//	sblBuckets[i] = replacementBucket;
								//}
								if(hostname in hardcodedSubWeaves)
									sblBuckets[i] = subweave(sblBuckets[i],hardcodedSubWeaves[hostname],debugging);
								
								if(debugging)console.log("Calculating tab frequency by taking the total number of tabs '"+normalTabs.length+"' and dividing by the size of our bucket '"+sblBuckets[i].length+"'");
								var tbfqncy = normalTabs.length/sblBuckets[i].length;
								
								for(var j = 0; j < sblBuckets[i].length; j++)
								{
									if(debugging)console.log("inserting into tabBuckets2 with frequency "+tbfqncy);
									
									var clcIndx = (tbfqncy*j);
									
									if(debugging)console.log("calculated index into tabBuckets2 is " + clcIndx );
									
									do
									{
										clcIndx++;
									}
									while(null != tabBuckets2[Math.round(clcIndx)]);
									tabBuckets2[Math.round(clcIndx)] = sblBuckets[i][j];
									
									if(debugging)console.log("recalculated index into tabBuckets2 is " + clcIndx );
								}
							}
						}
						
						//if(debugging)console.log("our tabBuckets2 looks like:"+JSON.stringify(tabBuckets2));
						
						// prune empty cells
						var newTabList = [];
						for(var i = 0; i < tabBuckets2.length; i++ )
							if(null != tabBuckets2[i])
								newTabList.push(tabBuckets2[i]);
						
						if(debugging)console.log("our pruned newTabList looks like:"+JSON.stringify(newTabList));
						
						return browser.tabs.move(
							newTabList.map((tab) => { return tab.id; }),
							{ index : num_pinned }
						);
					}, onError);
}

function subweave(sblBuckets,regex,debugging)
{
	// webtoons and gocomics are two edge cases where we want to redistribute comics from these domains within the bucket.
	
	if(debugging)console.log("Found hostname for webtoons");
	var wtBucket = {};
	var skippedTabs = [];
	for(var j = 0 ; j < sblBuckets.length; j++)
	{
		if(debugging)console.log("workin' with URL '"+sblBuckets[j].url+"'");
		var url = new URL(sblBuckets[j].url);
		
		// capture the pattern that includes the comic's name, like "/en/challenge/plague-muffins/"
		var cmcPath = url.pathname.match(regex);
		// result should be like: Array [ "/en/challenge/the-safekeepers/", "the-safekeepers" ]
		if(debugging)console.log("pattern matching got us:"+JSON.stringify(cmcPath));
		if(2 > cmcPath.length || '' == cmcPath[1])
		{
			if(debugging)console.log("Failed to find a match.");
			skippedTabs.push(sblBuckets[j]);
			// we failed a match.  don't mangle this bucket
			//break;
			continue;
		}
		
		if(cmcPath[1] in wtBucket)
			wtBucket[""+cmcPath[1]+""].push(sblBuckets[j]);
		else
		{
			wtBucket[""+cmcPath[1]+""] = [];
			wtBucket[""+cmcPath[1]+""].push(sblBuckets[j]);
		}
	}
	var sblBuckets2 = [];
	for(var foo in wtBucket)
		sblBuckets2.push(wtBucket[foo]);
	// if we skipped tabs because we couldn't pattern match, add 'em back.
	if(null != skippedTabs && 0 < skippedTabs.length)
	{
		if(debugging)console.log("Skipped some tabs.  adding these guys back...:"+JSON.stringify(skippedTabs));
		var holeindx = 0;
		while(0 > skippedTabs.length)
		{
			// find the next available index
			while(null != sblBuckets2[holeindx])
				holeindx++;
			sblBuckets2[holeindx] = skippedTabs.shift();
		}
	}
	
	// sort 
	sblBuckets2.sort(compareByArrLenDesc);
	// distribute
	var replacementBucket = new Array(sblBuckets.length);
	for(var k = 0 ; k < sblBuckets2.length; k++)
	{
		var tbfqncy = sblBuckets.length/sblBuckets2[k].length;
		for(var j = 0; j < sblBuckets2[k].length; j++)
		{
			var clcIndx = (tbfqncy*j);
			
			// find an available index
			while(null != replacementBucket[Math.round(clcIndx)])
				clcIndx++;
			
			replacementBucket[Math.round(clcIndx)] = sblBuckets2[k][j];
		}
	}
	if(debugging)console.log("replacing our webtoons bucket with:"+JSON.stringify(replacementBucket));
	// replace the bucket
	sblBuckets = replacementBucket;
	return sblBuckets;
}


function sortTabs(comparator, settings) 
{
	let num_pinned = 0;
	return browser.tabs.query(
		{
			pinned : true,
			currentWindow : true
		})
		.then(
			(pinnedTabs) => 
			{
				num_pinned = pinnedTabs.length;
				
				if (settings["settings-sort-pinned"]) 
				{
					console.log("Sorting pinned: " + num_pinned.toString());
					pinnedTabs.sort(comparator);
					return browser.tabs.move(
						pinnedTabs.map((tab) => { return tab.id; }),
						{ index : 0 }
					);
				}
				else
				{
					return [];
				}
			}, onError)
			.then(
				(_) => 
				{
					return browser.tabs.query(
						{
							pinned : false,
							currentWindow : true
						}
					);
				}, onError)
				.then(
					(normalTabs) => 
					{
						console.log("Sorting normal " + normalTabs.length.toString());
						console.log("Starting at index " + num_pinned);
						normalTabs.sort(comparator);
						return browser.tabs.move(
							normalTabs.map((tab) => { return tab.id; }),
							{ index : num_pinned }
						);
					}, onError);
}

function settingChanged(evt) {
  return settingsMenuIdToHandler[evt.target.id](evt)
    .then(
      (e) => {
        return browser.storage.local.set({
          [evt.target.id]: evt.target.checked
        });
      }, onError);
}

function onError(error) {
  console.trace(error);
}
