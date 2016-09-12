/**
 * Created by scott on 7/21/16.
 */
'use strict';
function tutorialPageNavigation ($window) {
  var setData = function (key, value) {
    $window.sessionStorage.setItem(key, value);
  };

  var getData = function (key) {
    return $window.sessionStorage.getItem(key);
  };

  return {
    setData: setData,
    getData: getData
  };
}

angular
.module('refineryDashboard')
.factory(
  'tutorialPageNavigation',
  [
    '$window',
    tutorialPageNavigation
  ]
);
