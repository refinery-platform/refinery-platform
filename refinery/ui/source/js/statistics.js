angular.module("refineryStatistics", [])

.controller("refineryStatisticsController", function ($scope, $http) {
  var chartMap = {};
  function plot(data, target) {
    var heightWidthRatio = 1.6;
    var widthScaleRatio = 0.8;
    var chartWidth = document.getElementById(target).offsetWidth;
    var chartHeight = chartWidth / heightWidthRatio;
    var chart = c3.generate({
      bindto: "#" + target,
      data: {
        x: "x",
        columns: [
          ["x", "public", "private", "private shared"],
          [" ", data.public, data.private, data.private_shared]
        ],
        type: "bar"
      },
      bar: {
        width: { ratio: 0.5 }
      },
      size: {
        width: chartWidth,
        height: chartHeight
      },
      axis: {
        x: { type: "category" },
        y: { tick: { format: d3.format("d") } }
      },
      legend: { show: false }
    });
    chartMap[target] = {
      chart: chart,
      data: data
    };
  }

    $http.get("/api/v1/statistics/?format=json&dataset&workflow&project").success(function (response) {
      $scope.users = response.objects[0].user;
      $scope.groups = response.objects[0].group;
      $scope.files = response.objects[0].files;
      $scope.size_on_disk = response.objects[0].size_on_disk;
      $scope.data_sets = response.objects[0].dataset.total;
      $scope.workflows = response.objects[0].workflow.total;
      $scope.projects = response.objects[0].project.total;

      var dataset = response.objects[0].dataset;
      var workflow = response.objects[0].workflow;
      var project = response.objects[0].project;

      if (!jQuery.isEmptyObject(dataset)) { plot(dataset, "dataSetChart"); }

      if (!jQuery.isEmptyObject(workflow)) { plot(workflow, "workflowChart"); }
      
      if (!jQuery.isEmptyObject(project)) { plot(project, "projectChart"); }
    });

    window.onresize = function (event) {
      for (var k in chartMap) {
        plot(chartMap[k].data, k);
      }
    };
})

.filter('bytes', function() {
	return function(bytes, precision) {
		if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) {return '-';}
		var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
			number = Math.floor(Math.log(bytes) / Math.log(1024));
		return (bytes / Math.pow(1024, Math.floor(number))).toFixed(2) +  ' ' + units[number];
	};
})

.directive("statisticsData", function () {
  return {
    templateUrl: "/static/partials/statistics.html",
    restrict: "A"
  };

});