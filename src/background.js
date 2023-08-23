/**
 * Comparison functions
 */
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


let menuIdToComparator = {
	  "Weave-by-domain"    : weaveByDomain
	, "Weave-by-domain-v1-LeftTenPercent" : weaveByDomain_v1_leftTenPercent
	, "Weave-by-domain-v2" : weaveByDomain_v2
	, "Weave-by-domain-v2-LeftTenPercent" : weaveByDomain_v2_leftTenPercent
};

let hardcodedSubWeaves = {
	  "www.webtoons.com": /\/.*?\/.*?\/(.*?)\// 
	, "www.gocomics.com": /\/(.*?)\//           
}

// this guy appears to be called from sortabs.js
function sortTabsComparatorName(compName) 
{
	if("FrequencyWeave-by-domain" == compName)
		return weaveByDomain();
	else if ("FrequencyWeave-by-domain-v1-LeftTenPercent" == compName)
		return weaveByDomain_v1_leftTenPercent();
	else if ("FrequencyWeave-by-domain-v2" == compName)
		return weaveByDomain_v2();
	else if ("FrequencyWeave-by-domain-v2-LeftTenPercent" == compName)
		return weaveByDomain_v2_leftTenPercent();
	return weaveByDomain();
}


function weaveByDomain_old20230806a()
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
						
						// convert our object of buckets into a sorted-by-length array of buckets
						var sblBuckets = [];
						for(var foo in tabBuckets)
							sblBuckets.push(tabBuckets[foo]);
						
						// sort 
						//sblBuckets.sort(compareByArrLenDesc);
						sblBuckets.sort(compareByArrLenAsc);
						
						// collect the "singles" into it's own bucket
						var singles = [];
						for(var i = 0; i < sblBuckets.length; i++)
							if(1 == sblBuckets[i].length)
								singles.unshift(sblBuckets[i].shift());
							else
								break;
						// clean the buckets
						var buckBuf = [];
						for(var i = 0; i < sblBuckets.length; i++)
							if(0 < sblBuckets[i].length)
								buckBuf.push(sblBuckets[i]);
						sblBuckets = buckBuf;
						
						/*
						 * Now we distribute the buckets.
						 * Our new algo takes the smallest bucket and weaves the next largest into it, then the next largest into it, etc., etc., until all the
						 * buckets have been woven in.  
						 * This may result in a reasonably homogeneous weave of tabs.
						 */
						
						// take the first bucket
						tabBuckets2 = sblBuckets.shift();
						
						for(var i = 0; i < sblBuckets.length; i++)
						{
							if( 0 < sblBuckets[i].length && undefined != typeof sblBuckets[i][0] && undefined != sblBuckets[i][0] && null != sblBuckets[i][0])
							{
								var hostname = (new URL(sblBuckets[i][0].url)).hostname;
								if(debugging)console.log("working on bucket '"+hostname+"', with length "+sblBuckets[i].length);
								if('' == hostname)
								{
									console.log("found a blank hostname?  What is this guy?\n"+JSON.stringify(sblBuckets[i]));
								}
								
								// we have two hardcoded domains we wish to weave within itself; webtoons and gocomics.  Eventually we plan to make this user-configurable
								if(hostname in hardcodedSubWeaves)
									sblBuckets[i] = subweave(sblBuckets[i],hardcodedSubWeaves[hostname],debugging);
								
								if(debugging)console.log("Calculating tab frequency by taking the total number of tabs '"+tabBuckets2.length+"' and dividing by the size of our bucket '"+sblBuckets[i].length+"'");
								
								// we deliberately do *not* truncate or round to int here.  if we did, the frequency would end up bunching.
								var tbfqncy = tabBuckets2.length/sblBuckets[i].length;
								
								/*
								 * Two edge cases; 
								 * If tbfqncy is < 1, we are attempting to weave a bucket larger than the current result set.
								 * If tbfqncy == 1, we are attempting to weave a bucket exactly the same size as the current result set.
								 * In both of these cases we do a simple interleaving weave, and ignore any long run of the same domain (later weaves should
								 * get that sorted)
								 */
								if(1 >= tbfqncy)
								{
									var tmpBuck = [];
									while(0 < tabBuckets2.length && 0 < sblBuckets[i].length)
									{
										// take a tab from the larger (or equal in size) bucket first
										if(0 < sblBuckets[i].length)
											tmpBuck.push(sblBuckets[i].shift());
										
										if(0 < tabBuckets2.length)
											tmpBuck.push(tabBuckets2.shift());
									}
									tabBuckets2 = tmpBuck;
									// we are done with this bucket; continue to the next
									continue;
								}
								
								//// calculate an offset some value less than the frequency length.  We'll only apply it for buckets even in length
								//var insrtOffst = 0;
								//if(0 == sblBuckets[i].length % 2)
								//	insrtOffst = i % tbfqncy;
								// We calculate an offset half the frequency so we aren't always inserting the first element
								//var insrtOffst = tbfqncy/2;
								var insrtOffst = 0;
								// for even numbered buckets
								if(0 == sblBuckets[i].length % 2)
									// Set the offset to the frequency modulo bucket number.  This will slightly promote large buckets to the left, and 
									// smaller towards the right, but limit the range the first tab small buckets occur at.
									insrtOffst = tbfqncy % (i+1); // index starts at 0, and we don't wanna modulo 0!
								
								// distribute the tabs
								for(var j = 0; j < sblBuckets[i].length; j++)
								{
									if(debugging)console.log("inserting into tabBuckets2 with frequency "+tbfqncy);
									
									var clcIndx = (tbfqncy * j)+j; // note that we add j; this accounts for the array growing in size as we insert items
									
									// for even-lengthed items, we begin our inserts at an offset within its frequency
									clcIndx += insrtOffst;
									
									if(debugging)console.log("calculated index into tabBuckets2 is " + clcIndx );
									
									// If we are trying to insert past the end of the array, just append
									if(clcIndx > tabBuckets2.length)
										tabBuckets2.push(sblBuckets[i][j]);
									else
										tabBuckets2.splice(Math.round(clcIndx),0,sblBuckets[i][j]);
									
								}
							}
							else
							{
								console.log("Warning; found a bucket we couldn't process. it looks like:"+JSON.stringify(sblBuckets[i]));
							}
						}
						// now do a simple weave the singles back in
						//for(var i = 1; i < tabBuckets2.length; i+=2)
						//	if(0 == singles.length)
						//		break;
						//	else if(i+2 < tabBuckets2.length)
						//		tabBuckets2.splice(i,0,singles.shift());
						//	else
						//		while(0 < singles.length)
						//			tabBuckets2.push(singles.shift())
						//for (var i = 0; i < (singles.length * 2); i+=2)
						//	if(i < tabBuckets2.length)
						//		tabBuckets2.splice(i,0,singles.shift());
						var sindx = 1;
						while(singles.length)
						{
							if(sindx < tabBuckets2.length)
								tabBuckets2.splice(sindx,0,singles.shift());
							else
								tabBuckets2.push(singles.shift());
							sindx+=2;
						}
						
						//if(debugging)console.log("our tabBuckets2 looks like:"+JSON.stringify(tabBuckets2));
						
						// prune empty cells
						var newTabList = [];
						for(var i = 0; i < tabBuckets2.length; i++ )
							if(null != tabBuckets2[i])
								newTabList.push(tabBuckets2[i]);
						
						// this message isn't very useful. :P
						//if(debugging)console.log("our pruned newTabList looks like:"+JSON.stringify(newTabList));
						if(debugging)console.log("our pruned newTabList looks like:"+JSON.stringify(newTabList.map((tab) => { return (null == tab ? "" : tab.url); })));
						
						return browser.tabs.move(
							newTabList.map((tab) => { return tab.id; }),
							{ index : num_pinned }
						);
					}, onError);
}

