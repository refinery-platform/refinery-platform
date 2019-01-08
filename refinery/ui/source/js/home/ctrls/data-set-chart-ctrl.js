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

  DataSetChartCtrl.$inject = ['$scope', 'chartDataService'];

  function DataSetChartCtrl (
    $scope,
    chartDataService
  ) {
    var service = chartDataService;
    var vm = this;
    vm.selectedAttribute = { select: {
      name: 'Technology', solrName: 'technology_Characteristics_generic_s'
    } };
    vm.attributes = service.attributeNames;
    vm.updateAttribute = updateAttribute;

    /**
     * @name refreshDataSetChart
     * @desc Private method to initalize the chart
     * @memberOf refineryHome.dataSetChartCtrl
    **/
    function refreshDataSetChart () {
      chartDataService.getDataSets().then(function () {
        vm.attributes = service.attributeNames;
        var field = vm.selectedAttribute.select.solrName;
        // initialized in the directive link
        vm.homeChart.data.datasets[0].data = service.attributeFields[field].countsArray;
        vm.homeChart.data.labels = service.attributeFields[field].fieldsArray;
        vm.homeChart.update();
      });
    }

    /**
     * @name updateAttribute
     * @desc Update chart based on selected attribute
     * @memberOf refineryHome.dataSetChartCtrl
    **/
    function updateAttribute (attribute) {
      vm.homeChart.data.datasets[0].data = service.attributeFields[attribute.solrName].countsArray;
      vm.homeChart.data.labels = service.attributeFields[attribute.solrName].fieldsArray;
      vm.homeChart.update();
    }

    refreshDataSetChart();
  }
})();
