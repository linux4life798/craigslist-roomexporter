const fs = require('fs');
const craigslist = require('node-craigslist');
const createCsvWriter = require('csv-writer').createArrayCsvWriter;

const csvFileName = "sfbay.csv";
const rawResultsFile = "results.json";
const maxDelaySeconds = 3; // for fetching details
const maxTitlePreviewLength = 40;

const csvWriter = createCsvWriter({
    header: ['TITLE', 'LOCATION', 'PRICE', 'DESCRIPTION', 'URL', 'MAPURL', 'MAPKEYWORD', 'PID'],
    path: csvFileName
});

var client = new craigslist.Client({
    city : 'sfbay'
  }),
  options = {
    baseHost : '', // defaults to craigslist.org
    category : 'sfc/roo', // defaults to sss (all)
    city : 'sfbay'
    // maxAsk : '200',
    // minAsk : '100'
  };

var allResults = [];

var processListing = function(list, details) {
    // console.log("Listing: ", list);
    // console.log('\n\n\n');
    // console.log("Details: ", details);
    // console.log('\n\n\n');

    allResults.push({list: list, details: details});

    // Print the preview
    console.log("Listing:", list.title.substring(0,maxTitlePreviewLength), "|", list.url)

    var mapkeyword = "";
    if ('mapUrl' in details) {
        mapkeyword = decodeURIComponent(details.mapUrl);
        if (mapkeyword.includes("https://maps.google.com/?q=loc:")) {
            // https://maps.google.com/?q=loc%3A+Forest+grove+dr+at+Fairway+Daly+City+CA+US
            // becomes
            // https://maps.google.com/?q=loc:+Forest+grove+dr+at+Fairway+Daly+City+CA+US
            mapkeyword = mapkeyword.replace("https://maps.google.com/?q=loc:", "");
            mapkeyword = mapkeyword.replace(/\+/g, " ");
        } else if (mapkeyword.includes("https://maps.google.com/maps/preview/@")) {
            // https://maps.google.com/maps/preview/@37.751571,-122.429659,16z
            // becomes
            // https://maps.google.com/maps/preview/@37.751571,-122.429659,16z
            mapkeyword = mapkeyword.replace("https://maps.google.com/maps/preview/@", "");
            mapkeyword = mapkeyword.split(',').slice(0,2).join(", ");
            // becomes "37.751571, -122.429659"
        } else {
            // We haven't seen this type before
            console.log("# New Map URL Type:", mapkeyword)
        }
    }

    // details.description = "";
    var info = [details.title, list.location, list.price, details.description, details.url, details.mapUrl, mapkeyword, list.pid];
    // console.log(info.join(' | '));
    csvWriter.writeRecords([ info ])
        .then(() => {
            // console.log('...Done');
        });
}
function writeListingsToFile(results) {
    console.log("# Writing to", rawResultsFile);
    let data = JSON.stringify(results, null, 2);
    fs.writeFileSync(rawResultsFile, data, (err) => {
        if (err) throw err;
        console.log('Data written to file');
    });
    fs.appendFile(rawResultsFile, '\n', function (err) {
        if (err) throw err;
        console.log('Newline written to file');
      });
}

var listsIndex = 0;
var scheduleFetchDetails = function(lists) {

    delay = 1000 * ((Math.random()*10) % maxDelaySeconds);
    console.log('# Waiting ', delay/1000, 'seconds')

    setTimeout(function(lists) {
        if (lists.length === undefined || lists.length == 0) {
            return;
        }

        console.log("# Fetching details for index", listsIndex);
        var list = lists[listsIndex++];
        client.details(list, function (err, details) {
            if (err != undefined) {
                console.log("Error while fetching details:", err)
            } else {
                processListing(list, details);
                if (listsIndex < lists.length) {
                    console.log("# Schedule next details fetch for index", listsIndex);
                    scheduleFetchDetails(lists);
                } else {
                    console.log("# Finished fetching details");
                    writeListingsToFile(allResults);
                }
            }
        })
    }, delay, lists);
}

client
    .list(options)
    .then((listings) => {
        console.log("# Found", listings.length, "Craigslist posts")
        console.log("# This operation should take approx", (listings.length*(maxDelaySeconds/2)) / 60, "mins");
        // var lists = listings.slice(0,1);
        var lists = listings; // all listings
        console.log("# Getting more details for", lists.length, "Craigslist posts")
        scheduleFetchDetails(lists);
    })
    // .then((details) => {
    //     processListing('', details);
    // })
    .catch((err) => {
        console.error(err);
    });

// client
//   .search(options, '')
//   .then((listings) => {
//     // listings (from Boston instead of Seattle)
//     listings.forEach((listing) => console.log(listing));
//   })
//   .catch((err) => {
//     console.error(err);
//   });
