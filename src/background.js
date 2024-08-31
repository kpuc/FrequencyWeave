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


//let menuIdToComparator = {
//	  "Weave-by-domain"    : weaveByDomain
//	, "Weave-by-domain-v1-LeftTenPercent" : weaveByDomain_v1_leftTenPercent
//	, "Weave-by-domain-v2" : weaveByDomain_v2
//	, "Weave-by-domain-v2-LeftTenPercent" : weaveByDomain_v2_leftTenPercent
//};

let hardcodedSubWeaves = {
	  "www.webtoons.com": /\/.*?\/.*?\/(.*?)\// 
	, "www.gocomics.com": /\/(.*?)\//           
}

// this guy appears to be called from sortabs.js
function sortTabsComparatorName(compName) 
{
	if("FrequencyWeave-by-domain" == compName)
		return weaveByDomain("basic");
	else if ("FrequencyWeave-by-domain-v1-LeftTenPercent" == compName)
		return weaveByDomain("basic_left10");
	
	else if ("FrequencyWeave-by-domain-v2" == compName)
		//return weaveByDomain_v2();
		return weaveByDomain("basic_v2");
	else if ("FrequencyWeave-by-domain-v2-LeftTenPercent" == compName)
		//return weaveByDomain_v2_leftTenPercent();
		return weaveByDomain("basic_v2_Left10");
		
	else if ("FrequencyWeave-by-domain-v3" == compName)
		return weaveByDomain("basic_v3");
	else if ("FrequencyWeave-by-domain-v3-LeftTenPercent" == compName)
		return weaveByDomain("basic_v3_Left10");
		
	// now some round-robin goodness, left to right
	else if ("FrequencyWeave-by-domain-RoundRobin-ltr" == compName)
		return weaveByDomain("roundRobin");
	else if ("FrequencyWeave-by-domain-RoundRobin-ltr-LeftTenPercent" == compName)
		return weaveByDomain("roundRobin_left10");
	// right to left
	else if ("FrequencyWeave-by-domain-RoundRobin-rtl" == compName)
		return weaveByDomain("roundRobin_rtl");
	else if ("FrequencyWeave-by-domain-RoundRobin-rtl-LeftTenPercent" == compName)
		return weaveByDomain("roundRobin_rtl_left10");
	
	return weaveByDomain();
}


function weaveByDomain(weaveMethod)
{
	let num_pinned = 0;
	
	let debugging = [];
	debugging = null; // uncomment to switch off debugging, comment to switch on
	
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
						console.log("Starting at index " + num_pinned + ", using method '"+weaveMethod+"'");
						
						// get the count of tabs we will be processing today
						var tabCnt = 0;
						
						var newTabList = null;
						
						if("basic" == weaveMethod)
						{
							tabCnt = normalTabs.length;
							newTabList = weaveByDomain_vZeroPointFour(normalTabs,tabCnt,debugging);
						}
						else if ("basic_left10" == weaveMethod)
						{
							tabCnt = Math.ceil(0.1 * normalTabs.length + Math.sqrt(normalTabs.length));
							newTabList = weaveByDomain_vZeroPointFour(normalTabs,tabCnt,debugging);
						}
						else if ("basic_v2" == weaveMethod)
						{
							tabCnt = normalTabs.length;
							newTabList = weaveByDomain_v2(normalTabs,tabCnt,debugging);
						}
						else if ("basic_v2_Left10" == weaveMethod)
						{
							tabCnt = Math.ceil(0.1 * normalTabs.length + Math.sqrt(normalTabs.length));
							newTabList = weaveByDomain_v2(normalTabs,tabCnt,debugging);
						}
						else if ("basic_v3" == weaveMethod)
						{
							tabCnt = normalTabs.length;
							newTabList = weaveByDomain_v3(normalTabs,tabCnt,mergeArrays_depositPerBucketNeed_v3,mergeArrays_RoundRobin_rtl,debugging);
						}
						else if ("basic_v3_Left10" == weaveMethod)
						{
							tabCnt = Math.ceil(0.1 * normalTabs.length + Math.sqrt(normalTabs.length));
							newTabList = weaveByDomain_v3(normalTabs,tabCnt,mergeArrays_depositPerBucketNeed_v3,mergeArrays_RoundRobin_rtl,debugging);
						}
						else if ("roundRobin" == weaveMethod)
						{
							tabCnt = normalTabs.length;
						// we might do this in version 2 -- upon further consideration, what is described in th comment below is 
						// probably not what we want afterall...
						//	// we subweave in the opposite direction, because by the very nature of round-robin weaves means
						//	// one side will be more likely to have a long run of the same domain.  By using that side in the 
						//	// "thick" end of the weave, we won't be as bothered by the same subdomain being "next to" each other
							//newTabList = weaveByDomain_v3_roundRobin_left(normalTabs,tabCnt,debugging);
							newTabList = weaveByDomain_v3(normalTabs,tabCnt,mergeBuckets_RoundRobin_ltr,mergeArrays_RoundRobin_rtl,debugging);
						}
						else if ("roundRobin_left10" == weaveMethod)
						{
							tabCnt = Math.ceil(0.1 * normalTabs.length + Math.sqrt(normalTabs.length));
							//newTabList = weaveByDomain_v3_roundRobin_left(normalTabs,tabCnt,debugging);
							newTabList = weaveByDomain_v3(normalTabs,tabCnt,mergeBuckets_RoundRobin_ltr,mergeArrays_RoundRobin_rtl,debugging);
						}
						else if ("roundRobin_rtl" == weaveMethod)
						{
							tabCnt = normalTabs.length;
							newTabList = weaveByDomain_v3(normalTabs,tabCnt,mergeBuckets_RoundRobin_rtl,mergeArrays_RoundRobin_rtl,debugging);
						}
						else if ("roundRobin_rtl_left10" == weaveMethod)
						{
							tabCnt = Math.ceil(0.1 * normalTabs.length + Math.sqrt(normalTabs.length));
							newTabList = weaveByDomain_v3(normalTabs,tabCnt,mergeBuckets_RoundRobin_rtl,mergeArrays_RoundRobin_rtl,debugging);
						}
						// = SharedWeaveFunc_v2(normalTabs,tabCnt,debugging);
						
						return browser.tabs.move(
							newTabList.map((tab) => { return tab.id; }),
							{ index : num_pinned }
						);
					}, onError).then(
						// if we have been debugging, log it
						(_) => 
						{
							if(debugging)
								console.log(debugging);
							return debugging;
						}, onError);
}

/*
 * This version is what shipped in 0.4 and what we've been using for a couple months with mostly decent success
 */
