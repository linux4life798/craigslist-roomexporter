const craigslist = require('node-craigslist');
const createCsvWriter = require('csv-writer').createArrayCsvWriter;
const csvWriter = createCsvWriter({
    header: ['TITLE', 'LOCATION', 'PRICE', 'DESCRIPTION', 'URL', 'MAPURL', 'MAPKEYWORD'],
    path: 'sfbay.csv'
});

const records = [
    ['Bob',  'French, English'],
    ['Mary', 'English']
];

// csvWriter.writeRecords(records)       // returns a promise
    // .then(() => {
    //     console.log('...Done');
    // });

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

var processListing = function(list, details) {
    console.log("Listing: ", list);
    console.log('\n\n\n');
    console.log("Details: ", details);
    console.log('\n\n\n');

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
    var info = [details.title, list.location, list.price, details.description, details.url, details.mapUrl, mapkeyword];
    // console.log(info.join(' | '));
    csvWriter.writeRecords([ info ])
        .then(() => {
            // console.log('...Done');
        });
}

// client
//     .list(options)
//     .then((listings) => { console.log(listings[4]); console.log('\n\n\n'); return client.details(listings[4]); })
//     .then((details) => {
//         processListing('', details);
//     })
//     .catch((err) => {
//         console.error(err);
//     });

client
    .list(options)
    .then((listings) => {
        var list = listings[4];
        client.details(list, function (err, details) {
            processListing(list, details);
        });
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
