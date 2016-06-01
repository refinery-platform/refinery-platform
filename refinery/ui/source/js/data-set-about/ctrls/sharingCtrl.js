'use strict';

function AboutSharingCtrl (
  dataSetAboutFactory,
  $scope,
  $location,
  $window,
  $q
  ) {
  var vm = this;
  vm.dataSet = {};

  vm.refreshDataSetStats = function () {
    var dataSetUuid = $window.dataSetUuid;

    var promise = $q.defer();
    dataSetAboutFactory.getDataSet(dataSetUuid).then(function () {
      vm.dataSet = dataSetAboutFactory.dataSet;
      promise.resolve();
    });
    return promise.promise;
  };

  vm.refreshDataSetStats();
}


angular
  .module('refineryDataSetAbout')
  .controller('AboutSharingCtrl',
  [
    'dataSetAboutFactory',
    '$scope',
    '$location',
    '$window',
    '$q',
    AboutSharingCtrl
  ]);

