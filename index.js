require('dotenv').config()
const express = require('express')
const fetch = require('node-fetch')

const app = express()

app.use(express.static('public'))

app.get('/wotd', (req, res) => {
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

app.listen(3000, () => {
    console.log("I'm listening!")
})

