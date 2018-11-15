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

  DataSetChartCtrl.$inject = ['$scope', 'chartDataService'];

  function DataSetChartCtrl (
    $scope,
    chartDataService
  ) {
    var vm = this;
    vm.selectedAttribute = { select: null };
    vm.attributes = [];
    vm.updateAttribute = updateAttribute;

    function refreshDataSetChart () {
      chartDataService.getDataSets().then(function (response) {
        var countsArray = [];
        var fieldsArray = [];
        for (var i = 0; i < response.attributes.length; i++) {
          if (response.attributes[i].display_name) {
            vm.attributes.push({
              name: response.attributes[i].display_name,
              solr_name: response.attributes[i].internal_name,
            });
          }
        }
        console.log(vm.attributes);
        var fields = response.facet_field_counts.filetype_Characteristics_generic_s;
        // To Do att setting numbers for 5
        var maxLength = fields.length > 5 ? 5 : fields.length;
        for (var j = 0; j < maxLength; j++) {
          countsArray.push(fields[j].count);
          fieldsArray.push(fields[j].name.split(' '));
        }
        $scope.homeChart.data.datasets[0].data = countsArray;
        $scope.homeChart.data.labels = fieldsArray;
        $scope.homeChart.options.title.text = 'File types';
        $scope.homeChart.update();
      });
    }

    function updateAttribute (attribute) {
      console.log(attribute);
    }

    refreshDataSetChart();
  }
})();
