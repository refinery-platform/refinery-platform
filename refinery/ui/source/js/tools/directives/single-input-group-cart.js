(function () {
  'use strict';
  angular.module('refineryTools').component('rpSingleInputGroupCart', {
    controller: 'SingleInputGroupCartCtrl',
    require: {
      navCtrl: '^rpSingleInputGroupNav'
    },
    templateUrl: '/static/partials/tools/partials/single-input-group-cart.html'
  });
})();
