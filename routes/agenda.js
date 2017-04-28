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

const Fieldbook = require('fieldbook-client');
const client = new Fieldbook({
  key: process.env.FIELDBOOK_API_USERNAME,
  secret: process.env.FIELDBOOK_API_PASSWORD,
  bookId: process.env.FIELDBOOK_BOOK_ID
});

hbs.registerHelper('concat', (...args) => args.slice(0, -1).join(''));

router.get('/', function (req, res, next) {
  let meetingDate='';

  // base('Meetings').select({
  //     // Selecting the first 3 records in Grid view:
  //     view: "Grid view"
  // }).firstPage((error, records) => {
  //     if (error) { console.error(err); return }
      
  //     // records.forEach(record => {
  //     //     console.log('Retrieved', record.get('Date and Time'));
  //     // });

  //     meetingDate = records['Date and Time'];
  // });


  let fbPromise = client.list('meetings');
  let oedPromise = fetch('https://od-api.oxforddictionaries.com/api/v1/entries/en/ace', {
    headers: {
      app_id: process.env.OED_APP_ID,
      app_key: process.env.OED_APP_KEY
    }
  });

  Promise.all([fbPromise, oedPromise]).then(results => {
    const fbRecords = results.shift();
    const oedResponse = results.shift();

    oedResponse.json().then(oedDef => {
      const meetingDate = fbRecords[0].date;

      const results = oedDef.results[0];
      const lexicalEntries = results.lexicalEntries[0];
      const entries = lexicalEntries.entries[0];
      const senses = entries.senses[0];
      const definitions = senses.definitions;
      
      res.render('agenda', {
        title: 'Dolby Speakers Meeting',
        'wotd-definition': results,
        'meeting-date': meetingDate
      });
    })

  });
  

  // Promise.all([fbPromise, oedPromise]).then(resultsArray => {
  //   resultsArray[1].then(oedJSON => {
  //     oedJSON.json()
  //   }).then (oedDef => {

  //     const meetingDate = resultsArray[0][0].date;

  //     const results = json.results[0];
  //     const lexicalEntries = results.lexicalEntries[0];
  //     const entries = lexicalEntries.entries[0];
  //     const senses = entries.senses[0];
  //     const definitions = senses.definitions;
      
  //     res.render('agenda', {
  //       title: 'Dolby Speakers Meeting',
  //       'wotd-definition': results,
  //       'meeting-date': meetingDate
  //     });
  //   });
  // });
});



module.exports = router;