require('dotenv').config();
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const hbs = require('hbs');

const Airtable = require('airtable');
Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: process.env.AIRTABLE_API_KEY
});
const base = Airtable.base(process.env.AIRTABLE_APP_ID);

hbs.registerHelper('concat', (...args) => args.slice(0, -1).join(''));

router.get('/', function (req, res, next) {

  base('Meetings').select({
      // Selecting the first 3 records in Grid view:
      maxRecords: 3,
      view: "Grid view"
  }).eachPage(function page(records, fetchNextPage) {
      // This function (`page`) will get called for each page of records.

      records.forEach(function(record) {
          console.log('Retrieved', record.get('Date and Time'));
      });

      // To fetch the next page of records, call `fetchNextPage`.
      // If there are more records, `page` will get called again.
      // If there are no more records, `done` will get called.
      fetchNextPage();

  }, function done(err) {
      if (err) { console.error(err); return; }
  });


  // Get the definition for the word of the day
  const request = {
    headers: {
      app_id: process.env.OED_APP_ID,
      app_key: process.env.OED_APP_KEY
    }
  }

  fetch('https://od-api.oxforddictionaries.com/api/v1/entries/en/ace', request)
    .then(response => response.json())
    .then(json => {

      const results = json.results[0];
      const lexicalEntries = results.lexicalEntries[0];
      const entries = lexicalEntries.entries[0];
      const senses = entries.senses[0];
      const definitions = senses.definitions;
      
      res.render('agenda', {
        title: 'Dolby Speakers Meeting',
        'wotd-definition': results
      });
    });

});


module.exports = router;