/*
 * This version is identical to v1, but only operates on the leftmost 10%+sqrt(tab_count)
 */
function weaveByDomain_v1_leftTenPercent_old()
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
						
						// get the count of tabs we will be processing today
						var tabCnt = Math.ceil((0.1 * normalTabs.length) + Math.sqrt(normalTabs.length));
						
						console.log("Sorting normal " + tabCnt.toString());
						console.log("Starting at index " + num_pinned);
						
						// create lists of lists of tabs
						var tabBuckets = {};
						
						//if(debugging)console.log("number of tabs we are working with: "+(normalTabs.length - num_pinned));
						if(debugging)console.log("number of tabs we are working with: "+tabCnt);
						
						// prepopulate with domains
						for(var i = 0 ; i < tabCnt; i++)
							tabBuckets[""+(new URL(normalTabs[i].url).hostname)+""] = [];
						
						if(debugging)console.log("tabBuckets looks like:'"+JSON.stringify(tabBuckets)+"'");
						
						// add to our buckets 
						for(var i = 0 ; i < tabCnt; i++)
						{
							var hostname = new URL(normalTabs[i].url).hostname;
							
							if(debugging)console.log("Pushing tab '"+normalTabs[i].url+"' to bucket '"+hostname+"'");
							
							tabBuckets[""+hostname+""].push(normalTabs[i]);
						}
						
						// distribute our buckets over a new array of arrays, the outter the size of our tab count
						var tabBuckets2 = [];
						
						// convert our object of buckets into a sorted-by-length array of buckets
						var sblBuckets = [];
						for(var foo in tabBuckets)
							sblBuckets.push(tabBuckets[foo]);
						
						// sort 
						sblBuckets.sort(compareByArrLenDesc);
						//sblBuckets.sort(compareByArrLenAsc);
						
						// collect the "singles" into it's own bucket
						var singles = [];
						for(var i = 0; i < sblBuckets.length; i++)
							if(1 == sblBuckets[i].length)
								singles.unshift(sblBuckets[i].shift());
							else
								break;
						// clean the buckets
						var buckBuf = [];
						for(var i = 0; i < sblBuckets.length; i++)
							if(0 < sblBuckets[i].length)
								buckBuf.push(sblBuckets[i]);
						sblBuckets = buckBuf;
						
						/*
						 * Now we distribute the buckets.
						 * Our new algo takes the smallest bucket and weaves the next largest into it, then the next largest into it, etc., etc., until all the
						 * buckets have been woven in.  
						 * This may result in a reasonably homogeneous weave of tabs.
						 */
						
						// take the first bucket
						tabBuckets2 = sblBuckets.shift();
						
						for(var i = 0; i < sblBuckets.length; i++)
						{
							if( 0 < sblBuckets[i].length && undefined != typeof sblBuckets[i][0] && undefined != sblBuckets[i][0] && null != sblBuckets[i][0])
							{
								var hostname = (new URL(sblBuckets[i][0].url)).hostname;
								if(debugging)console.log("working on bucket '"+hostname+"', with length "+sblBuckets[i].length);
								if('' == hostname)
								{
									console.log("found a blank hostname?  What is this guy?\n"+JSON.stringify(sblBuckets[i]));
								}
								
								// we have two hardcoded domains we wish to weave within itself; webtoons and gocomics.  Eventually we plan to make this user-configurable
								if(hostname in hardcodedSubWeaves)
									sblBuckets[i] = subweave(sblBuckets[i],hardcodedSubWeaves[hostname],debugging);
								
								if(debugging)console.log("Calculating tab frequency by taking the total number of tabs '"+tabBuckets2.length+"' and dividing by the size of our bucket '"+sblBuckets[i].length+"'");
								
								// we deliberately do *not* truncate or round to int here.  if we did, the frequency would end up bunching.
								//var tbfqncy = tabBuckets2.length/sblBuckets[i].length;
								var tbfqncy = tabCnt / sblBuckets[i].length;
								
								/*
								 * Two edge cases; 
								 * If tbfqncy is < 1, we are attempting to weave a bucket larger than the current result set.
								 * If tbfqncy == 1, we are attempting to weave a bucket exactly the same size as the current result set.
								 * In both of these cases we do a simple interleaving weave, and ignore any long run of the same domain (later weaves should
								 * get that sorted)
								 */
								if(1 >= tbfqncy)
								{
									var tmpBuck = [];
									while(0 < tabBuckets2.length && 0 < sblBuckets[i].length)
									{
										// take a tab from the larger (or equal in size) bucket first
										if(0 < sblBuckets[i].length)
											tmpBuck.push(sblBuckets[i].shift());
										
										if(0 < tabBuckets2.length)
											tmpBuck.push(tabBuckets2.shift());
									}
									tabBuckets2 = tmpBuck;
									// we are done with this bucket; continue to the next
									continue;
								}
								
								//// calculate an offset some value less than the frequency length.  We'll only apply it for buckets even in length
								//var insrtOffst = 0;
								//if(0 == sblBuckets[i].length % 2)
								//	insrtOffst = i % tbfqncy;
								// We calculate an offset half the frequency so we aren't always inserting the first element
								//var insrtOffst = tbfqncy/2;
								var insrtOffst = 0;
								//// for even numbered buckets
								//if(0 == sblBuckets[i].length % 2)
								//	// Set the offset to the frequency modulo bucket number.  This will slightly promote large buckets to the left, and 
								//	// smaller towards the right, but limit the range the first tab small buckets occur at.
								//	insrtOffst = tbfqncy % (i+1); // index starts at 0, and we don't wanna modulo 0!
								
								//// Slightly adjust the frequency based on the relative size of the two arrays
								//// Note that we add 1 here so we don't have to in our loop below
								//tbfqncy = (tbfqncy - (1/tbfqncy));
								
								//// the highest frequency is 2, or every other tab.  
								//while(1 > tbfqncy)
								//	tbfqncy += (1/tbfqncy);
								
								// distribute the tabs
								var lastIndx = 0;
								for(var j = 0; j < sblBuckets[i].length; j++)
								{
									if(debugging)console.log("inserting into tabBuckets2 with frequency "+tbfqncy);
									
									//var clcIndx = (tbfqncy * j)+j;
									var clcIndx = tbfqncy + lastIndx;
									
									// ensure inserts occur after the last
									if(1 < clcIndx - lastIndx)
										clcIndx++;
									
									//// for even-lengthed items, we begin our inserts at an offset within its frequency
									//clcIndx += insrtOffst;
									
									//// if we are about to insert before our last insert, update the index
									//if(lastIndx >= Math.round(clcIndx))
									//{
									//	// set this insert to +1 after the last
									//	clcIndx = 1 + lastIndx;
									//	// update the frequency to shift future tabs outward a bit
									//	tbfqncy += 1/tbfqncy;
									//}
									
									if(debugging)console.log("calculated index into tabBuckets2 is " + clcIndx );
									
									// If we are trying to insert past the end of the array, just append
									if(clcIndx > tabBuckets2.length)
										tabBuckets2.push(sblBuckets[i][j]);
									else
										tabBuckets2.splice(Math.round(clcIndx),0,sblBuckets[i][j]);
									
									lastIndx = clcIndx;
								}
							}
							else
							{
								console.log("Warning; found a bucket we couldn't process. it looks like:"+JSON.stringify(sblBuckets[i]));
							}
						}
						// now do a simple weave the singles back in
						//for(var i = 1; i < tabBuckets2.length; i+=2)
						//	if(0 == singles.length)
						//		break;
						//	else if(i+2 < tabBuckets2.length)
						//		tabBuckets2.splice(i,0,singles.shift());
						//	else
						//		while(0 < singles.length)
						//			tabBuckets2.push(singles.shift())
						//for (var i = 0; i < (singles.length * 2); i+=2)
						//	if(i < tabBuckets2.length)
						//		tabBuckets2.splice(i,0,singles.shift());
						var sfq = tabBuckets2.length / singles.length;
						var sindx = sfq/2;
						while(singles.length)
						{
							if(sindx < tabBuckets2.length)
								tabBuckets2.splice(sindx,0,singles.shift());
							else
								tabBuckets2.push(singles.shift());
							sindx+=sfq;
						}
						
						//if(debugging)console.log("our tabBuckets2 looks like:"+JSON.stringify(tabBuckets2));
						
						// prune empty cells
						var newTabList = [];
						for(var i = 0; i < tabBuckets2.length; i++ )
							if(null != tabBuckets2[i])
								newTabList.push(tabBuckets2[i]);
						
						// this message isn't very useful. :P
						//if(debugging)console.log("our pruned newTabList looks like:"+JSON.stringify(newTabList));
						if(debugging)console.log("our pruned newTabList looks like:"+JSON.stringify(newTabList.map((tab) => { return (null == tab ? "" : tab.url); })));
						
						return browser.tabs.move(
							newTabList.map((tab) => { return tab.id; }),
							{ index : num_pinned }
						);
					}, onError);
}

