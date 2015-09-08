'use strict';

var Yakuza, colors, express, bodyParser, app, PORT, timeout;

// here, require the scrapers
require('./inapi/inapi.scraper');

Yakuza = require('yakuza');
colors = require('colors');
express = require('express');
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

app = express();
PORT = process.env.PORT || 8000;

app.set('port', PORT);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({'extended': false}));
app.use(timeout('3m'));
app.use(haltOnTimedout);

function haltOnTimedout (req, res, next) {
  if (!req.timedout) {
    next();
  }
}

// routes definition
app.get('/inapi/:brand', function (req, result) {
  var job, params, brand2find;

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
    result.json(res);
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

app.listen(app.get('port'), function () {
  console.log('Listening on: http://localhost:' + app.get('port'));
});
