angular.module("refinerySharing", [])

.controller("refinerySharingController", function ($scope, $http, $modal) {
  // Login check.
  if (user_id) {
    $(document).ready(function () {
      updateTableShareDisplay('dataset-table');
      updateTableShareDisplay('project-table');
    });
  }

  function updateTableShareDisplay(id) {
    var table = document.getElementById(id);
    if (table) {
      cells = table.getElementsByTagName('td');
      for (var i = 0; i < cells.length; i += 3) {
        cells[i+2].children[0].style.display = 'inline';
        // Not icon-user means that the user is not the owner.
        if (cells[i].children[0].className !== 'icon-user') {
          cells[i+2].children[0].innerText = 'N/A';
        }
      }
    }
  }

  function loadResource(api, uuid) {
    $http.get('api/v1/' + api + '/?uuid=' + uuid + '&format=json').success(function (response) {
      // Update the username and resource name thing in the modal description.
      document.getElementById('modal-description').innerText = response.objects[0].owner + ' | ' + response.objects[0].res_name;

      var shareList = response.objects;
      var pTable = document.getElementById('permission-table');
      for (var i = 0; i < shareList.length; i++) {
        var canRead = shareList[i].permissions.read;
        var canChange = shareList[i].permissions.change;
        // Change implies read permission.
        if (canChange) canRead = true;
        
        var row = pTable.insertRow(-1);
        var group = row.insertCell(0);
        group.innerHTML = shareList[i].group_name + '<div style="display: none;">' + shareList[i].group_id+ '</div>';
        
        var noPermCell = row.insertCell(1);
        var readOnlyCell = row.insertCell(2);
        var editCell = row.insertCell(3);

        var isNoPerm = !(canRead || canChange)? 'checked' : '';
        var isReadOnly = (canRead && !canChange)? 'checked' : '';
        var isChangeAllowed = (canChange)? 'checked': '';
        
        var noPermHTML = '<td><input type="radio" name="' + i + '" ' + isNoPerm + '></td>';
        var readOnlyHTML = '<td><input type="radio" name="' + i + '" ' + isReadOnly + '></td>';
        var changeAllowedHTML = '<td><input type="radio" name="' + i + '" ' + isChangeAllowed + '></td>';

        noPermCell.innerHTML = noPermHTML;
        readOnlyCell.innerHTML = readOnlyHTML;
        editCell.innerHTML = changeAllowedHTML;
      }
    });
  }

  var permissionEditorController = function($scope, $http, $modalInstance, config) {
    loadResource(config.api, config.uuid);
    $scope.config = config;
    
    $scope.save = function () {
      var pTable = document.getElementById('permission-table');
      var cells = pTable.getElementsByTagName('td');
      // Data is clustered into sets of 4 -- i is name, i+1 is noperm, i+2 is readonly, i+3 is edit.
      for (var i = 0; i < cells.length; i += 4) {
        // Add the group.
        var name = cells[i].innerText;
        var id = cells[i].children[0].innerText;

        var canRead = cells[i+2].children[0].checked || cells[i+3].children[0].checked;
        var canChange = cells[i+3].children[0].checked;
        
        var data = '{"read": ' + canRead + ', "change": ' + canChange + '}';

        // need to somehow store the group id in the cells as a hidden thing
        $http({method: 'PATCH', url: 'api/v1/' + config.api + '/' + config.uuid + '_' + id + '/', data: data});
      }
      $modalInstance.dismiss('saved');
    };

    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
  };

  $scope.openPermissionEditor = function (api, uuid) {
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
});

