/* App Module */

angular.module('refineryApp', [
  'ui.select2',
  'ngResource',
//  'refineryControllers',
])

/* Controllers */

//var refineryControllers = angular.module('refineryControllers', []);

.factory('Workflows', function() {
  'use strict';
  return [
      {"id": 1, "name": "Workflow 1"},
      {"id": 2, "name": "Workflow 2"},
  ];
})

.controller('WorkflowListCtrl', function($scope, Workflows) {
  'use strict';
  $scope.workflows = Workflows;
})

//var service = angular.module("apiService", ["ngResource"]);

.factory("Workflow", function($resource) {
  'use strict';
  return $resource(
    "/api/v1/workflow/:Id/",
    {Id: "@Id", format: "json"}
  );
})

.controller('WorkflowListApiCtrl', function($scope, Workflow) {
  'use strict';
  var WorkflowList = Workflow.get(function() {
    $scope.workflows = WorkflowList.objects;
  });
});
