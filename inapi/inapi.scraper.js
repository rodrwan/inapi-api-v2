'use strict';

var Yakuza;

Yakuza = require('yakuza');

// require agents
require('./brand/brand.agent');

Yakuza.scraper('Inapi').routine('FirstRun', [
  'GetBrand'
]);
