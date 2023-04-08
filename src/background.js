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
	"Weave-by-domain": weaveByDomain
};

let hardcodedSubWeaves = {
	  "www.webtoons.com": /\/.*?\/.*?\/(.*?)\// 
	, "www.gocomics.com": /\/(.*?)\//           
}

// this guy appears to be called from sortabs.js
function sortTabsComparatorName(compName) 
{
	if("Weave-by-domain" == compName)
		return weaveByDomain();
	return weaveByDomain();
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
						
						/*
						 * We have an edge case where buckets with qty 1 tend to only get inserted on the far right end of the set of tabs.  For active comics
						 * this isn't really a problem, as eventually another episode will materialize and then the bucket will be qty 2.  However, for 
						 * inactive comics, or comics where we add the first episode in order to evaluate before we add to the rss feed, they will remain stuck
						 * on the far right.
						 * This causes them to never get read, as we only read-and-close tabs on the far left.
						 * One solution is to take all the buckets with qty 1 and create one bucket from it and weave like any other bucket.
						 * This proposed solution doesn't resolve the issue of a single domain existing with qty 1.
						 * Another solution is to take the set of buckets with 1 qty and just push them round-robin onto the buckets with >1 qty.  The first 
						 * time this process is done we'll be overloaded with rare episodes before we get to very common episodes.. but in a few rounds of 
						 * reading and closing episodes, the balance will be restored.
						 */
						// zzapp -- if we ever decide to invert the order (see sblBuckets.sort() above), this logic won't work!
						// test if the last bucket is qty 1.  If not, we have nothing to do and skip this logic.
						if(1 == sblBuckets[sblBuckets.length-1].length)
						{
							/*
							 * Here we take singles on the far right and begin inserting into the far left, one index deep.  
							 * We'll keep track of pointers so we don't try to unshift into ourselves.
							 * This means that if we have more singles buckets than many buckets, we'll be left with a trailing set of singles.  This is fine; 
							 * over time it'll sort itself out.
							 */
							var startIndx = 0;
							var endIndx = sblBuckets.length-1;
							while(startIndx < endIndx && 1 == sblBuckets[endIndx].length)
							{
								sblBuckets[startIndx].splice(1,0,sblBuckets[endIndx].pop());
								startIndx++;
								endIndx--;
							}
							// prune empty elements
							var tmpbuck = [];
							for(var i = 0; i < sblBuckets.length; i++)
								// no clue if .pop() leaves an empty array, so test for everything
								if(null != sblBuckets[i] && 0 < sblBuckets[i].length && null != sblBuckets[i][0])
									tmpbuck.push(sblBuckets[i]);
							sblBuckets = tmpbuck;
						}
						
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
								
								// we have two hardcoded domains we wish to weave within itself; webtoons and gocomics.  Eventually we plan to make this user-configurable
								if(hostname in hardcodedSubWeaves)
									sblBuckets[i] = subweave(sblBuckets[i],hardcodedSubWeaves[hostname],debugging);
								
								if(debugging)console.log("Calculating tab frequency by taking the total number of tabs '"+normalTabs.length+"' and dividing by the size of our bucket '"+sblBuckets[i].length+"'");
								
								// we deliberately do *not* truncate or round to int here.  if we did, the frequency would end up bunching.
								var tbfqncy = normalTabs.length/sblBuckets[i].length;
								
								for(var j = 0; j < sblBuckets[i].length; j++)
								{
									if(debugging)console.log("inserting into tabBuckets2 with frequency "+tbfqncy);
									
									var clcIndx = (tbfqncy*j);
									
									if(debugging)console.log("calculated index into tabBuckets2 is " + clcIndx );
									
									// the "slide" part of this so-called "slide-insert"
									while(null != tabBuckets2[Math.round(clcIndx)])
										clcIndx++;
									
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
		//var holeindx = 0;
		while(0 > skippedTabs.length)
		{
			// this'll put them on the end, and if our single's logic stubbornly chooses one of our subweave buckets we'll never read the tab.  try unshifting.
			//// find the next available index
			//while(null != sblBuckets2[holeindx])
			//	holeindx++;
			//sblBuckets2[holeindx] = skippedTabs.shift();
			sblBuckets2.unshift(skippedTabs.shift());
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




function onError(error) {
  console.trace(error);
}
