angular.module("refinerySharing", [])

.controller("refinerySharingController", function ($scope, $http, $modal) {
    var userId = document.getElementById('user-id').innerText;

    /*
    // psuedo-global because modal data passing
    var dataSetEntries = [];
    var projectEntries = [];
    var workflowEntries = [];

    function getResourceIds() {
        var datasetIds = $('.dataset-uuid-entry').map(function (i, obj) {
            return obj.innerText;
        });
        var projectIds = $('.project-uuid-entry').map(function (i, obj) {
            return obj.innerText;
        });
        var workflowIds = $('.workflow-uuid-entry').map(function (i, obj) {
            return obj.innerText;
        });
        return {
            dataset: datasetIds,
            project: projectIds,
            workflow: workflowIds
        };
    }

    function updateEntries() {
        dataSetEntries = [];
        projectEntries = [];
        workflowEntries = [];
        
        var resourceIdMap = getResourceIds();
        var dataSetIds = resourceIdMap.dataset;
        var projectIds = resourceIdMap.project;
        var workflowIds = resourceIdMap.workflow;

        // datasets
        for (var di = 0; di < dataSetIds.length; di++) {
            dataSetEntries.push([]);
            callToAPI('dataset_sharing', userId, dataSetIds[di], dataSetEntries, di);
        }

        // projects
        for (var pi = 0; pi < projectIds.length; pi++) {
            projectEntries.push([]);
            callToAPI('project_sharing', userId, projectIds[pi], projectEntries, pi);
        }

        // workflows
        for (var wi = 0; wi < workflowIds.length; wi++) {
            workflowEntries.push([]);
            callToAPI('workflow_sharing', userId, workflowIds[wi], workflowEntries, wi);
        }
    }

    function callToAPI(apiName, userId, uuid, entrySet, index) {
        $http.get('api/v1/' + apiName + '/?owner-id=' + userId + '&uuid=' + uuid + '&format=json').success(function (response) {
            entrySet[index] = response.objects[0].shares;
        });
    }

    updateEntries();

    console.log("entries test");
    console.log(dataSetEntries);
    console.log(projectEntries);
    console.log(workflowEntries);
*/
    function loadResource(api, uuid) {
        $http.get('api/v1/' + api + '/?owner-id=' + userId + '&uuid=' + uuid + '&format=json').success(function (response) {
            var shareList = response.objects[0].shares;
            var pTable = document.getElementById('permission-table');
            // var pTable = $('.modal-body #permission-table');
            for (var i = 0; i < shareList.length; i++) {
                var row = pTable.insertRow(-1);
                var group = row.insertCell(0);
                group.innerHTML = shareList[i].name;

                var read = row.insertCell(1);
                var readPerm = (shareList[i].permissions.read)? 'checked' : '';
                read.innerHTML = '<input type="checkbox" ' + readPerm + '/>';
                
                var change = row.insertCell(2);
                var changePerm = (shareList[i].permissions.change)? 'checked' : '';
                change.innerHTML = '<input type="checkbox" ' + changePerm + '/>';
            }
        });
    }

    function patchResource(api, uuid, newShares) {

    }

    $scope.openPermissionEditor = function (api, uuid) {
        loadResource(api, uuid);
        $scope.newPermissionModalConfig = {
            title: 'Permission Editor'
        };
        var modalInstance = $modal.open({
            templateUrl: 'static/partials/sharing.tpls.html',
            controller: permissionEditorController,
            resolve: {
                config: function () {
                    return $scope.newPermissionModalConfig;
                }
            }
        });
    };

    var permissionEditorController = function($scope, $modalInstance, config) {
        $scope.config = config;
        
        $scope.save = function () {
            
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };
    };
});
/*
.directive("sharingData", function() {
    return {
        templateUrl: "/static/partials/sharing_tpls.html",
        restrict: "A"
    };
});
*/