function weaveByDomain_vZeroPointFour(normalTabs,tabCnt,debugging)
{
	console.log("sorting "+tabCnt);
	
	// create lists of lists of tabs
	var tabBuckets = {};
	
	//if(debugging)debugging.push("number of tabs we are working with: "+(normalTabs.length - num_pinned));
	if(debugging)debugging.push("number of tabs we are working with: "+normalTabs.length);
	
	// prepopulate with domains
	for(var i = 0 ; i < tabCnt; i++)
		tabBuckets[""+(new URL(normalTabs[i].url).hostname)+""] = [];
	
	if(debugging)debugging.push("tabBuckets looks like:'"+JSON.stringify(tabBuckets)+"'");
	
	// add to our buckets 
	for(var i = 0 ; i < tabCnt; i++)
	{
		var hostname = new URL(normalTabs[i].url).hostname;
		
		if(debugging)debugging.push("Pushing tab '"+normalTabs[i].url+"' to bucket '"+hostname+"'");
		
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
			if(debugging)debugging.push("working on bucket '"+hostname+"', with length "+sblBuckets[i].length);
			if('' == hostname)
			{
				console.log("found a blank hostname?  What is this guy?\n"+JSON.stringify(sblBuckets[i]));
			}
			
			// we have two hardcoded domains we wish to weave within itself; webtoons and gocomics.  Eventually we plan to make this user-configurable
			if(hostname in hardcodedSubWeaves)
				sblBuckets[i] = subweave(sblBuckets[i],hardcodedSubWeaves[hostname],debugging);
			
			if(debugging)debugging.push("Calculating tab frequency by taking the total number of tabs '"+tabBuckets2.length+"' and dividing by the size of our bucket '"+sblBuckets[i].length+"'");
			
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
				if(debugging)debugging.push("inserting into tabBuckets2 with frequency "+tbfqncy);
				
				var clcIndx = (tbfqncy * j)+j; // note that we add j; this accounts for the array growing in size as we insert items
				
				// for even-lengthed items, we begin our inserts at an offset within its frequency
				clcIndx += insrtOffst;
				
				if(debugging)debugging.push("calculated index into tabBuckets2 is " + clcIndx );
				
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
	
	//if(debugging)debugging.push("our tabBuckets2 looks like:"+JSON.stringify(tabBuckets2));
	
	// prune empty cells
	var newTabList = [];
	for(var i = 0; i < tabBuckets2.length; i++ )
		if(null != tabBuckets2[i])
			newTabList.push(tabBuckets2[i]);
	
	// this message isn't very useful. :P
	//if(debugging)debugging.push("our pruned newTabList looks like:"+JSON.stringify(newTabList));
	if(debugging)debugging.push("our pruned newTabList looks like:"+JSON.stringify(newTabList.map((tab) => { return (null == tab ? "" : tab.url); })));
	
	return newTabList;
}

/*
 * Convert an array of tabs into our buckets object.
 */
function tabs2buckets(tabsArray,_debugging)
{
	var debugging = null;
	if(undefined != _debugging)
		debugging = _debugging;
	
	if(debugging)debugging.push("tabs2buckets(): sorting "+tabsArray.length + " tabs");
	
	// create lists of lists of tabs
	var tabBuckets = {};
	
	
	// prepopulate with domains
	for(var i = 0 ; i < tabsArray.length; i++)
		tabBuckets[""+(new URL(tabsArray[i].url).hostname)+""] = [];
	
	if(debugging)debugging.push("tabs2buckets(): tabBuckets looks like:'"+JSON.stringify(tabBuckets)+"'");
	
	// add to our buckets 
	for(var i = 0 ; i < tabsArray.length; i++)
		tabBuckets[""+(new URL(tabsArray[i].url).hostname)+""].push(tabsArray[i]);
	
	// convert these simple buckets to the buckets we actually care about
	
	// generate new objects for our tabs, so we can keep track of starting index, frequency, last insert
	var processingTabs = [];
	// for each of the properties in tabBuckets
	for(var foo in tabBuckets)
	//for(var i = 0; i < tabBuckets.length; i++)
	{
		if(debugging)debugging.push("tabs2buckets(): processing bucket '"+foo+"' with length "+tabBuckets[foo].length);
		processingTabs.push({
			  frequency : (tabsArray.length / tabBuckets[foo].length) 
			, nxtInsrt  : 0
			, lstInsrt  : 0.1 // -0.1 - (tabsArray.length / tabBuckets[foo].length  / 2 ) // 1 / tabBuckets[foo].length
			, tabs      : tabBuckets[foo]
			, hostname  : foo
		});
	}
	
	if(debugging)debugging.push("tabs2buckets(): processingTabs shoudl have the same number of buckets as tabBuckets; size: '"+processingTabs.length+"'");
	
	// enjoy your buckets!
	return processingTabs;
}

function weaveByDomain_v2(normalTabs,tabCnt,debugging)
{
	// convert array to buckets
	// if we are using fewer tabs than all of 'em, .slice() will return the subset. (if we are doing all of them, tabCnt+1 works)
	var sblBuckets = tabs2buckets(normalTabs.slice(0,tabCnt+1),debugging); 
	
	if(debugging)debugging.push("weaveByDomain_v2(): tabs2buckets produced '"+sblBuckets.length+"' buckets");
	
	// sort 
	//sblBuckets.sort(compareByArrLenDesc);
	//sblBuckets.sort(compareByArrLenAsc);
	
	// collect the "singles" into its own bucket.  Detect and process any bucket that is to be sub-weaved (like webtoons or gocomics)
	var singles = [];
	for(var i = 0; i < sblBuckets.length; i++)
	{
		if(debugging)debugging.push("weaveByDomain_v2(): testing bucket '"+sblBuckets[i].hostname+"' has length "+sblBuckets[i].tabs.length);
		// collect the "singles" into its own bucket
		if(1 == sblBuckets[i].tabs.length)
			singles.unshift(sblBuckets[i].tabs.shift()); // singles have no order.  with .unshift(), subsequent runs will reverse their order, ensuring balance to the force
		else
		{
			// 'hostname' is the same as the domain name.  By using this as the key, we sift our tabs into buckets by domain.
			var hostname = (new URL(sblBuckets[i].tabs[0].url)).hostname;
			if(debugging)debugging.push("weaveByDomain_v2(): working on bucket '"+hostname+"', with length "+sblBuckets[i].tabs.length);
			if('' == hostname)
			{
				console.log("weaveByDomain_v2(): found a blank hostname?  What is this guy?\n"+JSON.stringify(sblBuckets[i]));
			}
			
			// we have two hardcoded domains we wish to weave within itself; webtoons and gocomics.  We plan to eventually make this user-configurable
			if(hostname in hardcodedSubWeaves)
				sblBuckets[i].tabs = subweave_v3(sblBuckets[i].tabs,hardcodedSubWeaves[hostname],debugging);
		}
	}
	// add the singles back as a bucket
	var singlsBkt = {
		frequency : (tabCnt / singles.length ) 
	  //, nxtInsrt  : (tabCnt / singles.length ) / 2
	  , nxtInsrt  : 0
	  , lstInsrt  : 0.1 //-0.1 - (tabCnt / singles.length  / 2 )
	  , tabs      : singles
	  , hostname  : "singles"
	};
	//for(var i = 0; i < singles.length; i++)
	//	singlsBkt.tabs.push(singles[i]);
	sblBuckets.push(singlsBkt);
	
	if(debugging)debugging.push("our sblBuckets length is:"+sblBuckets.length);
	
	// clean the buckets
	var buckBuf = [];
	for(var i = 0; i < sblBuckets.length; i++) // note that sblBuckets is an array of objects, NOT a hash!
	{
		if(debugging)debugging.push("our sblBuckets["+i+"] '"+sblBuckets[i].hostname+"' has length "+sblBuckets[i].tabs.length);
		if(0 < sblBuckets[i].tabs.length)
			buckBuf.push(sblBuckets[i]);
	}
	sblBuckets = buckBuf;
	
	if(debugging)debugging.push("our sblBuckets length after cleanup is:"+sblBuckets.length);
	
	// use our new weave 
	sblBuckets = mergeArrays_depositPerBucketNeed_v2(sblBuckets,tabCnt,debugging);
	
	if(debugging)debugging.push("our sblBuckets length after merge is:"+sblBuckets.length);
	
	//if(debugging)debugging.push("our tabBuckets2 looks like:"+JSON.stringify(tabBuckets2));
	
	// prune empty cells
	var newTabList = [];
	for(var i = 0; i < sblBuckets.length; i++ )
		if(null != sblBuckets[i])
			newTabList.push(sblBuckets[i]);
	
	// this message isn't very useful. :P
	//if(debugging)debugging.push("our pruned newTabList looks like:"+JSON.stringify(newTabList));
	if(debugging)debugging.push("our pruned newTabList looks like:"+JSON.stringify(newTabList.map((tab) => { return (null == tab ? "" : tab.url); })));
	
	return newTabList;
}

/// this is basically v2, but we take the weave functions as arguments
function weaveByDomain_v3(normalTabs,tabCnt,primeweave_Fnc,subweave_Fnc,debugging)
{
	// convert array to buckets
	// if we are using fewer tabs than all of 'em, .slice() will return the subset. (if we are doing all of them, tabCnt+1 works)
	var sblBuckets = tabs2buckets(normalTabs.slice(0,tabCnt+1),debugging); 
	
	if(debugging)debugging.push("weaveByDomain_v3(): tabs2buckets produced '"+sblBuckets.length+"' buckets");
	console.log("weaveByDomain_v3(): tabs2buckets produced '"+sblBuckets.length+"' buckets");
	
	// sort 
	//sblBuckets.sort(compareByArrLenDesc);
	//sblBuckets.sort(compareByArrLenAsc);
	
	// collect the "singles" into its own bucket
	var singles = [];
	for(var i = 0; i < sblBuckets.length; i++)
	{
		if(debugging)debugging.push("weaveByDomain_v3(): testing bucket '"+sblBuckets[i].hostname+"' has length "+sblBuckets[i].tabs.length);
		if(1 == sblBuckets[i].tabs.length)
			singles.unshift(sblBuckets[i].tabs.shift()); // singles have no order.  with .unshift(), subsequent runs will reverse their order, ensuring balance to the force
		else
		{
			var hostname = (new URL(sblBuckets[i].tabs[0].url)).hostname;
			if(debugging)debugging.push("weaveByDomain_v3(): working on bucket '"+hostname+"', with length " + sblBuckets[i].tabs.length +
				" to see if we need to subweave");
			if('' == hostname)
			{
				console.log("weaveByDomain_v3(): found a blank hostname?  What is this guy?\n"+JSON.stringify(sblBuckets[i]));
			}
			
			// we have two hardcoded domains we wish to weave within itself; webtoons and gocomics.  We plan to eventually make this user-configurable
			if(hostname in hardcodedSubWeaves)
				sblBuckets[i].tabs = subweave_v4(sblBuckets[i].tabs,hardcodedSubWeaves[hostname],subweave_Fnc,debugging);
		}
	}
	// add the singles back as a bucket
	var singlsBkt = {
		frequency : (tabCnt / singles.length ) 
	  //, nxtInsrt  : (tabCnt / singles.length ) / 2
	  , nxtInsrt  : 0
	  , lstInsrt  : 0.1 //-0.1 - (tabCnt / singles.length  / 2 )
	  , tabs      : singles
	  , hostname  : "singles"
	};
	//for(var i = 0; i < singles.length; i++)
	//	singlsBkt.tabs.push(singles[i]);
	sblBuckets.push(singlsBkt);
	
	if(debugging)debugging.push("our sblBuckets length is:"+sblBuckets.length);
	
	// clean the buckets
	var buckBuf = [];
	for(var i = 0; i < sblBuckets.length; i++) // note that sblBuckets is an array of objects, NOT a hash!
	{
		if(debugging)debugging.push("our sblBuckets["+i+"] '"+sblBuckets[i].hostname+"' has length "+sblBuckets[i].tabs.length);
		if(0 < sblBuckets[i].tabs.length)
			buckBuf.push(sblBuckets[i]);
	}
	sblBuckets = buckBuf;
	
	if(debugging)debugging.push("our sblBuckets length after cleanup is:"+sblBuckets.length);
	
	// use our new weave 
	sblBuckets = primeweave_Fnc(sblBuckets,tabCnt,debugging);
	
	if(debugging)debugging.push("our sblBuckets length after merge is:"+sblBuckets.length);
	
	//if(debugging)debugging.push("our tabBuckets2 looks like:"+JSON.stringify(tabBuckets2));
	
	// prune empty cells
	var newTabList = [];
	for(var i = 0; i < sblBuckets.length; i++ )
		if(null != sblBuckets[i])
			newTabList.push(sblBuckets[i]);
	
	// this message isn't very useful. :P
	//if(debugging)debugging.push("our pruned newTabList looks like:"+JSON.stringify(newTabList));
	if(debugging)debugging.push("our pruned newTabList looks like:"+JSON.stringify(newTabList.map((tab) => { return (null == tab ? "" : tab.url); })));
	
	return newTabList;
}






///
// reminder: subweave is used by our original method
//
function subweave(sblBuckets,regex,debugging)
{
	// webtoons and gocomics are two edge cases where we want to redistribute comics from these domains within the bucket.
	
	if(debugging)debugging.push("Found hostname for webtoons or gocomics");
	var wtBucket = {};
	var skippedTabs = [];
	for(var j = 0 ; j < sblBuckets.length; j++)
	{
		if(debugging)debugging.push("workin' with URL '"+sblBuckets[j].url+"'");
		var url = new URL(sblBuckets[j].url);
		
		// capture the pattern that includes the comic's name, like "/en/challenge/plague-muffins/"
		var cmcPath = url.pathname.match(regex);
		
		// result should be like: Array [ "/en/challenge/the-safekeepers/", "the-safekeepers" ]
		if(debugging)debugging.push("pattern matching got us:"+JSON.stringify(cmcPath));
		
		if(null == cmcPath || 2 > cmcPath.length || '' == cmcPath[1])
		{
			if(debugging)debugging.push("Failed to find a match.");
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
		if(debugging)debugging.push("Skipped some tabs.  adding these guys back...:"+JSON.stringify(skippedTabs));
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
	if(debugging)debugging.push("replacing our webtoons bucket with:"+JSON.stringify(replacementBucket));
	//// replace the bucket
	//sblBuckets = replacementBucket;
	return replacementBucket;
}




function subweave_v3(sblBuckets,regex,_debugging)
{
	var debugging = null;
	if(undefined != _debugging)
		debugging = _debugging;
	
	// webtoons and gocomics are two edge cases where we want to redistribute comics from these domains within the bucket.
	
	if(debugging)debugging.push("Found hostname for webtoons or gocomics");
	var wtBucket = {};
	var skippedTabs = [];
	for(var j = 0 ; j < sblBuckets.length; j++)
	{
		if(debugging)debugging.push("workin' with URL '"+sblBuckets[j].url+"'");
		var url = new URL(sblBuckets[j].url);
		
		// capture the pattern that includes the comic's name, like "/en/challenge/plague-muffins/"
		var cmcPath = url.pathname.match(regex);
		
		// result should be like: Array [ "/en/challenge/the-safekeepers/", "the-safekeepers" ]
		if(debugging)debugging.push("pattern matching got us:"+JSON.stringify(cmcPath));
		
		if(null == cmcPath || 2 > cmcPath.length || '' == cmcPath[1])
		{
			if(debugging)debugging.push("Failed to find a match.");
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
		if(debugging)debugging.push("Skipped some tabs.  adding these guys back...:"+JSON.stringify(skippedTabs));
		sblBuckets2.unshift(skippedTabs);
	}
	
	// weave
	var replacementBucket = mergeArrays_AlternatingRoundRobin(sblBuckets2,debugging);
	
	if(debugging)debugging.push("replacing our webtoons bucket with:"+JSON.stringify(replacementBucket));
	
	return replacementBucket;
}

/**
 * Subweave v3, but takes a function argument to do the weave
 * @param {*} sblBuckets 
 * @param {*} regex 
 * @param {*} _debugging 
 * @returns 
 */
function subweave_v4(sblBuckets,regex,subweave_Fnc,_debugging)
{
	var debugging = null;
	if(undefined != _debugging)
		debugging = _debugging;
	
	// webtoons and gocomics are two edge cases where we want to redistribute comics from these domains within the bucket.
	
	if(debugging)debugging.push("Found hostname for webtoons or gocomics");
	var wtBucket = {};
	var skippedTabs = [];
	for(var j = 0 ; j < sblBuckets.length; j++)
	{
		if(debugging)debugging.push("workin' with URL '"+sblBuckets[j].url+"'");
		var url = new URL(sblBuckets[j].url);
		
		// capture the pattern that includes the comic's name, like "/en/challenge/plague-muffins/"
		var cmcPath = url.pathname.match(regex);
		
		// result should be like: Array [ "/en/challenge/the-safekeepers/", "the-safekeepers" ]
		if(debugging)debugging.push("pattern matching got us:"+JSON.stringify(cmcPath));
		
		if(null == cmcPath || 2 > cmcPath.length || '' == cmcPath[1])
		{
			if(debugging)debugging.push("Failed to find a match.");
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
		if(debugging)debugging.push("Skipped some tabs.  adding these guys back...:"+JSON.stringify(skippedTabs));
		sblBuckets2.unshift(skippedTabs);
	}
	
	// weave
	var replacementBucket = subweave_Fnc(sblBuckets2,debugging);
	
	if(debugging)debugging.push("replacing our webtoons bucket with:"+JSON.stringify(replacementBucket));
	
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
			if(debugging)debugging.push("inserting into bigA with frequency "+tbfqncy);
			
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
			
			if(debugging)debugging.push("calculated index into bigA is " + clcIndx );
			
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


function mergeArrays_AlternatingRoundRobin(arrays,_debugging)
{
	var debugging = null;
	if(undefined != _debugging)
		debugging = _debugging;
	/*
	 * For this attempt we will weave the two smallest sub arrays together and resort the array of arrays, repeat until only one remains.
	 * This weave philosophy is to just every-other-tab, and alternate between starting on the left and starting on the right.
	 */
	
	// if we were passed an array with zero sub arrays or one sub arrays, return early
	if(debugging)debugging.push("mergeArrays_AlternatingRoundRobin(): arrays.length is "+arrays.length);
	if(1 == arrays.length)
		return arrays[0];
	if(0 == arrays.length)
		return [];
	
	
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

/**
 * merge the array in a round-robin fashion, starting from the left
 * @param {*} arrays 
 * @param {*} _debugging 
 * @returns 
 */
function mergeArrays_RoundRobin_ltr(arrays,_debugging)
{
	var debugging = null;
	if(undefined != _debugging)
		debugging = _debugging;
	/*
	 * For this attempt we will weave the two smallest sub arrays together and resort the array of arrays, repeat until only one remains.
	 * This weave philosophy is to just every-other-tab, and alternate between starting on the left and starting on the right.
	 */
	
	// if we were passed an array with zero sub arrays or one sub arrays, return early
	if(debugging)debugging.push("mergeArrays_RoundRobin_ltr(): arrays.length is "+arrays.length);
	if(1 == arrays.length)
		return arrays[0];
	if(0 == arrays.length)
		return [];
	
	var nBucket = [];
	var insrtOne = false;
	do
	{
		insrtOne = false;
		for(var i = 0; i < arrays.length; i++)
		{
			if(0 == arrays[i].length)
				continue;
			nBucket.push(arrays[i].shift());
			insrtOne = true;
		}
	}while (insrtOne);
	
	return nBucket;
}

/**
 * merge the array in a round-robin fashion, starting from the right
 * @param {*} arrays 
 * @param {*} _debugging 
 * @returns 
 */
function mergeArrays_RoundRobin_rtl(arrays,_debugging)
{
	var debugging = null;
	if(undefined != _debugging)
		debugging = _debugging;
	/*
	 * For this attempt we will weave the two smallest sub arrays together and resort the array of arrays, repeat until only one remains.
	 * This weave philosophy is to just every-other-tab, and alternate between starting on the left and starting on the right.
	 */
	
	// if we were passed an array with zero sub arrays or one sub arrays, return early
	if(debugging)debugging.push("mergeArrays_RoundRobin_rtl(): arrays.length is "+arrays.length);
	if(1 == arrays.length)
		return arrays[0];
	if(0 == arrays.length)
		return [];
	
	var nBucket = [];
	var insrtOne = false;
	do
	{
		insrtOne = false;
		for(var i = 0; i < arrays.length; i++)
		{
			if(0 == arrays[i].length)
				continue;
			nBucket.unshift(arrays[i].pop());
			insrtOne = true;
		}
	}while (insrtOne);
	
	return nBucket;
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

/*
 * this version uses division to determine the frequency of insertions.
 */
function mergeArrays_depositPerBucketNeed( processingTabs, tabCnt, _debugging )
{
	var debugging = null;
	if(undefined != _debugging)
		debugging = _debugging;
	/*
	 * This merge Arrays version works by keeping track of how much a bucket 'needs' to have its
	 * first element shifted off and into the final array, based on the current index and the frequency.
	 */
	
	if(debugging)
	{
		debugging.push("mergeArrays_depositPerBucketNeed(): Buckets overview:");
		for(var i = 0; i < processingTabs.length; i++)
			//debugging.push("Bucket '"+processingTabs[i].hostname+"' has "+processingTabs[i].tabs.length+" tabs, and a frequency of "+processingTabs[i].frequency);
		{
			//// clone our bucket so we can manipulate it without corrupting the original
			//var bkttmp = JSON.parse(JSON.stringify(processingTabs[i]));
			//// clear the set of thabs by replacing it with the count
			//bkttmp.tabs = bkttmp.tabs.length;
			//debugging.push( "Bucket '" + processingTabs[i].hostname + "': \r\n" + JSON.stringify( bkttmp ) );
			debugging.push( "Bucket '" + processingTabs[i].hostname + "': {\r\n\ttabs: " + processingTabs[i].tabs.length + ",\r\n\tfrequency: " + processingTabs[i].frequency + 
				",\r\n\tlastInsert: " + processingTabs[i].lstInsrt + "\r\n}" );
		}
	}
	
	/*
	 * We are going to try a simple algo:
	 * Evaluate each element in processingTabs.
	 * Pick the bucket that needs an insert the most, 
	 * as determined by the ratio of the difference between the current index and the last insert, vs the frequency.
	 */
	var newTabs = [];
	var lastHostUsed = '';
	for(var insrtIndx = 0; insrtIndx < tabCnt; insrtIndx++)
	{
		var bestBucketIdx = 0;
		var bestBucketR = 0;
		var foundBucket = false;
		for(var i = 0; i < processingTabs.length; i++)
		//for(var foo in processingTabs)
		{
			// if we have emptied this bucket, skip it
			if(0 == processingTabs[i].tabs.length)
				continue;
			
			// If we used this bucket on the last insert, skip it
			//if(i == bestBucketIdx)
			if(debugging)debugging.push("testing bucket '"+processingTabs[i].hostname+"' against last used bucket '"+lastHostUsed+"'");
			if(lastHostUsed == processingTabs[i].hostname)
			{
				if(debugging)debugging.push("Skipping bucket '"+lastHostUsed+"' because we used it last time")
				continue;
			}
			
			// generate a ratio for this bucket
			//var currentR = (insrtIndx - processingTabs[i].nxtInsrt) / processingTabs[i].frequency;
			var currentR = (insrtIndx - processingTabs[i].lstInsrt) / processingTabs[i].frequency;
			
			if(debugging)debugging.push("mergeArrays_depositPerBucketNeed(): bucket '"+processingTabs[i].hostname+"' has a ratio of "+currentR);
			if(debugging)debugging.push("mergeArrays_depositPerBucketNeed(): For bucket '"+processingTabs[i].hostname+"' to win, it needs to have a larger ratio than '"+
				processingTabs[bestBucketIdx].hostname+"''s '"+bestBucketR+"'");
			
			// if the current bucket needs an insert more than the last most-needful one, update the pointer and needful ratio
			if(currentR >= bestBucketR)
			{
				bestBucketR = currentR;
				bestBucketIdx = i;
				foundBucket = true;
			}
			if(debugging)debugging.push("mergeArrays_depositPerBucketNeed(): for index "+insrtIndx+" the current winner is '"+
				processingTabs[bestBucketIdx].hostname+"', in bucket: '"+bestBucketIdx+"'");
		}
		
		// if we didn't find a bucket, pick the next valid bucket
		if(!foundBucket)
		{
			if(debugging)debugging.push("didn't find a bucket, so we are picking one");
			
			var oldestInsrt = insrtIndx;
			for(var i = 0 ; i < processingTabs.length; i++)
			//for(var foo in processingTabs)
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
		
		if(debugging)debugging.push("mergeArrays_depositPerBucketNeed(): selected index '"+bestBucketIdx+"', and the total bucket length is '"+processingTabs.length+"'");
		if(debugging)debugging.push("mergeArrays_depositPerBucketNeed(): selected bucket '"+processingTabs[bestBucketIdx].hostname+"'");
		
		// this shouldn't be possible, but just in case, test if there is anything in this bucket to contribute
		if(0 != processingTabs[bestBucketIdx].tabs.length)
		{
			// update the last used bucket
			lastHostUsed = processingTabs[bestBucketIdx].hostname;
			
			// now assign from our most needed bucket.
			newTabs.push(processingTabs[bestBucketIdx].tabs.shift());
			
			// recalculate frequency
			var oldFq = processingTabs[bestBucketIdx].frequency;
			if(0 < processingTabs[bestBucketIdx].tabs.length)
				//processingTabs[bestBucketIdx].frequency = Math.floor((tabCnt - insrtIndx ) / processingTabs[bestBucketIdx].tabs.length);
				processingTabs[bestBucketIdx].frequency = (tabCnt - insrtIndx ) / processingTabs[bestBucketIdx].tabs.length;
			
			if(debugging && oldFq != processingTabs[bestBucketIdx].frequency)
				debugging.push("Updated frequency for bucket '"+processingTabs[bestBucketIdx].hostname+"' from '"+oldFq+"' to '"+processingTabs[bestBucketIdx].frequency+"'");
			
			// update the last inserted index
			//processingTabs[bestBucketIdx].nxtInsrt = processingTabs[bestBucketIdx].lstInsrt + processingTabs[bestBucketIdx].frequency;
			//processingTabs[bestBucketIdx].nxtInsrt += processingTabs[bestBucketIdx].frequency;
			processingTabs[bestBucketIdx].lstInsrt = insrtIndx;
			//processingTabs[bestBucketIdx].lstInsrt += processingTabs[bestBucketIdx].frequency + insrtIndx;
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

/*
 * this version uses subtraction to determine the frequency of insertions.
 */
function mergeArrays_depositPerBucketNeed_v2(processingTabs,tabCnt,_debugging)
{
	var debugging = null;
	if(undefined != _debugging)
		debugging = _debugging;
	/*
	 * This merge Arrays version works by keeping track of how much a bucket 'needs' to have its
	 * first element shifted off and into the final array, based on the current index and the frequency.
	 */
	
	if(debugging)
	{
		debugging.push("mergeArrays_depositPerBucketNeed_v2(): Buckets overview:");
		for(var i = 0; i < processingTabs.length; i++)
			//debugging.push("Bucket '"+processingTabs[i].hostname+"' has "+processingTabs[i].tabs.length+" tabs, and a frequency of "+processingTabs[i].frequency);
		{
			// clone our bucket so we can manipulate it without corrupting the original
			//var bkttmp = JSON.parse(JSON.stringify(processingTabs[i]));
			// clear the set of thabs by replacing it with the count
			//bkttmp.tabs = bkttmp.tabs.length;
			//debugging.push( "Bucket '" + processingTabs[i].hostname + "': \r\n" + JSON.stringify( bkttmp ) );
			debugging.push( "Bucket '"         + processingTabs[i].hostname    + "': {");
			debugging.push("     tabs: "       + processingTabs[i].tabs.length + ",");
			debugging.push("     frequency: "  + processingTabs[i].frequency   + ",");
			debugging.push("     lastInsert: " + processingTabs[i].lstInsrt    + "");
			debugging.push("}" );
		}
	}
	
	/*
	 * We are going to try a simple algo:
	 * Evaluate each element in processingTabs.
	 * Pick the bucket that needs an insert the most, 
	 * as determined by the ratio of the difference between the current index and the last insert, vs the frequency.
	 */
	var newTabs = [];
	var lastHostUsed = '';
	for(var insrtIndx = 0; insrtIndx < tabCnt; insrtIndx++)
	{
		var bestBucketIdx = 0;
		var bestBucketR = 0;
		var foundBucket = false;
		for(var i = 0; i < processingTabs.length; i++)
		//for(var foo in processingTabs)
		{
			// if we have emptied this bucket, skip it
			if(0 == processingTabs[i].tabs.length)
				continue;
			
			/*
			 * Calculate everything, generate a log report, then perform logic.
			 * WARNING: we are performing logic with our report object!  This is a bad idea, but we are doing it anyway, apparently.
			 */
			var report = {};
			report.CurrentBucket = processingTabs[i].hostname;
			report.LastBucket = lastHostUsed;
			report.minimumInsertIndex = processingTabs[i].lstInsrt + (processingTabs[i].frequency/2);
			report.currentR = (insrtIndx - processingTabs[i].lstInsrt) / processingTabs[i].frequency;
			
			if(debugging)debugging.push("mergeArrays_depositPerBucketNeed_v2(): Evaluating bucket '"+processingTabs[i].hostname+"'");
			if(debugging)debugging.push(JSON.stringify(report));
			
			// If we used this bucket on the last insert, skip it
			if(lastHostUsed == processingTabs[i].hostname)
			{
				if(debugging)debugging.push("Skipping bucket '"+lastHostUsed+"' because we used it last time")
				continue;
			}
			
			/*
			 * Trying something new:  If we inserted this bucket less than half its frequency ago, skip it.
			 */
			//var minimumInsertIndex = processingTabs[i].lstInsrt + (processingTabs[i].frequency/2);
			//if(debugging)debugging.push("mergeArrays_depositPerBucketNeed_v2(): testing if bucket '"+processingTabs[i].hostname+
			//	"' has been inserted more than half its frequency '"+processingTabs[i].frequency+
			//	"' ago.  Last insert: "+processingTabs[i].lstInsrt+", Half the freq: '"+(processingTabs[i].frequency/2)+"', Sum: "+
			//	minimumInsertIndex+",  current index: '"+insrtIndx+"'");
			//if(debugging)debugging.push( "litterlaly testing if the minimum index '" + minimumInsertIndex + "' is smaller than the current index " + insrtIndx );
			if(report.minimumInsertIndex > insrtIndx)
			{
				if(debugging)debugging.push( "Skipping bucket '" + processingTabs[i].hostname + 
					"'; current indx: "+insrtIndx+" minimum next insert: " + report.minimumInsertIndex );
				continue;
			}
			
			///*
			// * Here we take the last insert index and add the frequency to it, then subtract the current index.
			// * The bucket that produces the smallest result needs an insert the most.
			// */
			//var currentR = processingTabs[i].lstInsrt + processingTabs[i].frequency - insrtIndx;
			//var currentR = processingTabs[i].lstInsrt - insrtIndx;
			/*
			 * We calculate 'need' by taking the current index and subtracting the last insert index, then dividing by the frequency.
			 * We then compare this value with the other buckets' version of this value, and the bucket with the largest value needs an insert the most.
			 * (
			 *   if the current index is 6, and the current bucket inserted at 5, and its frequency is 3, that results in a value of 1/3.
			 *   If the current index is 6, and the bucket that inserted at 4 has a frequency of 4, that results in a value of 2/4.
			 *   We'll pick the bucket that inserted at 4 over the bucket that inserted at 5, because the bucket that inserted at 4 needs an insert more, 
			 *   despite having the lower frequency.
			 * )
			 */
			//var currentR = (insrtIndx - processingTabs[i].lstInsrt) / processingTabs[i].frequency;
			
			//if(debugging)debugging.push("mergeArrays_depositPerBucketNeed_v2(): bucket '"+processingTabs[i].hostname+"' has 'need' of "+currentR);
			//if(debugging&&foundBucket)debugging.push("mergeArrays_depositPerBucketNeed_v2(): For bucket '"+processingTabs[i].hostname+
			//	"' to win, it needs to have a bigger value than '"+processingTabs[bestBucketIdx].hostname+"''s '"+bestBucketR+"'");
			
			if(debugging)debugging.push("Current need:"+report.currentR+", best need:"+bestBucketR);
			
			// If we haven't found a bucket yet, we use this bucket implicitly.
			// If the current bucket needs an insert more than the last most-needful found bucket, update the pointer and needful value
			if(!foundBucket || report.currentR >= bestBucketR)
			{
				bestBucketR = report.currentR;
				bestBucketIdx = i;
				foundBucket = true;
			}
			//if(debugging)debugging.push("mergeArrays_depositPerBucketNeed_v2(): for index "+insrtIndx+" the current winner is '"+
			//	processingTabs[bestBucketIdx].hostname+"', with 'need': '"+bestBucketR+"'");
			//if(debugging&&foundBucket)debugging.push("mergeArrays_depositPerBucketNeed_v2():\r\nfor index " + 
			//	insrtIndx+" the current winner is '"+processingTabs[bestBucketIdx].hostname+"'");
		}
		
		// if we didn't find a bucket, pick the next valid bucket
		if(!foundBucket)
		{
			if(debugging)debugging.push("didn't find a bucket, so we are picking one");
			
			var oldestInsrt = insrtIndx;
			for(var i = 0 ; i < processingTabs.length; i++)
			{
				// skip buckets that are empty
				if(0 == processingTabs[i].tabs.length)
					continue;
				
				// skip bucket if we used it last time
				if(lastHostUsed == processingTabs[i].hostname)
					continue;
				
				// pick the oldest bucket
				if(oldestInsrt >= processingTabs[i].lstInsrt)
				{
					bestBucketIdx = i;
					oldestInsrt = processingTabs[i].lstInsrt;
					foundBucket = true;
				}
			}
			// sweep again without the last domain restriction, if we need to
			if(!foundBucket)
			{
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
						foundBucket = true;
					}
				}
			}
		}
		
		//if(debugging)debugging.push("mergeArrays_depositPerBucketNeed_v2(): selected index '"+bestBucketIdx+"', and the total bucket length is '"+processingTabs.length+"'");
		if(debugging)debugging.push("mergeArrays_depositPerBucketNeed_v2(): selected bucket '"+processingTabs[bestBucketIdx].hostname+"'");
		
		// this shouldn't be possible, but just in case, test if there is anything in this bucket to contribute
		if(0 != processingTabs[bestBucketIdx].tabs.length)
		{
			// update the last used bucket
			lastHostUsed = processingTabs[bestBucketIdx].hostname;
			
			// now assign from our most needed bucket.
			newTabs.push(processingTabs[bestBucketIdx].tabs.shift());
			
		//	// recalculate frequency
		//	var oldFq = processingTabs[bestBucketIdx].frequency;
		//	if(0 < processingTabs[bestBucketIdx].tabs.length)
		//		//processingTabs[bestBucketIdx].frequency = Math.floor((tabCnt - insrtIndx ) / processingTabs[bestBucketIdx].tabs.length);
		//		processingTabs[bestBucketIdx].frequency = (tabCnt - insrtIndx ) / processingTabs[bestBucketIdx].tabs.length;
		//	
		//	if(debugging && oldFq != processingTabs[bestBucketIdx].frequency)
		//		debugging.push("Updated frequency for bucket '"+processingTabs[bestBucketIdx].hostname+"' from '"+oldFq+"' to '"+processingTabs[bestBucketIdx].frequency+"'");
			
			// update the last inserted index
			//processingTabs[bestBucketIdx].nxtInsrt = processingTabs[bestBucketIdx].lstInsrt + processingTabs[bestBucketIdx].frequency;
			//processingTabs[bestBucketIdx].nxtInsrt += processingTabs[bestBucketIdx].frequency;
			//processingTabs[bestBucketIdx].lstInsrt = insrtIndx;
			//processingTabs[bestBucketIdx].lstInsrt += processingTabs[bestBucketIdx].frequency + insrtIndx;
			processingTabs[bestBucketIdx].lstInsrt += processingTabs[bestBucketIdx].frequency;
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


/*
 * This version slightly biases larger buckets leftwards, and smaller buckets rightwards, causing
 * the user to read more common items at a slightly elevated rate.  This should, gradually, trend 
 * towards a more even distribution of the tabs.
 */
function mergeArrays_depositPerBucketNeed_v3(_processingTabs,tabCnt,_debugging)
{
	var debugging = null;
	if(undefined != _debugging)
		debugging = _debugging;
	
	// clone the object we received, so we can manipulate it without fear of effecting the original
	var processingTabs = JSON.parse(JSON.stringify(_processingTabs));
	
	/*
	 * This merge Arrays version works by keeping track of how much a bucket 'needs' to have its
	 * first element shifted off and into the final array, based on the current index and the frequency.
	 *
	 * We are trying something new; we are recalculating the frequency after each insert, and we are basing 
	 * the frequency not by the ratio of the size of this bucket vs the size of all the remaining tabs  to
	 * assign, but instead the size of this bucket vs the size of all the remaining tabs to assign minus 
	 * the size of this bucket.  By recalculating that buckets' frequency in this way after each insert 
	 * from that bucket, the frequency of appearance from large buckets should be higher on the left and 
	 * graudally become less frequent towards the right.  Small buckets will be similarly weighted, but 
	 * their repeat apperance will much more quickly become less frequent.
	 */
	
	if(debugging)
	{
		debugging.push("mergeArrays_depositPerBucketNeed_v3(): Buckets overview:");
		for(var i = 0; i < processingTabs.length; i++)
			//debugging.push("Bucket '"+processingTabs[i].hostname+"' has "+processingTabs[i].tabs.length+" tabs, and a frequency of "+processingTabs[i].frequency);
		{
			// clone our bucket so we can manipulate it without corrupting the original
			//var bkttmp = JSON.parse(JSON.stringify(processingTabs[i]));
			// clear the set of thabs by replacing it with the count
			//bkttmp.tabs = bkttmp.tabs.length;
			//debugging.push( "Bucket '" + processingTabs[i].hostname + "': \r\n" + JSON.stringify( bkttmp ) );
			debugging.push( "Bucket '"         + processingTabs[i].hostname    + "': {");
			debugging.push("     tabs: "       + processingTabs[i].tabs.length + ",");
			debugging.push("     frequency: "  + processingTabs[i].frequency   + ",");
			debugging.push("     lastInsert: " + processingTabs[i].lstInsrt    + "");
			debugging.push("}" );
		}
	}
	
	/*
	 * We are going to try a simple algo:
	 * Evaluate each element in processingTabs.
	 * Pick the bucket that needs an insert the most, 
	 * as determined by the ratio of the difference between the current index and the last insert, vs the frequency.
	 */
	var newTabs = [];
	var lastHostUsed = '';
	for(var insrtIndx = 0; insrtIndx < tabCnt; insrtIndx++)
	{
		var bestBucketIdx = 0;
		var bestBucketR = 0;
		var foundBucket = false;
		for(var i = 0; i < processingTabs.length; i++)
		//for(var foo in processingTabs)
		{
			// if we have emptied this bucket, skip it
			if(0 == processingTabs[i].tabs.length)
				continue;
			
			/*
			 * Calculate everything, generate a log report, then perform logic.
			 * WARNING: we are performing logic with our report object!  This is a bad idea, but we are doing it anyway, apparently.
			 */
			var report = {};
			report.CurrentBucket = processingTabs[i].hostname;
			report.LastBucket = lastHostUsed;
			report.minimumInsertIndex = processingTabs[i].lstInsrt + (processingTabs[i].frequency/2);
			report.currentR = (insrtIndx - processingTabs[i].lstInsrt) / processingTabs[i].frequency;
			
			if(debugging)debugging.push("mergeArrays_depositPerBucketNeed_v3(): Evaluating bucket '"+processingTabs[i].hostname+"'");
			if(debugging)debugging.push(JSON.stringify(report));
			
			// If we used this bucket on the last insert, skip it
			if(lastHostUsed == processingTabs[i].hostname)
			{
				if(debugging)debugging.push("Skipping bucket '"+lastHostUsed+"' because we used it last time")
				continue;
			}
			
			/*
			 * Trying something new:  If we inserted this bucket less than half its frequency ago, skip it.
			 */
			if(report.minimumInsertIndex > insrtIndx)
			{
				if(debugging)debugging.push( "Skipping bucket '" + processingTabs[i].hostname + 
					"'; current indx: "+insrtIndx+" minimum next insert: " + report.minimumInsertIndex );
				continue;
			}
			
			
			if(debugging)debugging.push("Current need:"+report.currentR+", best need:"+bestBucketR);
			
			// If we haven't found a bucket yet, we use this bucket implicitly.
			// If the current bucket needs an insert more than the last most-needful found bucket, update the pointer and needful value
			if(!foundBucket || report.currentR >= bestBucketR)
			{
				bestBucketR = report.currentR;
				bestBucketIdx = i;
				foundBucket = true;
			}
			//if(debugging)debugging.push("mergeArrays_depositPerBucketNeed_v3(): for index "+insrtIndx+" the current winner is '"+
			//	processingTabs[bestBucketIdx].hostname+"', with 'need': '"+bestBucketR+"'");
			//if(debugging&&foundBucket)debugging.push("mergeArrays_depositPerBucketNeed_v3():\r\nfor index " + 
			//	insrtIndx+" the current winner is '"+processingTabs[bestBucketIdx].hostname+"'");
		}
		
		// if we didn't find a bucket, pick the next valid bucket
		if(!foundBucket)
		{
			if(debugging)debugging.push("didn't find a bucket, so we are picking one");
			
			var oldestInsrt = insrtIndx;
			for(var i = 0 ; i < processingTabs.length; i++)
			{
				// skip buckets that are empty
				if(0 == processingTabs[i].tabs.length)
					continue;
				
				// skip bucket if we used it last time
				if(lastHostUsed == processingTabs[i].hostname)
					continue;
				
				// pick the oldest bucket
				if(oldestInsrt >= processingTabs[i].lstInsrt)
				{
					bestBucketIdx = i;
					oldestInsrt = processingTabs[i].lstInsrt;
					foundBucket = true;
				}
			}
			// sweep again without the last domain restriction, if we need to
			if(!foundBucket)
			{
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
						foundBucket = true;
					}
				}
			}
		}
		
		if(debugging)debugging.push( "mergeArrays_depositPerBucketNeed_v3(): selected bucket '"
			+ processingTabs[bestBucketIdx].hostname + "', url '" + processingTabs[bestBucketIdx].tabs[0].url + "'" );
		
		// this shouldn't be possible, but just in case, test if there is anything in this bucket to contribute
		if(0 == processingTabs[bestBucketIdx].tabs.length)
		{
			// Now what?  we shouldn't have ever selected an emtpy bucket, but it appears we have.  How would we recover from this?  (How would this case even arise?)
			console.log("you should never see this message");
			continue;
		}
		// update the last used bucket
		lastHostUsed = processingTabs[bestBucketIdx].hostname;
		
		// now assign from our most needed bucket.
		newTabs.push(processingTabs[bestBucketIdx].tabs.shift());
		
		// recalculate frequency
		// The frequency was originally set with:
		// frequency : (tabsArray.length / tabBuckets[foo].length) 
		// we are doing to do something similar.
		if(0 < processingTabs[bestBucketIdx].tabs.length)
		{
			// update the last inserted index.  This is deliberately a lie; we prevent drift by claiming our last insert was our frequency ago.
			processingTabs[bestBucketIdx].lstInsrt += processingTabs[bestBucketIdx].frequency;
			
			if(debugging)debugging.push("mergeArrays_depositPerBucketNeed_v3(): Actual insert index: '"+insrtIndx+"', .lstInsrt: '"+processingTabs[bestBucketIdx].lstInsrt+"'");
		
			if(debugging)debugging.push("mergeArrays_depositPerBucketNeed_v3(): Frequency before recalc: '"+processingTabs[bestBucketIdx].frequency+"'");
		
			//processingTabs[bestBucketIdx].frequency = ((1 + tabCnt) - processingTabs[bestBucketIdx].tabs.length ) / processingTabs[bestBucketIdx].tabs.length;
			processingTabs[bestBucketIdx].frequency = ( tabCnt - Math.sqrt(processingTabs[bestBucketIdx].tabs.length) ) / processingTabs[bestBucketIdx].tabs.length;
			
			if(debugging)debugging.push("mergeArrays_depositPerBucketNeed_v3(): Frequency after recalc: '"+processingTabs[bestBucketIdx].frequency
				+ "'. tabs:'" + tabCnt + "' bucket:'" + processingTabs[bestBucketIdx].tabs.length + "'" );
		}
		// else, remove the empty bucket
		else
		{
			var tmpBuf = [];
			for(var j = 0; j < processingTabs.length; j++)
			{
				if(0 < processingTabs[j].tabs.length)
					tmpBuf.push(processingTabs[j]);
			}
			processingTabs = tmpBuf;
		}
		
	}
	
	// we should be done
	return newTabs;
}

/*
 * This version is simply round-robin, left to right.
 * 
 * Note: we don't use 'tabCnt', but we keep it in the signature for consistency; 
 * this way we can swap which merge function we use without changing the call site.
 */
function mergeBuckets_RoundRobin_ltr(processingTabs,tabCnt,_debugging)
{
	var debugging = null;
	if(undefined != _debugging)
		debugging = _debugging;
	
	/*
	 * We are going to try a simple algo:
	 * We simply round-robin through the buckets, left to right.
	 */
	var newTabs = [];
	var insrtOne = false;
	
	do
	{
		insrtOne = false;
		for(var i = 0; i < processingTabs.length; i++)
		{
			if(0 == processingTabs[i].tabs.length)
				continue;
			newTabs.push(processingTabs[i].tabs.shift());
			insrtOne = true;
		}
	}while (insrtOne);
	
	// we should be done
	return newTabs;
}

/*
 * This version is simply round-robin, right to left.
 * 
 * Note: we don't use 'tabCnt', but we keep it in the signature for consistency; 
 * this way we can swap which merge function we use without changing the call site.
 */
function mergeBuckets_RoundRobin_rtl(processingTabs,tabCnt,_debugging)
{
	var debugging = null;
	if(undefined != _debugging)
		debugging = _debugging;
	
	/*
	 * We are going to try a simple algo:
	 * We simply round-robin through the buckets, right to left.
	 */
	var newTabs = [];
	var insrtOne = false;
	
	do
	{
		insrtOne = false;
		for(var i = 0; i < processingTabs.length; i++)
		{
			if(0 == processingTabs[i].tabs.length)
				continue;
			newTabs.unshift(processingTabs[i].tabs.pop());
			insrtOne = true;
		}
	}while (insrtOne);
	
	// we should be done
	return newTabs;
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
			if(debugging)debugging.push("inserting into bigA with frequency "+tbfqncy);
			
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
			
			if(debugging)debugging.push("calculated index into bigA is " + clcIndx );
			
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