/*
 * This version is identical to v1, but only operates on the leftmost 10%+sqrt(tab_count)
 */
function weaveByDomain_v1_leftTenPercent()
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
						console.log("Starting at index " + num_pinned);
						
						// get the count of tabs we will be processing today
						var tabCnt = Math.ceil((0.1 * normalTabs.length) + Math.sqrt(normalTabs.length));
						
						var newTabList = SharedWeaveFunc_v2(normalTabs,tabCnt);
						
						return browser.tabs.move(
							newTabList.map((tab) => { return tab.id; }),
							{ index : num_pinned }
						);
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
						console.log("Starting at index " + num_pinned);
						
						// get the count of tabs we will be processing today
						var tabCnt = normalTabs.length;
						
						var newTabList = SharedWeaveFunc_v2(normalTabs,tabCnt,debugging);
						
						return browser.tabs.move(
							newTabList.map((tab) => { return tab.id; }),
							{ index : num_pinned }
						);
					}, onError);
}

function weaveByDomain_v3(weaveMethod)
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
						console.log("Starting at index " + num_pinned);
						
						// get the count of tabs we will be processing today
						var tabCnt = 0;
						
						var newTabList = null;
						
						if("basic" == weaveMethod)
						{
							tabCnt = normalTabs.length;
							newTabList = weaveByDomain_basic(normalTabs,tabCnt,debugging);
						}
						else if ("basic_left10" == compName)
						{
							tabCnt = Math.ceil(0.1 * normalTabs.length + Math.sqrt(normalTabs.length));
							newTabList = weaveByDomain_basic(normalTabs,tabCnt,debugging);
						}
						else if ("basic_v2" == compName)
						{
							tabCnt = normalTabs.length;
							newTabList = weaveByDomain_v2(normalTabs,tabCnt,debugging);
						}
						else if ("basic_v2_Left10" == compName)
						{
							tabCnt = Math.ceil(0.1 * normalTabs.length + Math.sqrt(normalTabs.length));
							newTabList = weaveByDomain_v2(normalTabs,tabCnt,debugging);
						}
						 = SharedWeaveFunc_v2(normalTabs,tabCnt,debugging);
						
						return browser.tabs.move(
							newTabList.map((tab) => { return tab.id; }),
							{ index : num_pinned }
						);
					}, onError);
}


