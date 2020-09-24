const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const apis = require('./apis');

const headers = {
    // 'allowedHeaders': ['Content-Type', 'Authorization'],
    'origin': '*',
    // 'methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
    // 'preflightContinue': true
};

app.use(cors(headers));
app.options('*', cors(headers));
app.use(function (req, res, next) {
    req.headers['if-none-match'] = 'no-match-for-this';
    next();
});
app.use(bodyParser.json({ type: 'application/json', limit: process.env.REQUEST_LIMIT }));
app.use(bodyParser.urlencoded({ extended: true }));

// load static file
app.use('/public', express.static('public'));

// load APIs
apis.load(app);

module.exports = app;