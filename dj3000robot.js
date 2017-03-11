const https = require("https")
const fs = require("fs")

const TwitterBot = require("node-twitterbot").TwitterBot
const search = require('youtube-search')
var Forecast = require('forecast');
const _ = require('underscore');

const jams = require('./jams')
const cities = require('./cities')
const keys = require('./keys')

Array.prototype.random = function () {
  return this[Math.floor((Math.random()*this.length))];
}

const oneHour = 3600000;

const Bot = new TwitterBot({
    "consumer_secret": keys.twitterConsumerSecret,
    "consumer_key": keys.twitterConsumerKey,
    "access_token": keys.twitterAccessToken,
    "access_token_secret": keys.twitterAccessTokenSecret
});


const forecast = new Forecast({
  service: 'darksky',
  key: keys.forecastKey,
  units: 'fahrenheit',
  cache: false,
});

const youtubeOpts = {
  maxResults: 10,
  type: 'video',
  key: keys.youTubeKey
}

const weatherOpts = {
  search: '10108',
  degreeType: 'F'
}

const newsUrl = `https://content.guardianapis.com/search?api-key=${keys.newsKey}&q=congress%20OR%20%22white%20house%22%20OR%20trump&order-by=newest&section=us-news`
const newsPhrases = [
  "What a bunch of clowns.",
  "Looks like those clowns in Congress did it again.",
  "How does it keep up with the news like that?"
];

function formatNewsTweet(twitter, action, tweet) {
  https.get(newsUrl, (response) => {
    response.setEncoding('utf8');
    let rawData = '';
    response.on('data', (chunk) => rawData += chunk);
    response.on('end', () => {
      try {
        let parsedData = JSON.parse(rawData);
        let articles = parsedData.response.results;
        article = articles.random();
        const url = article.webUrl;
        const caption = newsPhrases.random();
        const tweet = `${caption} ${url}`;
        Bot.tweet(tweet);
        logTweet(tweet)
      } catch (e) {
        console.log(e.message);
      }
    })
  })
}


function formatWeatherTweet() {
  let city = cities.random();
  let coords = [city.lat, city.lng];
  forecast.get(coords, function(err, weather) {
    if(err) return console.dir(err);
    let tweet = `Hey, hey. How about that weather out there, ${city.name}? ${Math.round(weather.currently.temperature)}°F, ${weather.minutely.summary}`
    Bot.tweet(tweet)
    logTweet(tweet)
  });
}

function formatMusicTweet() {
  let jam = jams.random();
  search(jam, youtubeOpts, function(err, results) {
    let validResults = _.filter(results, (result) => {
      let title = result.title;
      let predicate = (
        !title.match(/live/i) &&
        !title.match(/parody/i) &&
        !title.match(/cover/i)
      )
      return predicate
    })
    let tweet = `${validResults[0]['title']} ${validResults[0]['link']}`
    Bot.tweet(tweet)
    logTweet(tweet)
  });
}

function logTweet(tweet) {
  console.log(tweet)
  fs.appendFile('tweets.html', `${tweet}\n\n`, (err) => {
    if (err) throw err;
  });
}

function getTweet() {
    let tweetTypes = [formatMusicTweet, formatWeatherTweet, formatNewsTweet];
    tweetTypes.random()();
}

let tweetInterval = setInterval(getTweet, oneHour*3)
getTweet();

process.on('SIGINT', () => {
  clearInterval(tweetInterval)
  setTimeout(function() {
  process.exit(0);
  }, 300);
});
