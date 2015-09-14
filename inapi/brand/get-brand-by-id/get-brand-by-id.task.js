'use strict';

// CONST, classes, task-name
var TYPE, URL_BASE, ID_STACK, STACK_COUNT, Yakuza, Q, crypto, _, GetBrandById;

Yakuza = require('yakuza');
_ = require('lodash');
Q = require('q');
crypto = require('crypto');

TYPE = {
  'exacta': 1,
  'contenga': 2
};
/**
 * Base url of the web page.
 */
URL_BASE = 'http://ion.inapi.cl:8080/Marca/BuscarMarca.aspx';
ID_STACK = [];
STACK_COUNT = 0;

/**
 * Task GetShopLink of Bikes Agent.
 */
GetBrandById = Yakuza.task('Inapi', 'Brand', 'GetBrandById');

/**
 * Builder of Bikes task, this builder pass data from Job.
 */
GetBrandById.builder(function (job) {
  // pass the section to retrieve the corresponding url.
  return {
    'kind': job.params.kind,
    'solicitud': job.params.solicitud
  };
});

/**
 * Hook to make retries, modify data.
 */
GetBrandById.hooks({
  // if something fail, make 3 retries.
  'onFail': function (task) {
    // 3 retries, then stop.
    if (task.runs === 1) {
      return;
    }
    task.rerun();
  }
});
/**
 * Main function, here we write the code to extract, in this case,
 * shop link.
 */
GetBrandById.main(function (task, http, params) {
  var template, requestOpts, kind, count, solicitud, formData, hashes;

  template = http.optionsTemplate({
    'headers': {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'followRedirect': true,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36',
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest'
    },
    'json': true,
    'open_timeout': 120000
  });

  kind = params.kind;
  solicitud = params.solicitud;
  kind = TYPE[kind] || 1;

  requestOpts = template.build({
    'url': URL_BASE
  });

  http.get(requestOpts)

  .then(function (result) {
    var str, ini, fin, body;

    str = 'setHash(\'';
    ini = result.body.indexOf(str);
    body = result.body.substring(ini + str.length, result.body.length);
    fin = body.indexOf('\');Sys');
    hashes = body.substring(0, fin).split('\',\'');

    formData = {
      'Hash': hashes[0], 'IDW': hashes[1],
      'LastNumSol': '0', 'param1': solicitud, 'param2': '',
      'param3': '', 'param4': '', 'param5': '', 'param6': '', 'param7': '', 'param8': '',
      'param9': '', 'param10': '', 'param11': '', 'param12': '', 'param13': '',
      'param14': '', 'param15': '', 'param16': '', 'param17': kind.toString()
    };

    requestOpts = template.build({
      'url': URL_BASE + '/FindMarcas',
      'data': formData
    });

    return http.post(requestOpts);
  })

  .then(function (result) {
    var str2find, request, id;

    if (result.res.statusCode === 200) {
      result = JSON.parse(result.body.d);
    }

    if (typeof result.Message !== 'undefined') {
      str2find = 'En estos momentos no se puede Generar';

      if (result.ErrorMessage.indexOf(str2find) >= 0) {
        task.sucess('error');
      }
    } else if (result.Marcas.length === 0) {
      task.success(count);
    } else {
      id = _.pluck(result.Marcas, 'id')[0];
      formData = {
        'Hash': result.Hash,
        'IDW': hashes[1],
        'numeroSolicitud': id
      };

      request = template.build({
        'url': URL_BASE + '/FindMarcaByNumeroSolicitud',
        'data': formData
      });

      return http.post(request).then(function (requestResult) {
        return JSON.parse(requestResult.body.d).Marca;
      });
    }
  })
  .then(function (result) {
    task.success(result);
  })
  .fail(function (err) {
    // Public final error to Yakuza.
    task.fail(err);
  }).done();
});
