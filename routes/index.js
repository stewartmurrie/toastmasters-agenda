require('dotenv').config();
var express = require('express');
var router = express.Router();
const fetch = require('node-fetch');

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/agenda', function (req, res, next) {
  res.render('agenda', { title: 'Dolby Speakers Meeting' });
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
