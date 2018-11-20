/**
 * Data Set Chart Ctrl
 * @namespace DataSetChartCtrl
 * @desc Directive controller for the data set chart on homepage.
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
        // initialized in the directive link
        vm.homeChart.data.datasets[0].data = service.attributes[field].countsArray;
        vm.homeChart.data.labels = service.attributes[field].fieldsArray;
        vm.homeChart.update();
      });
    }

    function updateAttribute (attribute) {
      vm.homeChart.data.datasets[0].data = service.attributes[attribute.solr_name].countsArray;
      vm.homeChart.data.labels = service.attributes[attribute.solr_name].fieldsArray;
      vm.homeChart.update();
    }

    refreshDataSetChart();
  }
})();