function weaveByDomain_basic(normalTabs,tabCnt,debugging)
{
	console.log("sorting "+tabCnt.toString());
	console.log("Starting at index " + num_pinned);
	
	// create lists of lists of tabs
	var tabBuckets = {};
	
	//if(debugging)console.log("number of tabs we are working with: "+(normalTabs.length - num_pinned));
	if(debugging)console.log("number of tabs we are working with: "+normalTabs.length);
	
	// prepopulate with domains
	for(var i = 0 ; i < tabCnt; i++)
		tabBuckets[""+(new URL(normalTabs[i].url).hostname)+""] = [];
	
	if(debugging)console.log("tabBuckets looks like:'"+JSON.stringify(tabBuckets)+"'");
	
	// add to our buckets 
	for(var i = 0 ; i < tabCnt; i++)
	{
		var hostname = new URL(normalTabs[i].url).hostname;
		
		if(debugging)console.log("Pushing tab '"+normalTabs[i].url+"' to bucket '"+hostname+"'");
		
		tabBuckets[""+hostname+""].push(normalTabs[i]);
	}
	
	// distribute our buckets over a new array of arrays, the outter the size of our tab count
	var tabBuckets2 = [];
	
	// convert our object of buckets into a sorted-by-length array of buckets
	var sblBuckets = [];
	for(var foo in tabBuckets)
		sblBuckets.push(tabBuckets[foo]);
	
	// sort 
	//sblBuckets.sort(compareByArrLenDesc);
	sblBuckets.sort(compareByArrLenAsc);
	
	// collect the "singles" into it's own bucket
	var singles = [];
	for(var i = 0; i < sblBuckets.length; i++)
		if(1 == sblBuckets[i].length)
			singles.unshift(sblBuckets[i].shift());
		else
			break;
	// clean the buckets
	var buckBuf = [];
	for(var i = 0; i < sblBuckets.length; i++)
		if(0 < sblBuckets[i].length)
			buckBuf.push(sblBuckets[i]);
	sblBuckets = buckBuf;
	
	/*
	 * Now we distribute the buckets.
	 * Our new algo takes the smallest bucket and weaves the next largest into it, then the next largest into it, etc., etc., until all the
	 * buckets have been woven in.  
	 * This may result in a reasonably homogeneous weave of tabs.
	 */
	
	// take the first bucket
	tabBuckets2 = sblBuckets.shift();
	
	for(var i = 0; i < sblBuckets.length; i++)
	{
		if( 0 < sblBuckets[i].length && undefined != typeof sblBuckets[i][0] && undefined != sblBuckets[i][0] && null != sblBuckets[i][0])
		{
			var hostname = (new URL(sblBuckets[i][0].url)).hostname;
			if(debugging)console.log("working on bucket '"+hostname+"', with length "+sblBuckets[i].length);
			if('' == hostname)
			{
				console.log("found a blank hostname?  What is this guy?\n"+JSON.stringify(sblBuckets[i]));
			}
			
			// we have two hardcoded domains we wish to weave within itself; webtoons and gocomics.  Eventually we plan to make this user-configurable
			if(hostname in hardcodedSubWeaves)
				sblBuckets[i] = subweave(sblBuckets[i],hardcodedSubWeaves[hostname],debugging);
			
			if(debugging)console.log("Calculating tab frequency by taking the total number of tabs '"+tabBuckets2.length+"' and dividing by the size of our bucket '"+sblBuckets[i].length+"'");
			
			// we deliberately do *not* truncate or round to int here.  if we did, the frequency would end up bunching.
			var tbfqncy = tabBuckets2.length/sblBuckets[i].length;
			
			/*
			 * Two edge cases; 
			 * If tbfqncy is < 1, we are attempting to weave a bucket larger than the current result set.
			 * If tbfqncy == 1, we are attempting to weave a bucket exactly the same size as the current result set.
			 * In both of these cases we do a simple interleaving weave, and ignore any long run of the same domain (later weaves should
			 * get that sorted)
			 */
			if(1 >= tbfqncy)
			{
				var tmpBuck = [];
				while(0 < tabBuckets2.length && 0 < sblBuckets[i].length)
				{
					// take a tab from the larger (or equal in size) bucket first
					if(0 < sblBuckets[i].length)
						tmpBuck.push(sblBuckets[i].shift());
					
					if(0 < tabBuckets2.length)
						tmpBuck.push(tabBuckets2.shift());
				}
				tabBuckets2 = tmpBuck;
				// we are done with this bucket; continue to the next
				continue;
			}
			
			//// calculate an offset some value less than the frequency length.  We'll only apply it for buckets even in length
			//var insrtOffst = 0;
			//if(0 == sblBuckets[i].length % 2)
			//	insrtOffst = i % tbfqncy;
			// We calculate an offset half the frequency so we aren't always inserting the first element
			//var insrtOffst = tbfqncy/2;
			var insrtOffst = 0;
			// for even numbered buckets
			if(0 == sblBuckets[i].length % 2)
				// Set the offset to the frequency modulo bucket number.  This will slightly promote large buckets to the left, and 
				// smaller towards the right, but limit the range the first tab small buckets occur at.
				insrtOffst = tbfqncy % (i+1); // index starts at 0, and we don't wanna modulo 0!
			
			// distribute the tabs
			for(var j = 0; j < sblBuckets[i].length; j++)
			{
				if(debugging)console.log("inserting into tabBuckets2 with frequency "+tbfqncy);
				
				var clcIndx = (tbfqncy * j)+j; // note that we add j; this accounts for the array growing in size as we insert items
				
				// for even-lengthed items, we begin our inserts at an offset within its frequency
				clcIndx += insrtOffst;
				
				if(debugging)console.log("calculated index into tabBuckets2 is " + clcIndx );
				
				// If we are trying to insert past the end of the array, just append
				if(clcIndx > tabBuckets2.length)
					tabBuckets2.push(sblBuckets[i][j]);
				else
					tabBuckets2.splice(Math.round(clcIndx),0,sblBuckets[i][j]);
				
			}
		}
		else
		{
			console.log("Warning; found a bucket we couldn't process. it looks like:"+JSON.stringify(sblBuckets[i]));
		}
	}
	// now do a simple weave the singles back in
	//for(var i = 1; i < tabBuckets2.length; i+=2)
	//	if(0 == singles.length)
	//		break;
	//	else if(i+2 < tabBuckets2.length)
	//		tabBuckets2.splice(i,0,singles.shift());
	//	else
	//		while(0 < singles.length)
	//			tabBuckets2.push(singles.shift())
	//for (var i = 0; i < (singles.length * 2); i+=2)
	//	if(i < tabBuckets2.length)
	//		tabBuckets2.splice(i,0,singles.shift());
	var sindx = 1;
	while(singles.length)
	{
		if(sindx < tabBuckets2.length)
			tabBuckets2.splice(sindx,0,singles.shift());
		else
			tabBuckets2.push(singles.shift());
		sindx+=2;
	}
	
	//if(debugging)console.log("our tabBuckets2 looks like:"+JSON.stringify(tabBuckets2));
	
	// prune empty cells
	var newTabList = [];
	for(var i = 0; i < tabBuckets2.length; i++ )
		if(null != tabBuckets2[i])
			newTabList.push(tabBuckets2[i]);
	
	// this message isn't very useful. :P
	//if(debugging)console.log("our pruned newTabList looks like:"+JSON.stringify(newTabList));
	if(debugging)console.log("our pruned newTabList looks like:"+JSON.stringify(newTabList.map((tab) => { return (null == tab ? "" : tab.url); })));
	
	return newTabList;
}

function weaveByDomain_v2(normalTabs,tabCnt,debugging)
{
	// create lists of lists of tabs
	var tabBuckets = {};
	
	if(debugging)console.log("number of tabs we are working with: "+tabCnt);
	
	// prepopulate with domains
	for(var i = 0 ; i < tabCnt; i++)
		tabBuckets[""+(new URL(normalTabs[i].url).hostname)+""] = [];
	
	if(debugging)console.log("tabBuckets looks like:'"+JSON.stringify(tabBuckets)+"'");
	
	// add to our buckets 
	for(var i = 0 ; i < tabCnt; i++)
	{
		var hostname = new URL(normalTabs[i].url).hostname;
		
		if(debugging)console.log("Pushing tab '"+normalTabs[i].url+"' to bucket '"+hostname+"'");
		
		tabBuckets[""+hostname+""].push(normalTabs[i]);
	}
	
	
	// convert our object of buckets into a sorted-by-length array of buckets
	var sblBuckets = [];
	for(var foo in tabBuckets)
		sblBuckets.push(tabBuckets[foo]);
	
	// sort 
	//sblBuckets.sort(compareByArrLenDesc);
	//sblBuckets.sort(compareByArrLenAsc);
	
	// collect the "singles" into its own bucket
	var singles = [];
	for(var i = 0; i < sblBuckets.length; i++)
		if(1 == sblBuckets[i].length)
			singles.unshift(sblBuckets[i].shift()); // singles have no order.  with .unshift(), subsequent runs will reverse their order, ensuring balance to the force
		else
		{
			var hostname = (new URL(sblBuckets[i][0].url)).hostname;
			if(debugging)console.log("working on bucket '"+hostname+"', with length "+sblBuckets[i].length);
			if('' == hostname)
			{
				console.log("found a blank hostname?  What is this guy?\n"+JSON.stringify(sblBuckets[i]));
			}
			
			// we have two hardcoded domains we wish to weave within itself; webtoons and gocomics.  We plan to eventually make this user-configurable
			if(hostname in hardcodedSubWeaves)
				sblBuckets[i] = subweave_v3(sblBuckets[i],hardcodedSubWeaves[hostname],debugging);
		}
	// add the singles back as a bucket
	sblBuckets.push(singles);
	
	// clean the buckets
	var buckBuf = [];
	for(var i = 0; i < sblBuckets.length; i++)
		if(0 < sblBuckets[i].length)
			buckBuf.push(sblBuckets[i]);
	sblBuckets = buckBuf;
	
	// use our new weave 
	sblBuckets = mergeArrays_weighted(sblBuckets);
	
	//if(debugging)console.log("our tabBuckets2 looks like:"+JSON.stringify(tabBuckets2));
	
	// prune empty cells
	var newTabList = [];
	for(var i = 0; i < sblBuckets.length; i++ )
		if(null != sblBuckets[i])
			newTabList.push(sblBuckets[i]);
	
	// this message isn't very useful. :P
	//if(debugging)console.log("our pruned newTabList looks like:"+JSON.stringify(newTabList));
	if(debugging)console.log("our pruned newTabList looks like:"+JSON.stringify(newTabList.map((tab) => { return (null == tab ? "" : tab.url); })));
	
	return newTabList;
}

/*
 * This version is identical to v2, but only operates on the leftern 10% (maybe + sqrt(tab_count))
 */
