angular.module("refinerySharing", [])

.controller("refinerySharingController", function ($scope, $http, $modal) {
    var userId = document.getElementById('user-id').innerText;

    function loadResource(api, uuid) {
        $http.get('api/v1/' + api + '/?owner-id=' + userId + '&uuid=' + uuid + '&format=json').success(function (response) {
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
                
                var permissions = row.insertCell(1);
                var noPerm = !(readPerm || changePerm)? 'checked' : '';
                var readOnly = (readPerm && !changePerm)? 'checked' : '';
                var changeAllowed = (changePerm)? 'checked': '';
                
                var noPermHTML = '<td><input type="radio" name="' + i + '"' + noPerm + '></td>';
                var readOnlyHTML = '<td><input type="radio" name="' + i + '"' + readOnly + '></td>';
                var changeAllowedHTML = '<td><input type="radio" name="' + i + '"' + changeAllowed + '></td>';

                permissions.innerHTML = '<tr>' + noPermHTML + readOnlyHTML + changeAllowedHTML + '</tr>';

                // permissions.innerHTML = '<form><input type="radio" ' + noPerm + '>No Permission <input type="radio" ' + readOnly + '>Read Only </form>';

                /* 
                var read = row.insertCell(1);
                var readPerm = (shareList[i].permissions.read)? 'checked' : '';
                read.innerHTML = '<input type="checkbox" id=' + '"' + group.innerText +'-read" ' + readPerm + '/>';
                
                var change = row.insertCell(2);
                var changePerm = (shareList[i].permissions.change)? 'checked' : '';
                change.innerHTML = '<input type="checkbox" id=' + '"' + group.innerText + '-change" ' + changePerm + '/>';
                */
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
            // Data is clustered into sets of 2 -- i is name, i+1 the permission stuff.
            for (var i = 0; i < cells.length; i += 2) {
                // Add the group.
                var name = cells[i].innerText;
                var id = cells[i].children[0].innerText;
                data += '{"name": "' + name + '", "id": ' + id + ', "permission": ';

                // Add permissions -- 0 is none, 1 is readonly, 2 is edit.
                cellButtons = cells[i+1].children;
                var read = cellButtons[1].checked || cellButtons[2].checked;
                var change = cellButtons[2].checked;
                
                data += '{"read": ' + read + ', "change": ' + change + '}}';
                if (i + 2 < cells.length) {
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

