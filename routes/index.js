require('dotenv').config();
var express = require('express');
var router = express.Router();
const fetch = require('node-fetch');

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/agenda', function (req, res, next) {

  var request = {
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
    })

});

router.get('/wotd', (req, res) => {
  var request = {
    headers: {
      app_id: process.env.OED_APP_ID,
      app_key: process.env.OED_APP_KEY
    }
  }

  fetch('https://od-api.oxforddictionaries.com/api/v1/entries/en/tumultuous', request)
    .then(response => response.json())
    .then(json => {


      console.log(json)
      res.send(json)
    })
});


module.exports = router;
