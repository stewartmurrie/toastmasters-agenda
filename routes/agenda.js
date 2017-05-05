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
hbs.registerHelper("inc", value => parseInt(value) + 1);

const getWotDDefinition = async function (wotd) {
  const b = await fetch('https://od-api.oxforddictionaries.com/api/v1/entries/en/' + wotd, {
    headers: {
      app_id: process.env.OED_APP_ID,
      app_key: process.env.OED_APP_KEY
    }
  });

  const j = await b.json();

  return j.results[0];
}

const getRow = async function(table, rowID) {
  return base(table).find(rowID);
}

const getMember = async function(id) {
  const member = await getRow('Members', id);
  let name = member.get('Name');
  let titles = member.get('Titles');

  if (titles && titles.length > 0) {
    while (titles.length > 0) {
      name += ', ' + titles.shift();
    }
  }

  return name;
}

const getProject = async function(id) {
  return getRow('Projects', id)
}

const getSpeech = async function (id) {
  const details = {};

  const speech = await getRow('Speeches', id);

  details.title = speech.get('Title');

  const [speaker, evaluator, project] = await Promise.all(
    ['Speaker', 'Evaluator'].map(role => getMember(speech.get(role)))
      .concat([getProject(speech.get('Project'))])
  );

  details.speaker = speaker;
  details.evaluator = evaluator;
  details.project = project.get('Project ID');
  details.time = project.get('Time');

  return details;
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


router.get('/', async function (req, res, next) {
  try {
    const meetingDetails = {};

    // Await the result of getting the meeting details before moving on.
    const meetingRecords = await base('Meetings').select({ view: 'Grid view' }).all();

    // Fill in the basics for the meeting with what we have so far.
    const meeting = meetingRecords[0];
    meetingDetails.location = meeting.get('Location');
    meetingDetails.date = new Date(meeting.get('Date and Time')).toLocaleDateString();
    meetingDetails.topic = meeting.get('Topic');
    meetingDetails.wotd = meeting.get('Word of the Day');

    // This is as much as we can get directly from the meeting. The rest will need to come from other database calls.
    // Get a definition for the word of the day.
    let p = [getWotDDefinition(meetingDetails.wotd)];

    // Get details of the meeting roles.
    p = p.concat(['Toastmaster', 'TopicsMaster', 'General Evaluator', 'Timer', 'Ah-counter'].map(role => getMember(meeting.get(role))));

    // Get details of the speeches.
    p = p.concat(meeting.get('Speeches').map(speechID => getSpeech(speechID)));

    const [wotdDefinition, toastmaster, topicsmaster, generalEvaluator, timer, ahCounter, ...speeches] = await Promise.all(p);

    meetingDetails.wotdDefinition = wotdDefinition;
    meetingDetails.toastmaster = toastmaster;
    meetingDetails.topicsmaster = topicsmaster;
    meetingDetails.generalEvaluator = generalEvaluator;
    meetingDetails.timer = timer;
    meetingDetails.ahCounter = ahCounter;

    meetingDetails.speeches = speeches;

    res.render('agenda', {
      title: 'Dolby Speakers Meeting',
      meeting: meetingDetails
    });
  } catch (err) {
    console.error(err);
  }
});

module.exports = router;