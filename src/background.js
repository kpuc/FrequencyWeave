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



function weaveByDomain_old()
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
						 * 2023-04-08: these solutions didn't work.  
						 * A buddy suggested we just make the poly bucket from our singles and migrate it to the front of the sorted list.  
						 * This is why he gets paid the big bucks, and I do not; that solution is quite like my first above, but does not have the drawback of 
						 * singles getting stuck on the far left as it shrinks in size.  
						 */
						// zzapp -- if we ever decide to invert the order (see sblBuckets.sort() above), this logic won't work!
						// test if the last bucket is qty 1.  If not, we have nothing to do and skip this logic.
						if(1 == sblBuckets[sblBuckets.length-1].length)
						{
							/*
							 * Here we combine the singles (the set of buckets with only a single element) into special bucket that we stick at the start of
							 * our sorted-by-size list of buckets, without regard to its actual size.  
							 * This will weave in the singles first in our final array set, and thus they will get read, rather than stay "stuck" at the far
							 * right end of the final set of tabs.
							 * This process will flip the order of the singles, and we are doing that deliberately so every time we run it the ends get read 
							 * early.
							 */
							var snglIndx = 0;
							
							// find the start
							while(1 < sblBuckets[snglIndx].length)
								snglIndx++;
							
							if(debugging)console.log("Singles start at index "+snglIndx);
							
							// create a new start to the buckets, and advance our index by one to compensate
							sblBuckets.unshift([]);
							snglIndx++;
							
							// start chooching
							for(;snglIndx < sblBuckets.length -1; snglIndx++)
							{
								if(debugging)console.log("moving "+sblBuckets[snglIndx][0].url+" to the head of the list");
								sblBuckets[0].unshift(sblBuckets[snglIndx].pop());
							}
						}
						
						/*
						 * Now we distribute the buckets.
						 * Our new algo takes the largest bucket and weaves the next largest into it, then the next largest into it, etc., etc., until all the
						 * buckets have been woven in.  
						 * This may result in a reasonably homogeneous weave of tabs, except for two lumps where all the buckets with qty 2 tend to land, and
						 * possibly lumps with buckets with qty 3.  
						 */
						// The first bucket may actually be smaller than the second; pick the bigger of the two
						if(1 < sblBuckets.length && sblBuckets[0] < sblBuckets[1])
						{
							// stash the head in a buffer, take the second bucket, and put the head back on
							var bufbuck = sblBuckets.shift();
							tabBuckets2 = sblBuckets.shift();
							sblBuckets.unshift(bufbuck);
						}
						else if (1 < sblBuckets.length)
						{
							// the first bucket is actually the largest, so take it
							tabBuckets2 = sblBuckets.shift();
						}
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
								
								// calculate an offset some value less than the frequency length, based on the bucket number
								var insrtOffst = i % tbfqncy;
								
								// distribute the tabs
								for(var j = 0; j < sblBuckets[i].length; j++)
								{
									if(debugging)console.log("inserting into tabBuckets2 with frequency "+tbfqncy);
									
									var clcIndx = (tbfqncy * j)+j; // note that we add j; this accounts for the array growing in size as we insert items
									
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
						
						// convert our object of buckets into a sorted-by-length array of buckets
						var sblBuckets = [];
						for(var foo in tabBuckets)
							sblBuckets.push(tabBuckets[foo]);
						
						// sort 
						//sblBuckets.sort(compareByArrLenDesc);
						sblBuckets.sort(compareByArrLenAsc);
						
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
										// take a tab from the larger (or later, when equal in size) bucket first
										if(0 < sblBuckets[i].length)
											tmpBuck.push(sblBuckets[i].shift());
										
										if(0 < tabBuckets2.length)
											tmpBuck.push(tabBuckets2.shift());
									}
									tabBuckets2 = tmpBuck;
									// we are done with this bucket; continue to the next
									continue;
								}
								
								// calculate an offset some value less than the frequency length, based on the bucket number
								var insrtOffst = i % tbfqncy;
								
								// distribute the tabs
								for(var j = 0; j < sblBuckets[i].length; j++)
								{
									if(debugging)console.log("inserting into tabBuckets2 with frequency "+tbfqncy);
									
									var clcIndx = (tbfqncy * j)+j; // note that we add j; this accounts for the array growing in size as we insert items
									
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
	return sblBuckets;
}




function onError(error) {
  console.trace(error);
}
