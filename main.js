const fs = require('fs');
const craigslist = require('node-craigslist');
const createCsvWriter = require('csv-writer').createArrayCsvWriter;

const csvFileName = "sfbay.csv";
const databaseFileName = "results.json";
const minDelaySeconds = 10; // for fetching details
const maxDelaySeconds = 30; // for fetching details
const maxTitlePreviewLength = 40;

// const listingsOffset = 120;
const listingsOffset = 0;

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
    city : 'sfbay',
    // maxAsk : '200',
    // minAsk : '100'
    offset: listingsOffset
  };

var allResults = {};

var processListing = function(list, details) {
    // console.log("Listing: ", list);
    // console.log('\n\n\n');
    // console.log("Details: ", details);
    // console.log('\n\n\n');

    allResults[list.pid] = {list: list, details: details};

    console.log("# DB size is now", Object.keys(allResults).length)

    // Print the preview
    console.log("Listing:", list.title.substring(0,maxTitlePreviewLength), "|", list.url)
}

function readListingsFromFile() {
    console.log("# Reading database file in");
    let data = fs.readFileSync(databaseFileName, 'utf8');
    return JSON.parse(data);
}

function writeListingsToFile(results, callback) {
    // write db of all saved entries
    let dbCount = Object.keys(results).length;
    console.log("# Writing ", dbCount, "entries to", databaseFileName);
    let data = JSON.stringify(results, null, 2);
    fs.writeFileSync(databaseFileName, data, (err) => {
        if (err) throw err;
        console.log('# Data written to file');
    });
    fs.appendFile(databaseFileName, '\n', function (err) {
        if (err) throw err;
        console.log('# Newline written to file');
    });

    // write csv of all results
    var allCsv = [];
    console.log('# Writing', csvFileName);
    for (pid in results) {
        // details.description = "";
        let details = results[pid].details;
        let list = results[pid].list;

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


        let info = [details.title, list.location, list.price, details.description, details.url, details.mapUrl, mapkeyword, list.pid];
        allCsv.push(info);
    }

    csvWriter.writeRecords(allCsv)
    .then(() => {
        console.log('# Done writing csv');
        callback();
    });
}

var listsIndex = 0;
var scheduleFetchDetails = function(lists) {

    delay = ((Math.random()*10) % maxDelaySeconds);
    if (delay < minDelaySeconds) {
        delay = delay + minDelaySeconds;
    }
    delay = delay * 1000;
    console.log('# Waiting ', delay/1000, 'seconds')

    setTimeout(function(lists) {
        if (lists.length === undefined || lists.length == 0) {
            return;
        }

        console.log("# Fetching details for index", listsIndex);
        var list = lists[listsIndex++];

        var proceed = function() {
            if (listsIndex < lists.length) {
                console.log("# Schedule next details fetch for index", listsIndex);
                scheduleFetchDetails(lists);
            } else {
                console.log("# Finished fetching details");
                let count = Object.keys(allResults).length;
                console.log("# Total of", count, "results in database");
                writeListingsToFile(allResults, function(){});
            }
        }

        if (allResults[list.pid] !== undefined) {
            console.log("Already in DB -- Will ignore fetching details");
            proceed();
        } else {
            console.log("New to DB");

            client.details(list, function (err, details) {
                if (err != undefined) {
                    console.error("Error while fetching details:", err)
                    // quit, but make sure to write out results
                    writeListingsToFile(allResults, function(){});
                } else {
                    processListing(list, details);
                    proceed();
                }
            });
        }

    }, delay, lists);
}

process.on('SIGINT', () => {
    console.log('Received SIGINT.');
    writeListingsToFile(allResults, function() {
        process.exit(0);
    });
  });

if (fs.existsSync(databaseFileName)) {
    allResults = readListingsFromFile();
    console.log("# Read in", Object.keys(allResults).length, "entries from DB");
} else {
    allResults = {};
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
    .catch((err) => {
        console.error(err);
    });