function weaveByDomain_v2_leftTenPercent()
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
						// get the count of tabs we will be processing today
						var tabCnt = Math.ceil((0.1 * normalTabs.length) + Math.sqrt(normalTabs.length));
						
						console.log("Sorting normal " + tabCnt.toString());
						console.log("Starting at index " + num_pinned);
						
						// create lists of lists of tabs
						var tabBuckets = {};
						
						//if(debugging)console.log("number of tabs we are working with: "+(normalTabs.length - num_pinned));
						if(debugging)console.log("number of tabs we are working with: "+tabCnt);
						
						// prepopulate with domains
						for(var i = 0 ; i < tabCnt; i++)
							tabBuckets[""+(new URL(normalTabs[i].url).hostname)+""] = [];
						
						if(debugging)console.log("tabBuckets looks like:'"+JSON.stringify(tabBuckets)+"'");
						
						// add to our buckets 
						for(var i = 0 ; i < tabCnt; i++)
						{
							var hostname = new URL(normalTabs[i].url).hostname;
							
							if(debugging)console.log("Pushing tab '"+normalTabs[i].url+"' to bucket '"+hostname+"'");
							
							tabBuckets[""+hostname+""].push(normalTabs[i]);
						}
						
						
						// convert our object of buckets into a sorted-by-length array of buckets
						var sblBuckets = [];
						for(var foo in tabBuckets)
							sblBuckets.push(tabBuckets[foo]);
						
						// sort 
						//sblBuckets.sort(compareByArrLenDesc);
						//sblBuckets.sort(compareByArrLenAsc);
						
						// collect the "singles" into its own bucket
						var singles = [];
						for(var i = 0; i < sblBuckets.length; i++)
							if(1 == sblBuckets[i].length)
								singles.unshift(sblBuckets[i].shift()); // singles have no order.  with .unshift(), subsequent runs will reverse their order, ensuring balance to the force
							else
							{
								var hostname = (new URL(sblBuckets[i][0].url)).hostname;
								if(debugging)console.log("working on bucket '"+hostname+"', with length "+sblBuckets[i].length);
								if('' == hostname)
								{
									console.log("found a blank hostname?  What is this guy?\n"+JSON.stringify(sblBuckets[i]));
								}
								
								// we have two hardcoded domains we wish to weave within itself; webtoons and gocomics.  We plan to eventually make this user-configurable
								if(hostname in hardcodedSubWeaves)
									sblBuckets[i] = subweave_v3(sblBuckets[i],hardcodedSubWeaves[hostname],debugging);
							}
						// add the singles back as a bucket
						sblBuckets.push(singles);
						
						// clean the buckets
						var buckBuf = [];
						for(var i = 0; i < sblBuckets.length; i++)
							if(0 < sblBuckets[i].length)
								buckBuf.push(sblBuckets[i]);
						sblBuckets = buckBuf;
						
						// use our new weave 
						sblBuckets = mergeArrays_weighted(sblBuckets);
						
						//if(debugging)console.log("our tabBuckets2 looks like:"+JSON.stringify(tabBuckets2));
						
						// prune empty cells
						var newTabList = [];
						for(var i = 0; i < sblBuckets.length; i++ )
							if(null != sblBuckets[i])
								newTabList.push(sblBuckets[i]);
						
						// this message isn't very useful. :P
						//if(debugging)console.log("our pruned newTabList looks like:"+JSON.stringify(newTabList));
						if(debugging)console.log("our pruned newTabList looks like:"+JSON.stringify(newTabList.map((tab) => { return (null == tab ? "" : tab.url); })));
						
						return browser.tabs.move(
							newTabList.map((tab) => { return tab.id; }),
							{ index : num_pinned }
						);
					}, onError);
}


/*
 * This function should be called by either the "sort all the tabs" or "sort a subset of tabs" sorts of functions, 
 * like weaveByDomain*() and weaveByDoimain*_leftTenPercent()
 */
function SharedWeaveFunc(normalTabs,tabCnt,debugging)
{
	console.log("Sorting normal " + tabCnt.toString());
	
	// create lists of lists of tabs
	var tabBuckets = {};
	
	if(debugging)console.log("number of tabs we are working with: "+tabCnt);
	
	// prepopulate with domains
	for(var i = 0 ; i < tabCnt; i++)
		tabBuckets[""+(new URL(normalTabs[i].url).hostname)+""] = [];
	
	if(debugging)console.log("tabBuckets looks like:'"+JSON.stringify(tabBuckets)+"'");
	
	// add to our buckets 
	for(var i = 0 ; i < tabCnt; i++)
	{
		var hostname = new URL(normalTabs[i].url).hostname;
		
		if(debugging)console.log("Pushing tab '"+normalTabs[i].url+"' to bucket '"+hostname+"'");
		
		tabBuckets[""+hostname+""].push(normalTabs[i]);
	}
	
	// distribute our buckets over a new array of arrays, the outter the size of our tab count
	var tabBuckets2 = [];
	
	// convert our object of buckets into a sorted-by-length array of buckets
	var sblBuckets = [];
	for(var foo in tabBuckets)
		sblBuckets.push(tabBuckets[foo]);
	
	// sort 
	//sblBuckets.sort(compareByArrLenDesc);
	//sblBuckets.sort(compareByArrLenAsc);
	
	// collect the "singles" into it's own bucket
	var singles = [];
	for(var i = 0; i < sblBuckets.length; i++)
		if(1 == sblBuckets[i].length)
			singles.unshift(sblBuckets[i].shift());
		else
		{
			// detect if this is our special case, subweave if required
			var hostname = (new URL(sblBuckets[i][0].url)).hostname;
			if(debugging)console.log("working on bucket '"+hostname+"', with length "+sblBuckets[i].length);
			if('' == hostname)
			{
				console.log("found a blank hostname?  What is this guy?\n"+JSON.stringify(sblBuckets[i]));
			}
			
			// we have two hardcoded domains we wish to weave within itself; webtoons and gocomics.  Eventually we plan to make this user-configurable
			if(hostname in hardcodedSubWeaves)
				sblBuckets[i] = subweave_v3(sblBuckets[i],hardcodedSubWeaves[hostname],debugging);
		}
	
	// clean the buckets from empty cells
	var buckBuf = [];
	for(var i = 0; i < sblBuckets.length; i++)
		if(0 < sblBuckets[i].length)
			buckBuf.push(sblBuckets[i]);
	sblBuckets = buckBuf;
	
	// add back our singles as its own bucket
	sblBuckets.push(singles);
	
	// sort 
	//sblBuckets.sort(compareByArrLenDesc); // mergeArrays2() conducts its own sort
	//sblBuckets.sort(compareByArrLenAsc);
	
	// weave
	var newTabList = mergeArrays2(sblBuckets);
	
	//if(debugging)console.log("our tabBuckets2 looks like:"+JSON.stringify(tabBuckets2));
	
	//// prune empty cells
	//var newTabList = [];
	//for(var i = 0; i < tabBuckets2.length; i++ )
	//	if(null != tabBuckets2[i])
	//		newTabList.push(tabBuckets2[i]);
	
	// this message isn't very useful. :P
	//if(debugging)console.log("our pruned newTabList looks like:"+JSON.stringify(newTabList));
	//if(debugging)console.log("our pruned newTabList looks like:"+JSON.stringify(newTabList.map((tab) => { return (null == tab ? "" : tab.url); })));
	
	return newTabList;
}


/*
 * This function should be called by either the "sort all the tabs" or "sort a subset of tabs" sorts of functions, 
 * like weaveByDomain*() and weaveByDoimain*_leftTenPercent()
 */
