'use strict';

function IGVFactory (
  $http,
  $window,
  $log) {
  var speciesList = [];

  // Generate species list from key value pair in api response
  var generateSpeciesList = function (responseList) {
    angular.forEach(responseList.species, function (value, key) {
      speciesList.push({
        name: key,
        url: value
      });
    });
  };

  // Grab species list from igv api
  var getSpeciesList = function (igvConfig) {
    return $http({
      method: 'POST',
      url: '/solr/igv/',
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      },
      dataType: 'json',
      data: igvConfig
    }).success(function (response) {
      generateSpeciesList(response);
    }).error(function (errorMsg) {
      $log.error(errorMsg);
    });
  };

  return {
    speciesList: speciesList,
    getSpeciesList: getSpeciesList,
  };
}

angular
  .module('refineryIGV')
  .factory('IGVFactory', [
    '$http',
    '$window',
    '$log',
    IGVFactory
  ]
);
