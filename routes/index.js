var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/agenda', function(req, res, next) {
  res.render('agenda', { title: 'Dolby Speakers Meeting' });
});

module.exports = router;