function SharedWeaveFunc_v2(normalTabs,tabCnt,debugging)
{
	console.log("Sorting normal " + tabCnt.toString());
	
	
	// create lists of lists of tabs
	var tabBuckets = {};
	
	if(debugging)console.log("number of tabs we are working with: "+tabCnt);
	
	// prepopulate with domains
	for(var i = 0 ; i < tabCnt; i++)
		tabBuckets[""+(new URL(normalTabs[i].url).hostname)+""] = [];
	
	if(debugging)console.log("tabBuckets looks like:'"+JSON.stringify(tabBuckets)+"'");
	
	// add to our buckets 
	for(var i = 0 ; i < tabCnt; i++)
	{
		var hostname = new URL(normalTabs[i].url).hostname;
		
		if(debugging)console.log("Pushing tab '"+normalTabs[i].url+"' to bucket '"+hostname+"'");
		
		tabBuckets[""+hostname+""].push({id: normalTabs[i].id, hostname: hostname, url: normalTabs[i].url});//normalTabs[i]);
	}
	
	// distribute our buckets over a new array of arrays, the outter the size of our tab count
	var tabBuckets2 = [];
	
	// convert our object of buckets into a sorted-by-length array of buckets
	var sblBuckets = [];
	for(var foo in tabBuckets)
		sblBuckets.push(tabBuckets[foo]);
	
	// sort 
	//sblBuckets.sort(compareByArrLenDesc);
	//sblBuckets.sort(compareByArrLenAsc);
	
	// collect the "singles" into it's own bucket
	var singles = [];
	for(var i = 0; i < sblBuckets.length; i++)
		if(1 == sblBuckets[i].length)
			singles.unshift(sblBuckets[i].shift());
		else
		{
			// detect if this is our special case, subweave if required
			//var hostname = (new URL(sblBuckets[i][0].url)).hostname;
			//if(debugging)console.log("working on bucket '"+hostname+"', with length "+sblBuckets[i].length);
			var hostname = sblBuckets[i][0].hostname;
			if(debugging)console.log("working on bucket '"+hostname+"', with length "+sblBuckets[i].length);
			if('' == hostname)
			{
				console.log("found a blank hostname?  What is this guy?\n"+JSON.stringify(sblBuckets[i]));
			}
			
			// we have two hardcoded domains we wish to weave within itself; webtoons and gocomics.  Eventually we plan to make this user-configurable
			if(hostname in hardcodedSubWeaves)
				sblBuckets[i] = subweave_v5(sblBuckets[i],hardcodedSubWeaves[hostname],debugging);
		}
	
	// clean the buckets from empty cells
	var buckBuf = [];
	for(var i = 0; i < sblBuckets.length; i++)
		if(0 < sblBuckets[i].length)
			buckBuf.push(sblBuckets[i]);
	sblBuckets = buckBuf;
	
	// add back our singles as its own bucket
	sblBuckets.push(singles);
	
	// sort 
	//sblBuckets.sort(compareByArrLenDesc); 
	//sblBuckets.sort(compareByArrLenAsc);
	
	// weave
	var newTabList = mergeArrays_postIndexDesperation_v1(sblBuckets);
	
	//if(debugging)console.log("our tabBuckets2 looks like:"+JSON.stringify(tabBuckets2));
	
	//// prune empty cells
	//var newTabList = [];
	//for(var i = 0; i < tabBuckets2.length; i++ )
	//	if(null != tabBuckets2[i])
	//		newTabList.push(tabBuckets2[i]);
	
	// this message isn't very useful. :P
	//if(debugging)console.log("our pruned newTabList looks like:"+JSON.stringify(newTabList));
	//if(debugging)console.log("our pruned newTabList looks like:"+JSON.stringify(newTabList.map((tab) => { return (null == tab ? "" : tab.url); })));
	
	return newTabList;
}



function subweave(sblBuckets,regex,debugging)
{
	// webtoons and gocomics are two edge cases where we want to redistribute comics from these domains within the bucket.
	
	if(debugging)console.log("Found hostname for webtoons or gocomics");
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
		
		if(null == cmcPath || 2 > cmcPath.length || '' == cmcPath[1])
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
		sblBuckets2.unshift(skippedTabs);
	}
	
	// sort 
	sblBuckets2.sort(compareByArrLenDesc);
	
	// distribute
	var replacementBucket = sblBuckets2.shift(); // pre-populate the array with the largest bucket
	for(var k = 0 ; k < sblBuckets2.length; k++)
	{
		var tbfqncy = replacementBucket.length/sblBuckets2[k].length;
		for(var j = 0; j < sblBuckets2[k].length; j++)
		{
			var clcIndx = (tbfqncy*j)+j; // note that we add j; this accounts for the array growing in size as we insert items
			
			// if the first two buckets are the same size, we'll calculate an index beyond the size we are inserting into
			if(clcIndx > replacementBucket.length)
				replacementBucket.push(sblBuckets2[k][j]);
			else
				replacementBucket.splice(Math.round(clcIndx),0,sblBuckets2[k][j]);
		}
	}
	if(debugging)console.log("replacing our webtoons bucket with:"+JSON.stringify(replacementBucket));
	//// replace the bucket
	//sblBuckets = replacementBucket;
	return replacementBucket;
}

function subweave_v2(sblBuckets,regex,debugging)
{
	// webtoons and gocomics are two edge cases where we want to redistribute comics from these domains within the bucket.
	
	if(debugging)console.log("Found hostname for webtoons or gocomics");
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
		
		if(null == cmcPath || 2 > cmcPath.length || '' == cmcPath[1])
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
		sblBuckets2.unshift(skippedTabs);
	}
	
	// weave
	var replacementBucket = mergeArrays(sblBuckets2);
	
	if(debugging)console.log("replacing our webtoons bucket with:"+JSON.stringify(replacementBucket));
	
	return replacementBucket;
}

/*
 * mergeArrays is a collaboration between ourself and the results of prodding BingChat into understanding what we want and generating the appropriate 
 * Javascript, which we had to fix.
 * We aren't so strong with math, and don't quite follow why this works, but testing in firefox console on various arrays of Strings appear to produce 
 * correct results....
 * 
 * To use this, the developer passes an array of arrays.
 * The returned object should be a flat array.
 */
function mergeArrays(arrays) 
{
	let result = [];
	let totalLen = arrays.reduce((acc, array) => acc + array.length, 0);
	arrays.sort((a, b) => b.length - a.length);
	let maxLen = Math.max(...arrays.map(array => array.length));
	for (let i = 0; i < totalLen; i++) {
		for (let array of arrays) {
			let numElements = Math.ceil((i + 1) * array.length / totalLen) - Math.ceil(i * array.length / totalLen);
			for (let j = 0; j < numElements; j++) {
				if (Math.ceil(i * array.length / totalLen) + j < array.length) {
					result.push(array[Math.ceil(i * array.length / totalLen) + j]);
				}
			}
		}
	}
	return result;
}

function subweave_v3(sblBuckets,regex,debugging)
{
	// webtoons and gocomics are two edge cases where we want to redistribute comics from these domains within the bucket.
	
	if(debugging)console.log("Found hostname for webtoons or gocomics");
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
		
		if(null == cmcPath || 2 > cmcPath.length || '' == cmcPath[1])
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
		sblBuckets2.unshift(skippedTabs);
	}
	
	// weave
	var replacementBucket = mergeArrays2(sblBuckets2);
	
	if(debugging)console.log("replacing our webtoons bucket with:"+JSON.stringify(replacementBucket));
	
	return replacementBucket;
}


