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

There are two known edge cases, one of which is implemented; we conduct the same process within two specific domains to redistribute artists that share a domain: webcomics.com and gocomics.com.

The as-of-yet un-implemented edge case is domains with a tab count of 1 tending to get "stuck" at the right end of the window, and thus never get consumed by the user.  That will likely land in version 0.3.

Unlike the plugin sort-tabs-advanced this does not have any options to choose from.  Some future version may allow the user to configure additional subweaves.

## Building the extension

Run `build.sh`, which uses `web-ext`.
