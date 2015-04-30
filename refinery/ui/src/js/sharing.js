angular.module("refinerySharing", [])

.controller("refinerySharingController", function ($scope, $http, $modal) {
    var userId = document.getElementById('user-id').innerText;

    function loadResource(api, uuid) {
        $http.get('api/v1/' + api + '/?owner-id=' + userId + '&uuid=' + uuid + '&format=json').success(function (response) {
            var shareList = response.objects[0].shares;
            var pTable = document.getElementById('permission-table');
            // var pTable = $('.modal-body #permission-table');
            for (var i = 0; i < shareList.length; i++) {
                var row = pTable.insertRow(-1);
                var group = row.insertCell(0);
                group.innerHTML = shareList[i].name + '<div style="display: none;">' + shareList[i].id+ '</div>';
                
                var read = row.insertCell(1);
                var readPerm = (shareList[i].permissions.read)? 'checked' : '';
                read.innerHTML = '<input type="checkbox" id=' + '"' + group.innerText +'-read" ' + readPerm + '/>';
                
                var change = row.insertCell(2);
                var changePerm = (shareList[i].permissions.change)? 'checked' : '';
                change.innerHTML = '<input type="checkbox" id=' + '"' + group.innerText + '-change" ' + changePerm + '/>';
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
            // Data is clustered into sets of 3 -- i is name, i+1 read, i+2 change
            for (var i = 0; i < cells.length; i += 3) {
                // Add the group
                var name = cells[i].innerText;
                var id = cells[i].children[0].innerText;
                data += '{"name": "' + name + '", "id": ' + id + ', "permission": ';

                // add permissions
                var read = document.getElementById(name + '-read').checked;
                var change = document.getElementById(name + '-change').checked;
                data += '{"read": ' + read + ', "change": ' + change;

                data += '}}';
                if (i + 3 < cells.length) {
                    data += ', ';
                }
            }
            data += ']}';
            console.log(data);
            $http({method: 'PATCH', url: 'api/v1/' + config.api + '/' + config.uuid + '/', data: data});
            $modalInstance.dismiss('saved');
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };
    };
});

