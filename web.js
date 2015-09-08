'use strict';

var Yakuza, colors, Hapi, server;

// here, require the scrapers
require('./inapi/inapi.scraper');

Yakuza = require('yakuza');
colors = require('colors');
Hapi = require('hapi');

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



// Create a server with a host and port
server = new Hapi.Server();
server.connection({
  'host': '0.0.0.0',
  'port': process.env.PORT
}, {
  'timeout': {
    'server': true
  }
}, {
  'payload': {
    'timeout': 120000
  }
});

// Add the route
server.route({
  'method': 'GET',
  'path': '/inapi/{brand}',
  'handler': function (request, reply) {
    var job, params, brand = request.params.brand;
    console.log(request.query);
    console.log('Search: ' + brand);
    params = {
      'brand': brand
    };

    job = Yakuza.job('Inapi', 'Brand', params);
    if (request.query.type === 'exact') {
      job.routine('GetBrandExact');
    } else if (request.query.type === 'contain') {
      job.routine('GetBrandContain');
    } else {
      job.routine('GetBrandExact');
    }

    job.on('job:fail', function (res) {
      console.log('Something failed'.error);
      console.log('Error is: '.error);
      reply(res).header('Content-Type', 'application/json');
    });

    job.on('task:*:success', function (task) {
      console.log('Search done!');
      reply(task.data).header('Content-Type', 'application/json');
    });

    job.run();
  }
});

server.route({
  'method': 'GET',
  'path': '/inapi/{brand}/{solicitud}',
  'handler': function (request, reply) {
    var job, params,
        brand = request.params.brand,
        solicitud = request.params.solicitud;

    console.log('Search: ' + brand);
    params = {
      'brand': brand,
      'solicitud': solicitud
    };

    job = Yakuza.job('Inapi', 'Brand', params);
    job.routine('GetBrandById');

    job.on('job:fail', function (res) {
      console.log('Something failed'.error);
      console.log('Error is: '.error);
      reply(res).header('Content-Type', 'application/json');
    });

    job.on('task:*:success', function (task) {
      console.log('Search done!');
      reply(task.data).header('Content-Type', 'application/json');
    });

    job.run();
  }
});

// Start the server
server.start(function () {
  console.log('Server running at:', server.info.uri);
});
