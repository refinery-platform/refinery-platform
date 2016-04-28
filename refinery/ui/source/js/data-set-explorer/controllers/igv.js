'use strict';

function IgvCtrl (
  $scope, $http, $window, $log, $resource
) {
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

  $scope.$onRootScope('nodeSetChangedEvent', function () {
    // reset
    $scope.message = null;
    $scope.messageType = 'info';
    $scope.selectedSpecies.select = $scope.speciesList[0];

    // detect species
    $scope.detectSpecies();
  });

  $scope.detectSpecies = function () {
    $resource('/api/v1/nodeset/', {
      format: 'json'
    }).get({
      uuid: $scope.currentNodeSet.uuid
    }, function (response) {
      $scope.isLoadingSpecies = true;

      $log.info(response.objects[0].solr_query_components);
      $log.info(
        JSON
          .parse(response.objects[0].solr_query_components)
          .documentSelection
      );
      $log.info(
        JSON
          .parse(response.objects[0].solr_query_components)
          .documentSelectionBlacklistMode
      );

      $scope.igvConfig.query = response.objects[0].solr_query;
      $scope.igvConfig.node_selection = JSON.parse(
        response.objects[0].solr_query_components
      ).documentSelection;
      $scope.igvConfig.node_selection_blacklist_mode = JSON.parse(
        response.objects[0].solr_query_components
      ).documentSelectionBlacklistMode;
      $scope.igvConfig.annotation = null;  // response.objects[0].solr_query;

      $scope.retrieveSpecies();
    }, function (response) {
      $scope.isLoadingSpecies = true;
      $scope.messageType = 'error';
      $scope.message = 'Sorry! Unable to get the contents of the selected file set.';
      $log.info('Error accessing Node Set API. Attempting to read  from sessionStorage');

      if ($window.sessionStorage) {
        var currentSelectionSessionKey = $window.externalStudyUuid +
          '_' +
          $window.externalAssayUuid +
          '_' +
          'currentSelection';
        response.objects = [
          angular.fromJson(
            $window.sessionStorage.getItem(currentSelectionSessionKey)
          )
        ];
        $scope.igvConfig.query = response.objects[0].solr_query;
        $scope.igvConfig.node_selection = JSON.parse(
          response.objects[0].solr_query_components
        ).documentSelection;
        $scope.igvConfig.node_selection_blacklist_mode = JSON.parse(
          response.objects[0].solr_query_components
        ).documentSelectionBlacklistMode;
        $scope.igvConfig.annotation = null;  // response.objects[0].solr_query;
        $scope.retrieveSpecies();
      } else {
        $scope.isLoadingSpecies = false;
      }
    });
  };

  $scope.retrieveSpecies = function () {
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
        $scope.message = 'Unable to detect species and genome build. ' +
          'Please select the correct genome and launch IGV.';
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

  $scope.launchIgv = function () {
    $window.open($scope.selectedSpecies.select.url);
  };
}

angular
  .module('refineryDataSetExplorer')
  .controller('IgvCtrl', [
    '$scope',
    '$http',
    '$window',
    '$log',
    '$resource',
    IgvCtrl
  ]);