function mergeArrays2(arrays)
{
	/*
	 * For this attempt we will weave the two smallest sub arrays together and resort the array of arrays, repeat until only one remains.
	 * To overcome the issue with inserts growing the size of the destination array, we start at the end and work our way towards the front.
	 */
	
	// if we were passed an array with zero sub arrays or one sub arrays, return early
	if(1 == arrays.length)
		return arrays[0];
	if(0 == arrays.length)
		return [];
	
	var debugging = true;
	
	// While our array of arrays is bigger than one, sort the set and merge the two smallest
	while(1 < arrays.length)
	{
		// ensure the arrays are in order
		arrays.sort((a, b) => b.length - a.length);
		
		// pull off the smaller
		var smallA = arrays.pop();
		
		// If we pulled off an array with no elements (how would this occur?), continue to the next iteration of the loop immediately
		if(null == smallA || 0 == smallA.length)
			continue;
		
		// pull off the bigger
		var bigA   = arrays.pop();
		
		// If these two arrays are the same size, every-other 'em
		if(smallA.length == bigA.length)
		{
			var tmpBuck = [];
			while(0 < smallA.length && 0 < bigA.length)
			{
				tmpBuck.push( smallA.shift() );
				tmpBuck.push(   bigA.shift() );
			}
			
			// add our new combined array to the original array of arrays
			arrays.push(tmpBuck);
			
			// we are done with this bucket; continue to the next
			continue;
		}
		
		// Discover the frequency we should be inserting the smaller into the bigger
		var tbfqncy = (bigA.length/smallA.length);
		//tbfqncy += 1 - 1/tbfqncy;
		
		// We calculate an offset half the frequency so we aren't always inserting the first element
		var insrtOffst = (smallA.length % tbfqncy)/2;
		
		
		// distribute the tabs
		var lastIndx = 0;
		for(var j = 0; j < smallA.length; j++)
		{
			if(debugging)console.log("inserting into bigA with frequency "+tbfqncy);
			
			// Calculate the index to insert at.  Note that we add j; this accounts for the array growing in size as we insert items
			//var clcIndx = (tbfqncy * j)+j; 
			var clcIndx = (tbfqncy * j);
			
			// for even-lengthed items, we begin our inserts at an offset within its frequency
			clcIndx += insrtOffst;
			
			//// if we are about to insert before our last insert, update the index
			//if(lastIndx >= Math.round(clcIndx))
			//{
			//	// set this insert to +1 after the last
			//	clcIndx = 1 + lastIndx;
			//	// update the frequency to shift future tabs outward a bit
			//	tbfqncy += 1/tbfqncy;
			//}
			if(1.5 > clcIndx - lastIndx)
				clcIndx += 1.5;
			
			if(debugging)console.log("calculated index into bigA is " + clcIndx );
			
			// If we are trying to insert past the end of the array, just append
			if(clcIndx > bigA.length)
				bigA.push(smallA[j]);
			else
				bigA.splice(Math.round(clcIndx),0,smallA[j]);
			
			lastIndx = clcIndx;
		}
		
		// add our new combined array to the original array of arrays
		arrays.push(bigA);
	}
	
	// our array of arrays should only contain a single array now.
	return arrays[0];
}


function mergeArrays_AlternatingRoundRobin(arrays)
{
	/*
	 * For this attempt we will weave the two smallest sub arrays together and resort the array of arrays, repeat until only one remains.
	 * This weave philosophy is to just every-other-tab, and alternate between starting on the left and starting on the right.
	 */
	
	// if we were passed an array with zero sub arrays or one sub arrays, return early
	if(1 == arrays.length)
		return arrays[0];
	if(0 == arrays.length)
		return [];
	
	var debugging = true;
	
	// While our array of arrays is bigger than one, sort the set and merge the two smallest
	while(1 < arrays.length)
	{
		// ensure the arrays are in order
		arrays.sort((a, b) => b.length - a.length);
		
		// pull off the smaller
		var smallA = arrays.pop();
		
		// If we pulled off an array with no elements (how would this occur?), continue to the next iteration of the loop immediately
		if(null == smallA || 0 == smallA.length)
			continue;
		
		// pull off the bigger
		var bigA   = arrays.pop();
		
		
		
		/*
		 * We start our weave either from the left or the right.
		 * We alternate by if the set of arrays we are weaving is even or odd.
		 */
		var tmpBuck = [];
		if(0 == arrays.length % 2 )
		{
			while( 0 < bigA.length)
			{
				if(0 < smallA.length)
					tmpBuck.push( smallA.shift() );
				tmpBuck.push(       bigA.shift() );
			}
		}
		else
		{
			while( 0 < bigA.length)
			{
				if(0 < smallA.length)
					tmpBuck.unshift( smallA.pop() );
				tmpBuck.unshift(       bigA.pop() );
			}
		}
		arrays.push(tmpBuck);
	}
	
	// our array of arrays should only contain a single array now.
	return arrays[0];
}



/*
 * Merge based on bucket need.
 */
function mergeArrays_postIndexDesperation_v1(arrays)
{
	/*
	 * This merge Arrays attempt will be based on keeping track of the last index each bucket inserted at and the current insert pointer, vs the frequency.
	 * At every insert, we check to see if the insert pointer is beyond the index for the next insert per bucket.  The bucket that needs the insert the most 
	 * wins.
	 */
	
	// get the total number of tabs we are working with today
	var totalTabs = arrays.reduce((currentCount, row) => currentCount + row.length, 0);
	
	// generate new objects for our tabs, so we can keep track of starting index, frequency, last insert
	var processingTabs = [];
	for(var i = 0; i < arrays.length; i++)
		processingTabs.push({
			  frequency:  (totalTabs / arrays[i].length) //((totalTabs - arrays[i].length) / arrays[i].length)
			, nxtInsrt: (totalTabs / arrays[i].length)/2 //0//-1 * totalTabs / arrays[i].length
			, lstInsrt: 0
			, tabs: arrays[i]
			, hostname: arrays[i][0].hostname
		});
	
//	for(var i = 0; i < processingTabs.length; i++)
//	{
//		//var hostname = (new URL(processingTabs[i].tabs[0].url)).hostname;
//		var hostname = processingTabs[i].hostname;
//		console.log(hostname + " :: frequency: "+processingTabs[i].frequency + " first index:"+processingTabs[i].nxtInsrt + " total tabs:"+processingTabs[i].tabs.length);
//	}
//	
//	console.log("Total tabs:"+totalTabs);
//	console.log(JSON.stringify(processingTabs));
	
	/*
	 * We have no idea what we are doing.
	 * We are going to try a simple algo:
	 * Round-robin evaluate each element in processingTabs.
	 * If the current pointer is greater than the last index plus frequency, generate a ratio of the difference.
	 * From the buckets that are pending an insert, use the most needed one
	 */
	var newTabs = [];
	for(var j = 0; j < totalTabs; j++)
	{
		var bestBucketIdx = 0;
		var bestBucketR = -1 * j;
		var foundBucket = false;
		for(var i = 0; i < processingTabs.length; i++)
		{
			// if we have emptied this bucket, skip it
			if(0 == processingTabs[i].tabs.length)
				continue;
			
			// If we used this bucket on the last insert, skip it
			if(i == bestBucketIdx)
				continue;
			
			// generate a ratio for this bucket
			var currentR = (j - processingTabs[i].nxtInsrt) / processingTabs[i].frequency;
			//var currentR = (j - processingTabs[i].lstInsrt) / processingTabs[i].frequency;
			
			// if the current bucket needs an insert more than the last most-needful one, update the pointer and needful ratio
			if(currentR >= bestBucketR)
			{
				bestBucketR = currentR;
				bestBucketIdx = i;
				foundBucket = true;
			}
		}
		
		// if we didn't find a bucket, pick the next valid bucket
		if(!foundBucket)
		{
			console.log("didn't find a bucket, so we are picking one");
			
			//// prevent endless loops
			//var startingIdx = bestBucketIdx;
			//while(true)
			//{
			//	// pick the next bucket (modulo to wrap)
			//	bestBucketIdx = (1 + bestBucketIdx) % processingTabs.length;
			//	// test if we have tested them all.  if so, break the loop and use what we have
			//	if(bestBucketIdx == startingIdx)
			//		break;
			//	// test if the bucket has anything to contribute
			//	if(0 == processingTabs[bestBucketIdx].tabs.length)
			//		continue;
			//	// we either have selected the bucket we started with, or the first valid bucket after this guy.  
			//	break;
			//}
			var oldestInsrt = j;
			for(var i = 0 ; i < processingTabs.length; i++)
			{
				// skip buckets that are empty
				if(0 == processingTabs[i].tabs.length)
					continue;
				
				// pick the oldest bucket
				if(oldestInsrt >= processingTabs[i].lstInsrt)
				{
					bestBucketIdx = i;
					oldestInsrt = processingTabs[i].lstInsrt;
				}
			}
		}
		
		// this shouldn't be possible, but just in case, test if there is anything in this bucket to contribute
		if(0 != processingTabs[bestBucketIdx].tabs.length)
		{
			// now assign from our most needed bucket.
			newTabs.push(processingTabs[bestBucketIdx].tabs.shift());
			
			// recalculate frequency
			var oldFq = processingTabs[bestBucketIdx].frequency;
			if(0 < processingTabs[bestBucketIdx].tabs.length)
				processingTabs[bestBucketIdx].frequency = Math.floor((totalTabs - j ) / processingTabs[bestBucketIdx].tabs.length);
			
			if(oldFq != processingTabs[bestBucketIdx].frequency)
				console.log("Updated frequency for bucket '"+processingTabs[bestBucketIdx].hostname+"' from '"+oldFq+"' to '"+processingTabs[bestBucketIdx].frequency+"'");
			
			// update the last inserted index
			//processingTabs[bestBucketIdx].nxtInsrt = processingTabs[bestBucketIdx].lstInsrt + processingTabs[bestBucketIdx].frequency;
			processingTabs[bestBucketIdx].nxtInsrt += processingTabs[bestBucketIdx].frequency;
			processingTabs[bestBucketIdx].lstInsrt = j;
		}
		else
		{
			// Now what?  we shouldn't have ever selected an emtpy bucket, but it appears we have.  How would we recover from this?  (How would this case even arise?)
			console.log("you should never see this message")
		}
		
	}
	
	// we should be done
	return newTabs;
}


