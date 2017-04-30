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
  let meetingDate = '';

  const wotd = base('Meetings').select({ view: 'Grid view' }).all().then(records => {
    const meeting = records[0];
    const word = meeting.get('Word of the Day');
    const location = meeting.get('Location');
    const date = new Date(meeting.get('Date and Time')).toLocaleDateString();

    const wotd = fetch('https://od-api.oxforddictionaries.com/api/v1/entries/en/' + word, {
      headers: {
        app_id: process.env.OED_APP_ID,
        app_key: process.env.OED_APP_KEY
      }
    }).then(body => body.json());

    const tm = base('Members').find(meeting.get('Toastmaster'));
    const topicm = base('Members').find(meeting.get('TopicsMaster'));
    const ge = base('Members').find(meeting.get('General Evaluator'));
    const timer = base('Members').find(meeting.get('Timer'));
    const ah = base('Members').find(meeting.get('Ah-counter'));

    Promise.all([wotd, tm, topicm, ge, timer, ah]).then(results => {
      const defn = results[0].results[0];
      const lexicalEntries = defn.lexicalEntries[0];
      const entries = lexicalEntries.entries[0];
      const senses = entries.senses[0];
      const definitions = senses.definitions;
      res.render('agenda', {
        title: 'Dolby Speakers Meeting',
        'wotd-definition': defn,
        'location': location,
        'date': date,
        'toastmaster': results[1].get('Name'),
        'topicscmaster': results[2].get('Name'),
        'ge': results[3].get('Name'),
        'timer': results[4].get('Name'),
        'ah': results[5].get('Name')
      });
    }).catch(err => console.log(err));
  });
});



module.exports = router;