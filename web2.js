'use strict';

var Yakuza, colors, express, bodyParser, app, PORT, timeout, http, server, allowCrossDomain;

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
    if (res) {
      return next(res);
    }
  });

  job.on('task:*:success', function (task) {
    console.log('Search done!');
    result.json(task.data);
  });

  job.run();
});


// server.route({
//   'method': 'GET',
//   'path': '/inapi/{brand}/{solicitud}',
//   'handler': function (request, reply) {
//     var job, params,
//         brand = request.params.brand,
//         solicitud = request.params.solicitud;

//     console.log('Search: ' + brand);
//     params = {
//       'brand': brand,
//       'solicitud': solicitud
//     };

//     job = Yakuza.job('Inapi', 'Brand', params);
//     job.routine('GetBrandById');

//     job.on('job:fail', function (res) {
//       console.log('Something failed'.error);
//       console.log('Error is: '.error);
//       reply(res).header('Content-Type', 'application/json');
//     });

//     job.on('task:*:success', function (task) {
//       console.log('Search done!');
//       reply(task.data).header('Content-Type', 'application/json');
//     });

//     job.run();
//   }
// });

server = http.createServer(app);
server.listen(PORT);

console.log('----- Listening in port ' + PORT + ' -----');

server.on('connection', function(socket) {
  console.log("A new connection was made by a client.");
  socket.setTimeout(30 * 5000);
  // 30 second timeout. Change this as you see fit.
});
