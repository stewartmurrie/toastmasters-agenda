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
const fbClient = new Fieldbook({
  key: process.env.FIELDBOOK_API_USERNAME,
  secret: process.env.FIELDBOOK_API_PASSWORD,
  bookId: process.env.FIELDBOOK_BOOK_ID
});

hbs.registerHelper('concat', (...args) => args.slice(0, -1).join(''));

router.get('/', function (req, res, next) {
  let meetingDate='';

  base('Meetings').select({view: 'Grid view'}).all().then(records => {
    const meeting = records[0];
    const wotd = meeting.get('Word of the Day');
    
   let a = fetch('https://od-api.oxforddictionaries.com/api/v1/entries/en/' + wotd, {
      headers: {
        app_id: process.env.OED_APP_ID,
        app_key: process.env.OED_APP_KEY
        }
      }).then(body => body.json()).then(wotdDefn => {
        const results = wotdDefn.results[0];
        const lexicalEntries = results.lexicalEntries[0];
        const entries = lexicalEntries.entries[0];
        const senses = entries.senses[0];
        const definitions = senses.definitions;
      });
    
    let b = base('Members').find(meeting.get('Toastmaster'));
    
    Promise.all([a, b]).then(results => {
        res.render('agenda', {
          title: 'Dolby Speakers Meeting',
          'wotd-definition': results,
          'toastmaster': results[1].get('Name'),
        });
    });
  });
});



module.exports = router;