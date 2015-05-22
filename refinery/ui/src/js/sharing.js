angular.module("refinerySharing", [])

.controller("refinerySharingController", function ($scope, $http, $modal) {
    // Login check.
    if (!user_id) {
        // Hide project edit buttons if user is not logged in.
        var pTable = document.getElementById('project-table');
        var cells = pTable.getElementsByTagName('td');
        // 3 cells per row. If user is not logged in, cannot edit sharing permissions.
        for (var i = 0; i < cells.length; i += 3) {
            cells[i+2].innerHTML = 'N/A';
        }
    }

    // Ownership check. Assume icon-group presence indicates non-ownership.
    // Data sets
    var datasetTable = document.getElementById('dataset-table');
    if (datasetTable) {
        var datasetCells = datasetTable.getElementsByTagName('td');
        for (var di = 0; di < datasetCells.length; di += 3) {
            if (datasetCells[di].children[0].className === 'icon-group') {
                datasetCells[di+2].innerHTML = 'N/A';
           }
       }
    }

    // Projects
    var projectTable = document.getElementById('project-table');
    if (projectTable) {
        var projectCells = projectTable.getElementsByTagName('td');
        for (var pi = 0; pi < projectCells.length; pi += 3) {
            if (projectCells[pi].children[0].className === 'icon-group') {
                projectCells[pi+2].innerHTML = 'N/A';
            }
       }
    }

    function loadResource(api, uuid) {
        $http.get('api/v1/' + api + '/?owner-id=' + user_id + '&uuid=' + uuid + '&format=json').success(function (response) {
            var shareList = response.objects[0].shares;
            var pTable = document.getElementById('permission-table');
            for (var i = 0; i < shareList.length; i++) {
                var readPerm = shareList[i].permissions.read;
                var changePerm = shareList[i].permissions.change;
                // Change implies read permission.
                if (changePerm) {
                    readPerm = true;
                }
                
                var row = pTable.insertRow(-1);
                var group = row.insertCell(0);
                group.innerHTML = shareList[i].name + '<div style="display: none;">' + shareList[i].id+ '</div>';
                
                var noPermDOM = row.insertCell(1);
                var readOnlyDOM = row.insertCell(2);
                var editDOM = row.insertCell(3);

                var isNoPerm = !(readPerm || changePerm)? 'checked' : '';
                var isReadOnly = (readPerm && !changePerm)? 'checked' : '';
                var isChangeAllowed = (changePerm)? 'checked': '';
                
                var noPermHTML = '<td><input type="radio" name="' + i + '" ' + isNoPerm + '></td>';
                var readOnlyHTML = '<td><input type="radio" name="' + i + '" ' + isReadOnly + '></td>';
                var changeAllowedHTML = '<td><input type="radio" name="' + i + '" ' + isChangeAllowed + '></td>';

                noPermDOM.innerHTML = noPermHTML;
                readOnlyDOM.innerHTML = readOnlyHTML;
                editDOM.innerHTML = changeAllowedHTML;
            }
        });
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
                    return {
                        api: api,
                        uuid: uuid
                    };
                }
            }
        });
    };

    var permissionEditorController = function($scope, $http, $modalInstance, config) {
        $scope.config = config;
        
        $scope.save = function () {
            var pTable = document.getElementById('permission-table');
            var cells = pTable.getElementsByTagName('td');
            var data = '{"shares": [';
            // Data is clustered into sets of 4 -- i is name, i+1 is noperm, i+2 is readonly, i+3 is edit.
            for (var i = 0; i < cells.length; i += 4) {
                // Add the group.
                var name = cells[i].innerText;
                var id = cells[i].children[0].innerText;
                data += '{"name": "' + name + '", "id": ' + id + ', "permission": ';

                var read = cells[i+2].children[0].checked || cells[i+3].children[0].checked;
                var change = cells[i+3].children[0].checked;
                // var read = cellButtons[2].checked || cellButtons[3].checked;
                // var change = cellButtons[3].checked;
                
                data += '{"read": ' + read + ', "change": ' + change + '}}';
                if (i+5 < cells.length) {
                    data += ', ';
                }
            }
            data += ']}';
            $http({method: 'PATCH', url: 'api/v1/' + config.api + '/' + config.uuid + '/', data: data});
            $modalInstance.dismiss('saved');
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };
    };
});

