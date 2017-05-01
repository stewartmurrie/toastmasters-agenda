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
  const meetingDetails = {};

  const p1 = base('Meetings').select({ view: 'Grid view' }).all().then(meetingRecords => {
    const meeting = meetingRecords[0];
    const word = meeting.get('Word of the Day');
    const location = meeting.get('Location');
    const date = new Date(meeting.get('Date and Time')).toLocaleDateString();

    meetingDetails.wotd = word;
    meetingDetails.location = location;
    meetingDetails.date = date;

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

      meetingDetails.speeches.push(speechDetails);
    });

    return Promise.all(promises);

  }).then(([wotdDefn, ...speechDeets]) => {
    // Now we have everything we need to fill in the meeting details.
    meetingDetails.wotdDefinition = wotdDefn.results[0];

    // FIXME speechDeets has an implicit ordering of (speaker, evaluator). There's doubtless a better way.
    // UGH recursion can't be the best way of doing this. This is like C :(
    const t = function (sePair, i) {
      if (sePair.length == 0) return;

      let [s, e, ...rest] = sePair;
      meetingDetails.speeches[i].speaker = s.get('Name');
      meetingDetails.speeches[i].evaluator = e.get('Name');

      t(rest, i+1);
    }

    t(speechDeets, 0);

    res.render('agenda', {
      title: 'Dolby Speakers Meeting',
      meeting: meetingDetails
    });
  }).catch(err => {
    console.log(err);
    res.send(err);
  });






  // const speechRefs = meeting.get('Speeches'); // Array of speech IDs.

  // // Take a list of speech ref IDs and get the details from Airtable.
  // const d = Promise.all(speechRefs.map(speechRef => base('Speeches').find(speechRef))).then(speechRecords => {
  //   const speechDetails = [];
  //   speechRecords.forEach(record => {
  //     const speechDetail = {
  //       'title': record.get('Title'),
  //     };

  //     Promise.all([
  //       base('Members').find(record.get('Speaker')),
  //       base('Members').find(record.get('Evaluator')),
  //       base('Projects').find(record.get('Project'))
  //     ]).then(deets => {
  //       speechDetail['speaker'] = deets[0].get('Name');
  //       speechDetail['evaluator'] = deets[1].get('Name');
  //       speechDetail['project'] = deets[2].get('Project ID');
  //       speechDetail['time'] = deets[2].get('Time');
  //     });

  //     speechDetails.push(speechDetail);
  //   });

  //   return speechDetails;
  // }).catch(err => console.log(err));;

  // d.then(a => {
  //   console.log(a);
  // });

  // const speech1 = base('Speeches').find(meeting.get('Speeches')[0]);
  // const speech2 = base('Speeches').find(meeting.get('Speeches')[1]);

  // // FIXME: DRY
  // const s1 = Promise.all([speech1, speech2]).then(speeches => {
  //   const speech1 = speeches[0];
  //   const title1 = speech1.get('Title');
  //   const speaker1 = base('Members').find(speech1.get('Speaker'));
  //   const evaluator1 = base('Members').find(speech1.get('Evaluator'));
  //   const project1 = base('Projects').find(speech1.get('Project'));
  //   const speech2 = speeches[1];
  //   const title2 = speech2.get('Title');
  //   const speaker2 = base('Members').find(speech2.get('Speaker'));
  //   const evaluator2 = base('Members').find(speech2.get('Evaluator'));
  //   const project2 = base('Projects').find(speech2.get('Project'));

  //   return Promise.all([title1, speaker1, evaluator1, project1,title2, speaker2, evaluator2, project2]);
  // });



  // Promise.all([wotd, tm, topicm, ge, timer, ah, s1]).then(results => {
  //   const defn = results[0].results[0];
  //   // TODO: all these magic numbers indexing into arrays of arrays makes me nervous. I'mm sure there's a better way.

  //   res.render('agenda', {
  //     title: 'Dolby Speakers Meeting',
  //     'wotd-definition': defn,
  //     'location': location,
  //     'date': date,
  //     'toastmaster': results[1].get('Name'),
  //     'topicscmaster': results[2].get('Name'),
  //     'ge': results[3].get('Name'),
  //     'timer': results[4].get('Name'),
  //     'ah': results[5].get('Name'),
  //     'speech-title-1': results[6][0],
  //     'speaker-1': results[6][1].get('Name'),
  //     'evaluator-1': results[6][2].get('Name'),
  //     'project-1': results[6][3].get('Project ID'),
  //     'time-1': results[6][3].get('Time'),
  //     'speech-title-2': results[6][4],
  //     'speaker-2': results[6][5].get('Name'),
  //     'evaluator-2': results[6][6].get('Name'),
  //     'project-2': results[6][7].get('Project ID'),
  //     'time-2': results[6][7].get('Time'),
  //   });
  // }).catch(err => console.log(err));
  // });
});

module.exports = router;