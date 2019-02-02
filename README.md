# Description
This is a simple script that scrapes Craigslist room postings and updates
an output CSV with the results.
It is configured to pull results from sfbay, but it can easily be changed.
The purpose of this script was to create a format for the postings that could
be imported into Google custom maps, in order to identify places that were
close to the company's shuttle bus pickup locations.

# Caveats
* It should be noted that even if you run the script at a very slow setting,
  Craigslist seems to block your IP after the first pass.
* The list functionality only fetches 120 results each time it is run.
  You must increment the `offset` option and rerun to collect more results.