function subweave_v4(sblBuckets,regex,debugging)
{
	// webtoons and gocomics are two edge cases where we want to redistribute comics from these domains within the bucket.
	
	if(debugging)console.log("Found hostname for webtoons or gocomics");
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
		
		if(null == cmcPath || 2 > cmcPath.length || '' == cmcPath[1])
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
		sblBuckets2.unshift(skippedTabs);
	}
	
	// weave
	var replacementBucket = mergeArrays_postIndexDesperation_v1(sblBuckets2);
	
	if(debugging)console.log("replacing our webtoons bucket with:"+JSON.stringify(replacementBucket));
	
	return replacementBucket;
}

function subweave_v5(sblBuckets,regex,debugging)
{
	// webtoons and gocomics are two edge cases where we want to redistribute comics from these domains within the bucket.
	
	if(debugging)console.log("Found hostname for webtoons or gocomics");
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
		
		if(null == cmcPath || 2 > cmcPath.length || '' == cmcPath[1])
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
		sblBuckets2.unshift(skippedTabs);
	}
	
	// weave
	var replacementBucket = mergeArrays_postIndexDesperation_v1(sblBuckets2);
	
	if(debugging)console.log("replacing our webtoons bucket with:"+JSON.stringify(replacementBucket));
	
	return replacementBucket;
}

function subweave_v6(mergFunc,sblBuckets,regex,debugging)
{
	// webtoons and gocomics are two edge cases where we want to redistribute comics from these domains within the bucket.
	
	if(debugging)console.log("Found hostname for webtoons or gocomics");
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
		
		if(null == cmcPath || 2 > cmcPath.length || '' == cmcPath[1])
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
		sblBuckets2.unshift(skippedTabs);
	}
	
	// weave
	var replacementBucket = mergFunc(sblBuckets2);
	
	if(debugging)console.log("replacing our webtoons bucket with:"+JSON.stringify(replacementBucket));
	
	return replacementBucket;
}



function mergeArrays_weighted(arrays)
{
	/*
	 * For this attempt we will weave the two smallest sub arrays together and resort the array of arrays, repeat until only one remains.
	 * To overcome the issue with inserts growing the size of the destination array, we start at the end and work our way towards the front.
	 * 
	 * Here we weight the results so larger domains will have their results appear slightly more often, promoting reading those entries at 
	 * a slightly higher frequency.  This adjustment is in proportion to their relative size.
	 */
	
	// if we were passed an array with zero sub arrays or one sub arrays, return early
	if(1 == arrays.length)
		return arrays[0];
	if(0 == arrays.length)
		return [];
	
	var debugging = true;
	
	// While our array of arrays is bigger than one, sort the set and merge the two smallest
	while(1 < arrays.length)
	{
		// ensure the arrays are in order
		arrays.sort((a, b) => b.length - a.length);
		
		// pull off the smaller
		var smallA = arrays.pop();
		
		// If we pulled off an array with no elements (how would this occur?), continue to the next iteration of the loop immediately
		if(null == smallA || 0 == smallA.length)
			continue;
		
		// pull off the bigger
		var bigA   = arrays.pop();
		
		// If these two arrays are the same size, every-other 'em
		if(smallA.length == bigA.length)
		{
			var tmpBuck = [];
			while(0 < smallA.length && 0 < bigA.length)
			{
				tmpBuck.push( smallA.shift() );
				tmpBuck.push(   bigA.shift() );
			}
			
			// add our new combined array to the original array of arrays
			arrays.push(tmpBuck);
			
			// we are done with this bucket; continue to the next
			continue;
		}
		
		// Discover the frequency we should be inserting the smaller into the bigger
		var tbfqncy = bigA.length/smallA.length;
		
		// Slightly adjust the frequency based on the relative size of the two arrays
		// Note that we add 1 here so we don't have to in our loop below
		tbfqncy = 1 + (tbfqncy - (1/tbfqncy));
		
		// We calculate an offset half the frequency so we aren't always inserting the first element
		var insrtOffst = tbfqncy/2;
		
		
		// distribute the tabs
		//var lastIndx = 0;
		for(var j = 0; j < smallA.length; j++)
		{
			if(debugging)console.log("inserting into bigA with frequency "+tbfqncy);
			
			// Calculate the index to insert at.  
			var clcIndx = (tbfqncy * j);
			
			// for even-lengthed items, we begin our inserts at an offset within its frequency
			clcIndx += insrtOffst;
			
			//// if we are about to insert before our last insert, update the index
			//if(lastIndx >= Math.round(clcIndx))
			//{
			//	// set this insert to +1 after the last
			//	clcIndx = 1 + lastIndx;
			//	// update the frequency to shift future tabs outward a bit
			//	tbfqncy += 1/tbfqncy;
			//}
			
			if(debugging)console.log("calculated index into bigA is " + clcIndx );
			
			// If we are trying to insert past the end of the array, just append
			if(clcIndx > bigA.length)
				bigA.push(smallA[j]);
			else
				bigA.splice(Math.round(clcIndx),0,smallA[j]);
			
			//lastIndx = Math.round(clcIndx);
		}
		
		// add our new combined array to the original array of arrays
		arrays.push(bigA);
	}
	
	// our array of arrays should only contain a single array now.
	return arrays[0];
}



function onError(error) {
  console.trace(error);
}
