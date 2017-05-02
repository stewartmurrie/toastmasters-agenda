require('dotenv').config();
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const hbs = require('hbs');
const co = require('co');

const Airtable = require('airtable');
Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: process.env.AIRTABLE_API_KEY
});
const base = Airtable.base(process.env.AIRTABLE_APP_ID);

hbs.registerHelper('concat', (...args) => args.slice(0, -1).join(''));
hbs.registerHelper("inc", value => parseInt(value) + 1);

async function getWotDDefinition(wotd) {
  const b = await fetch('https://od-api.oxforddictionaries.com/api/v1/entries/en/' + wotd, {
      headers: {
        app_id: process.env.OED_APP_ID,
        app_key: process.env.OED_APP_KEY
      }
    });

  const j = await b.json();

  return j.results[0];
}

router.get('/wotd', function (req, res, next) {  
  (async () => {
    try {
      const r = await getWotDDefinition('ace')
      res.send(r);
    } catch (err) {
      console.log(err);
    }
  })();
});


router.get('/', function (req, res, next) {
  const meetingDetails = {};

  const p1 = base('Meetings').select({ view: 'Grid view' }).all().then(meetingRecords => {
    const meeting = meetingRecords[0];
    const word = meeting.get('Word of the Day');
    const location = meeting.get('Location');
    const date = new Date(meeting.get('Date and Time')).toLocaleDateString();
    const topic = meeting.get('Topic');

    meetingDetails.wotd = word;
    meetingDetails.location = location;
    meetingDetails.date = date;
    meetingDetails.topic = topic;

    const wotdP = fetch('https://od-api.oxforddictionaries.com/api/v1/entries/en/' + word, {
      headers: {
        app_id: process.env.OED_APP_ID,
        app_key: process.env.OED_APP_KEY
      }
    });

    // Get the basic functionaries
    const tmP = base('Members').find(meeting.get('Toastmaster'));
    const topicmP = base('Members').find(meeting.get('TopicsMaster'));
    const geP = base('Members').find(meeting.get('General Evaluator'));
    const timerP = base('Members').find(meeting.get('Timer'));
    const ahP = base('Members').find(meeting.get('Ah-counter'));

    // Now to get the speeches. These are a little tricker because (a) it's an array, and (b) there's more nested data to be fetched within these.
    const speechPs = meeting.get('Speeches').map(speechID => base('Speeches').find(speechID));

    return Promise.all([wotdP, tmP, topicmP, geP, timerP, ahP, ...speechPs]);

  }).then(([wotdBody, toastmaster, topicsmaster, genevalEval, timer, ahCounter, ...speeches]) => {

    // These details are available now, so stash them in shared state.
    meetingDetails.toastmaster = toastmaster.get('Name');
    meetingDetails.topicsmaster = topicsmaster.get('Name');
    meetingDetails.generalEvaluator = genevalEval.get('Name');
    meetingDetails.timer = timer.get('Name');
    meetingDetails.ahCounter = ahCounter.get('Name');
    meetingDetails.speeches = [];

    // Some more things require more fetching, so Promisify these now. E.g., the WOTD response which is just a body just now.
    const promises = [wotdBody.json()];

    speeches.forEach(speech => {
      const speechDetails = {};

      speechDetails.title = speech.get('Title');

      promises.push(base('Members').find(speech.get('Speaker')));
      promises.push(base('Members').find(speech.get('Evaluator')));
      promises.push(base('Projects').find(speech.get('Project')));

      meetingDetails.speeches.push(speechDetails);
    });

    return Promise.all(promises);

  }).then(([wotdDefn, ...speechDeets]) => {
    // Now we have everything we need to fill in the meeting details.
    meetingDetails.wotdDefinition = wotdDefn.results[0];

    // FIXME speechDeets has an implicit ordering of (speaker, evaluator). There's doubtless a better way.
    // UGH recursion can't be the best way of doing this. This is like C :(
    const projectPs = [];

    const t = function (sePair, i) {
      if (sePair.length == 0) return;

      let [s, e, p, ...rest] = sePair;
      meetingDetails.speeches[i].speaker = s.get('Name');
      meetingDetails.speeches[i].evaluator = e.get('Name');
      meetingDetails.speeches[i].project = p.get('Project ID');
      meetingDetails.speeches[i].time = p.get('Time');

      t(rest, i+1);
    }

    t(speechDeets, 0);

    res.render('agenda', {
      title: 'Dolby Speakers Meeting',
      meeting: meetingDetails
    });
  }).catch(err => {
    throw new Error(err);
  });
});

module.exports = router;