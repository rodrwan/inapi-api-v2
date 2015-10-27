'use strict';

var Yakuza, colors, express, bodyParser, app, PORT, timeout, http, server, allowCrossDomain, io;

// here, require the scrapers
require('./inapi/inapi.scraper');

Yakuza = require('yakuza');
colors = require('colors');
express = require('express');
http = require('http');
bodyParser = require('body-parser');
timeout = require('connect-timeout');

// tools for debug
colors.setTheme({
  'silly': 'rainbow',
  'input': 'grey',
  'verbose': 'cyan',
  'prompt': 'grey',
  'info': 'green',
  'data': 'grey',
  'help': 'cyan',
  'warn': 'yellow',
  'debug': 'blue',
  'error': 'red'
});

// CORS middleware
allowCrossDomain = function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  next();
};

app = express();
PORT = process.env.PORT || 8000;

app.set('port', PORT);
app.use(timeout('5m'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({'extended': false}));
app.use(allowCrossDomain);

function haltOnTimedout (req, res, next) {
  if (!req.timedout) {
    next();
  }
}

// routes definition
app.get('/inapi/:brand', timeout('5m'), bodyParser.json(), haltOnTimedout, function (req, result, next) {
  var job, params, brand2find;

  if (req.timeout) {
    console.log(req.timeout);
    return;
  }

  brand2find = req.params.brand;
  console.log(req.query);
  console.log('Search: ' + brand2find);
  params = {
    'brand': brand2find
  };

  job = Yakuza.job('Inapi', 'Brand', params);
  if (req.query.type === 'exact') {
    job.routine('GetBrandExact');
  } else if (req.query.type === 'contain') {
    job.routine('GetBrandContain');
  } else {
    job.routine('GetBrandExact');
  }

  job.on('job:fail', function (res) {
    console.log('Something failed'.error);
    console.log('Error is: '.error);
    console.log(res);

    result.json({
      'error': res.error,
      'message': 'Something went wrong'
    });
    return;
  });

  job.on('task:*:success', function (task) {
    console.log('Search done!');
    result.json(task.data);
  });

  job.run();
});

server = http.createServer(app);
server.listen(PORT);

io = require('socket.io').listen(server);
console.log('----- Listening in port ' + PORT + ' -----');

io.on('connection', function (socket) {
  console.log('connected');

  socket.on('brand:exact', function (brand2find) {
    var job, params;
    console.log('---- running exact query ----');
    console.log('Search: ' + brand2find);
    params = {
      'brand': brand2find
    };

    job = Yakuza.job('Inapi', 'Brand', params);
    job.routine('GetBrandExact');

    job.on('job:fail', function (res) {
      console.log('Something failed with exact brand in socket method'.error);
      console.log('Error is: '.error);
      console.log(res);
      if (res) {
        socket.emit('brandError', res.error);
      }
    });

    job.on('task:*:success', function (task) {
      console.log('Search done!');
      socket.emit('brandExactResult', task.data);
    });

    job.run();
  });

  socket.on('brand:contain', function (brand2find) {
    var job, params;

    console.log('---- running contain query ----');
    console.log('Search: ' + brand2find);
    params = {
      'brand': brand2find
    };

    job = Yakuza.job('Inapi', 'Brand', params);
    job.routine('GetBrandContain');

    job.on('job:fail', function (res) {
      console.log('Something failed with contained brand in socket method'.error);
      console.log('Error is: '.error);
      console.log(res);
      if (res) {
        socket.emit('brandError', res.error);
      }
    });

    job.on('task:*:success', function (task) {
      console.log('Search done!');
      socket.emit('brandContainResult', task.data);
    });

    job.run();
  });
});
