'use strict';

// CONST, classes, task-name
var TYPE, URL_BASE, Yakuza, Q, _, getBrandExact;

Yakuza = require('yakuza');
_ = require('lodash');
Q = require('q');

/**
 * Base url of the web page.
 */
URL_BASE = 'http://ion.inapi.cl:8080/Marca/BuscarMarca.aspx';

/**
 * Task GetShopLink of Bikes Agent.
 */
getBrandExact = Yakuza.task('Inapi', 'Brand', 'GetBrandExact');

/**
 * Builder of Bikes task, this builder pass data from Job.
 */
getBrandExact.builder(function (job) {
  // pass the section to retrieve the corresponding url.
  return {
    'brand': job.params.brand
  };
});

/**
 * Hook to make retries, modify data.
 */
getBrandExact.hooks({
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
getBrandExact.main(function (task, http, params) {
  var template, requestOpts, count, brand, formData, hashes;

  template = http.optionsTemplate({
    'headers': {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'followRedirect': true,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36',
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest'
    },
    'json': true,
    'timeout': 120000
  });

  brand = params.brand;

  count = {
    'disponible': true,
    'concedidas': 0,
    'concedidasDist': 0,
    'enTramite': 0,
    'enTramiteDist': 0,
    'caducado': 0,
    'rechazadas': 0,
    'vencidas': 0,
    'desistidas': 0,
    'anuladas': 0,
    'indefinido': 0
  };

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
      'LastNumSol': '0', 'param1': '', 'param2': '',
      'param3': brand, 'param4': '', 'param5': '', 'param6': '', 'param7': '', 'param8': '',
      'param9': '', 'param10': '', 'param11': '', 'param12': '', 'param13': '',
      'param14': '', 'param15': '', 'param16': '', 'param17': '1'
    };

    requestOpts = template.build({
      'url': URL_BASE + '/FindMarcas',
      'data': formData
    });

    return http.post(requestOpts);
  })

  .then(function (result) {
    var str2find, promiseChain;

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
      var newHash = result.Hash;
      count.disponible = false;
      promiseChain = Q.resolve(count);
      result = _.pluck(result.Marcas, 'id');

      formData = {
        'IDW': hashes[1]
      };

      _.each(result, function (id) {
        var request;

        promiseChain = promiseChain.then(function (count) {
          formData.numeroSolicitud = id;
          formData.Hash = newHash;

          request = template.build({
            'url': URL_BASE + '/FindMarcaByNumeroSolicitud',
            'data': formData
          });

          return http.post(request).then(function (requestResult) {
            result = JSON.parse(requestResult.body.d);

            newHash = result.Hash;
            result = result.Marca;

            if (('Estado' in result) && ('Denominacion' in result)) {
              if (result.Estado === 'C' && result.Denominacion === brand.toUpperCase()) {
                count.concedidas += 1;
              } else if (result.Estado === 'C' && result.Denominacion !== brand.toUpperCase()) {
                count.concedidasDist += 1;
              }

              if (result.Estado === ' ' && result.Denominacion === brand.toUpperCase()) {
                count.enTramite += 1;
              } else if (result.Estado === ' ' && result.Denominacion !== brand.toUpperCase()) {
                count.enTramiteDist += 1;
              }

              if (result.Estado === 'U') {
                count.caducado += 1;
              } else if (result.Estado === 'N') {
                count.rechazadas += 1;
              } else if (result.Estado === 'V') {
                count.vencidas += 1;
              } else if (result.Estado === 'D') {
                count.desistidas += 1;
              } else if (result.Estado === 'A') {
                count.anuladas += 1;
              } else if (result.Estado === 'P') {
                count.indefinido += 1;
              }
            }

            return count;
          });
        });
      });
      return promiseChain;
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
