'use strict';

function IGVCtrl (
  $scope,
  $http,
  $window,
  $log,
  $resource,
  $httpParamSerializer,
  selectedNodesService
) {
  var vm = this;

  $scope.igvConfig = {
    query: null,
    annotation: null,
    node_selection: [],
    node_selection_blacklist_mode: true
  };

  $scope.speciesList = [];
  $scope.selectedSpecies = { select: $scope.speciesList[0] };
  $scope.message = null;
  $scope.messageType = 'info';
  $scope.isLoadingSpecies = false;

  vm.areSelectedNodesEmpty = function () {
    if (selectedNodesService.selectedNodesUuids.length > 0 ||
      selectedNodesService.complementSelectedNodesUuids.length > 0) {
      return false;
    }
    return true;
  };

  $scope.retrieveSpecies = function () {
    if (selectedNodesService.selectedAllFlag) {
      $scope.igvConfig.node_selection = selectedNodesService.complementSelectedNodesUuids;
      $scope.igvConfig.node_selection_blacklist_mode = true;
    } else {
      $scope.igvConfig.node_selection = ['1a354bf5-3b6e-4fcf-b9fb-b603d7433119'];
      $scope.igvConfig.node_selection_blacklist_mode = false;
      $scope.igvConfig.assay_uuid = $window.externalAssayUuid;
    }

    $http({
      method: 'POST',
      url: '/solr/igv/',
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      },
      dataType: 'json',
      data: $scope.igvConfig
    }).success(function (response) {
      // update message
      if (response.species_count === 0) {
        $scope.message = 'Please select the correct genome and launch IGV.';
      } else if (response.species_count === 1) {
        $scope.message = null;
        $scope.selectedSpecies.select = $scope.speciesList[0];
      } else {
        $scope.message = 'Multiple species detected. Please select a ' +
          'genome and launch IGV. You may repeat this step multiple times.';
      }

      // update species list
      $scope.speciesList.length = 0;
      for (var key in response.species) {
        if (response.species.hasOwnProperty(key)) {
          $scope.speciesList.push({
            name: key,
            url: response.species[key]
          });
        }
      }
      $scope.isLoadingSpecies = false;
    }).error(function (response, status) {
      $scope.isLoadingSpecies = false;
      $scope.messageType = 'error';
      $scope.message = 'Sorry! Unable to configure IGV for the selected file set.';
      $log.error('Error creating IGV session URLs. (error status ' + status + ')');
    });
  };

  $scope.launchIgvJs = function () {
    var params = $httpParamSerializer({
      species: $scope.selectedSpecies.select.name,
      node_ids: $scope.igvConfig.node_selection
    });
    $window.open('/visualize/genome?' + params);
  };

  $scope.retrieveSpecies();
  console.log('in the igv ctrl');
}

angular
  .module('refineryIGV')
  .controller('IGVCtrl', [
    '$scope',
    '$http',
    '$window',
    '$log',
    '$resource',
    '$httpParamSerializer',
    'selectedNodesService',
    IGVCtrl
  ]);
