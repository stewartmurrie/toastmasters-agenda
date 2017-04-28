require('dotenv').config();
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const hbs = require('hbs');

hbs.registerHelper('concat', (...args) => args.slice(0, -1).join(''));

router.get('/', function (req, res, next) {


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