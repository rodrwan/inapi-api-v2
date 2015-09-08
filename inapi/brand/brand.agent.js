'use strict';

var Yakuza;

Yakuza = require('yakuza');

// require tasks
require('./get-brand/get-brand.task');
require('./get-brand-contain/get-brand-contain.task');
require('./get-brand-by-id/get-brand-by-id.task');

Yakuza.agent('Inapi', 'Brand')
  .plan([
    'GetBrandExact',
    'GetBrandContain',
    'GetBrandById'
  ])
  .routine('GetBrandExact', [
    'GetBrandExact'
  ])
  .routine('GetBrandContain', [
    'GetBrandContain'
  ])
  .routine('GetBrandById', [
    'GetBrandById'
  ]);
