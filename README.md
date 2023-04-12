# FrequencyWeave

https://addons.mozilla.org/en-US/firefox/addon/frequencyweave-tabs/

Web extension for weaving the order of tabs by frequency of domain.

This is forked from monomon's sort-tabs-advanced, which doesn't quite do what we wanted but served as a decent starting point.

If you want to sort your tabs, please consider https://addons.mozilla.org/en-US/firefox/addon/sort-tabs-advanced/ .

Problem: our RSS feeds frequently result in many comics from the same domain clumped together.

Problem: we add new comics by adding the entire back catalog of episodes as tabs to a browser window.

Problem: we don't want to read many episodes of the same comic consecutively, and prefer read as a mix of sources.

Solution: manually move tabs around to achieve a more rounded experience...   But this is tedious, and we probably can automate that...

This plugin preserves left-to-right order of appearance within a collection of tabs by the same domain (so story arcs are not jumbled), but redistributes these tabs roughly evenly through the windows' set of tabs.

There are two known edge cases; first, we group all of the tabs with domain frequency of 1 into its own group and migrate to the front of the sorted list (thus unsorting it), so they don't "get stuck" on the far right end of the set of tabs, and second, we conduct the same process that distributes a domains' worth of tabs over the final window tab list within two specific domains to redistribute artists that share a domain: webcomics.com and gocomics.com.

Unlike the plugin sort-tabs-advanced this does not have any options to choose from.  Some future version may allow the user to configure additional subweaves.

## Building the extension

Run `build.sh`, which uses `web-ext`.

## Changes

### v0.5

This version pulls off the set of tabs with frequency 1 into their own list.
Then we inverted our process from weaving largest-to-smallest to smallest-to-largest.
Finally we weave in the "singles" by inserting them in every second tab.

This results in what appears to be a pretty homegeneous weave, with the slight deviation on the far left where the singles are included.  This prevents the singles from getting "stuck" on the far right and never read, and doesn't over-saturate the reading experience with clumbs of very common domains.

This is as close to ideal as we think it is going to be.  Future development may focus on making the subweaves configurable, or making the UI more pleasant, or speeding up the process.  Anyone have suggestions on how to do any of that?

### v0.4

In order to address the issue with domains with only two tabs available in the window discovered in v0.3, we are changing the process slightly.  Domains with an even number count of tabs will will have an offset calculated in addition to the frequency, and be inserted into the index calculated rather than find the first available cell after the index calculated.  To reduce the "bunching" found in v0.1, we keep the process for odd number count of tabs the same.  
This still results in bunching, but the frequency we read very common items in the left 10% or so of the tab set isn't very different from v0.2, and slightly favors both very common and very uncommon domains over the mid-range.  Over time this may balance out to a frequency weave of very common items and mid-range items both being roughly even in frequency.  

### v0.3

This version groups the collection of "buckets" with a quantity of 1 into its own bucket and distributes that into the final array first, which nicely resovles the issue discovered in v0.2.  However, now it seems buckets with qty 2 are all "stuck" on the far left and bunched immediately adjacent.  This isn't a great version, so we haven't uploaded it to mozilla, and you'll have to build your own.

### v0.2

First working version uploaded to mozilla.  
Added the subweave call to webtoons and gocomics.
Switched the method of insert from finding the indext and adding if the cell is empty or splicing it into the array if it wasn't to finding the first empty cell on or after the calculated index.  This generally preserves a good frequency, but it tends to keep "buckets" with a frequency of 1 "stuck" on the far right.

### v0.1

First version uploaded to mozilla.  Was untested after last minute changes, and didn't work.
Collects tabs into "buckets" by domain name, calculates how frequent to spread the contents of each bucket, and attempts to do so.  This method has a tendency to overload the far left with contents of small "buckets", and ends up with a lot of "bunching" in the middle towards far right.