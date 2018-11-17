/**
 * Data Set Chart Ctrl
 * @namespace DataSetChartCtrl
 * @desc Main controller for the main view.
 * @memberOf refineryApp.refineryHome
 */
(function () {
  'use strict';

  angular
    .module('refineryHome')
    .controller('DataSetChartCtrl', DataSetChartCtrl);

  DataSetChartCtrl.$inject = ['$location', '$scope', '$window', 'chartDataService'];

  function DataSetChartCtrl (
    $location,
    $scope,
    $window,
    chartDataService
  ) {
    var service = chartDataService;
    var vm = this;
    vm.selectedAttribute = { select: {
      name: 'Filetype', solr_name: 'filetype_Characteristics_generic_s'
    } };
    vm.attributes = service.attributeNames;
    vm.updateAttribute = updateAttribute;

    function refreshDataSetChart () {
      chartDataService.getDataSets().then(function () {
        vm.attributes = service.attributeNames;
        var field = 'filetype_Characteristics_generic_s';
        $scope.homeChart.data.datasets[0].data = service.attributes[field].countsArray;
        $scope.homeChart.data.labels = service.attributes[field].fieldsArray;
        $scope.homeChart.update();
      });
    }

    function updateAttribute (attribute) {
      $scope.homeChart.data.datasets[0].data = service.attributes[attribute.solr_name].countsArray;
      $scope.homeChart.data.labels = service.attributes[attribute.solr_name].fieldsArray;
      $scope.homeChart.update();
    }

    refreshDataSetChart();
  }
})();
