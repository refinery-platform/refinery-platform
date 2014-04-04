angular.module('refineryIgv', [])

.controller('IgvController', function($scope, $rootScope, $http, $window, $log, $timeout, $resource, workflow, externalToolStatusService ) {
  'use strict';

  $scope.igvConfig = {
    query: null,
    annotation: null, 
    node_selection: [],
    node_selection_blacklist_mode: true
  };

  $scope.speciesList = [];
  $scope.speciesIndex = -1;
  $scope.message = null;
  $scope.messageType = "info";
  $scope.isLoadingSpecies = false;

  $scope.$onRootScope('nodeSetChangedEvent', function(event, currentNodeSet) {
    // reset
    $scope.message = null;
    $scope.messageType = "info";
    $scope.speciesIndex = -1;

    // detect species
    $scope.detectSpecies();
  });

  $scope.detectSpecies = function() {

    $resource("/api/v1/nodeset/", {format: "json"}).get( { 'uuid': $scope.currentNodeSet.uuid }, function(response) {
        $scope.isLoadingSpecies = true;

        $log.info( response.objects[0].solr_query_components );
        $log.info( JSON.parse( response.objects[0].solr_query_components ).documentSelection );
        $log.info( JSON.parse( response.objects[0].solr_query_components ).documentSelectionBlacklistMode );

        $scope.igvConfig.query = response.objects[0].solr_query;
        $scope.igvConfig.node_selection = JSON.parse( response.objects[0].solr_query_components ).documentSelection;
        $scope.igvConfig.node_selection_blacklist_mode = JSON.parse( response.objects[0].solr_query_components ).documentSelectionBlacklistMode;
        $scope.igvConfig.annotation = null; //response.objects[0].solr_query;

        $http({
          method: 'POST',
          url: '/solr/igv/',
          headers: {'X-Requested-With': 'XMLHttpRequest'},
          dataType: 'json',
          data: $scope.igvConfig,
        }).success(function(response) {

          // update message
          if ( response.species_count === 0 ) {
            $scope.message = "Unable to detect species and genome build. Please select the correct genome and launch IGV.";
          }
          else if ( response.species_count === 1 ) {
            $scope.message = null;
            $scope.speciesIndex = 0;
          }
          else {
            $scope.message = "Multiple species detected. Please select a genome and launch IGV. You may repeat this step multiple times.";
          }

          // update species list
          $scope.speciesList.length = 0;
          for (var key in response.species) {
              if (response.species.hasOwnProperty(key)) {
                $scope.speciesList.push( { name: key, url: response.species[key] });
            }
          }

          $scope.isLoadingSpecies = false;

        }).error(function(response, status) {
          $scope.isLoadingSpecies = false;
          $scope.messageType = "error";
          $scope.message = "Sorry! Unable to configure IGV for the selected file set.";
          $log.error("Error creating IGV session URLs. (error status " + status + ")");
        });

      }, function(response){
          $scope.isLoadingSpecies = false;
          $scope.messageType = "error";
          $scope.message = "Sorry! Unable to get the contents of the selected file set.";
          $log.error( "Error accessing Node Set API." );
      });
  };

  $scope.launchIgv = function() {
    $window.open($scope.speciesList[$scope.speciesIndex].url);
  };
});
