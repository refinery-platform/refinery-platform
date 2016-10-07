'use strict';

function IgvCtrl (
  $scope,
  $http,
  $window,
  $log,
  $resource,
  $httpParamSerializer,
  assayFileService
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
      // Grab facets for filtering nodes
      $scope.facetSelection = JSON.parse(response.objects[0].solr_query_components).facetSelection;
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

  // Helper method to correctly set node selection for igv web launch
  var setNodeSelectionWithBlackList = function () {
   // params needed to grab assay files
    var params = {
      uuid: $window.externalAssayUuid,
      include_facet_count: false,
      attributes: 'uuid',
      facets: 'uuid'
    };
    params.filter_attribute = {};
    // grab filter facets fields
    angular.forEach($scope.facetSelection, function (fieldsObj, attributeName) {
      var fieldArr = [];
      angular.forEach(fieldsObj, function (valueObj, fieldName) {
        if (valueObj.isSelected) {
          // encode field name
          fieldArr.push($window.encodeURIComponent(fieldName));
        }
      });
      if (fieldArr.length > 0) {
        params.filter_attribute[attributeName] = fieldArr;
        params.facets = params.facets.concat(',', attributeName);
        params.attributes = params.attributes.concat(',', attributeName);
      }
    });
    // grab all filtered assay files uuid
    var assayFiles = assayFileService.query(params);
    assayFiles.$promise.then(function (nodeList) {
      var selectedNodes = [];
      var complementNodes = $scope.igvConfig.node_selection;
      // if not a complement node, add to selected nodes list
      angular.forEach(nodeList.nodes, function (uuidObj) {
        if (complementNodes.indexOf(uuidObj.uuid) === -1) {
          selectedNodes.push(uuidObj.uuid);
        }
      });
      // update node_selection with selected nodes
      angular.copy(selectedNodes, $scope.igvConfig.node_selection);
    }, function (error) {
      $log.error('Error generating complement nodes, ' + error);
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

      /* Temp code to accomodate web-based igv when in blacklist mode
       Need to subtract complement nodes from full filtered list nodes */
      if ($scope.igvConfig.node_selection_blacklist_mode) {
        setNodeSelectionWithBlackList();
      }

      $scope.isLoadingSpecies = false;
    }).error(function (response, status) {
      $scope.isLoadingSpecies = false;
      $scope.messageType = 'error';
      $scope.message = 'Sorry! Unable to configure IGV for the selected file set.';
      $log.error('Error creating IGV session URLs. (error status ' + status + ')');
    });
  };

  $scope.launchIgvJava = function () {
    $window.open($scope.selectedSpecies.select.url);
  };

  $scope.launchIgvJs = function () {
    var params = $httpParamSerializer({
      species: $scope.selectedSpecies.select.name,
      node_ids: $scope.igvConfig.node_selection
    });
    $window.open('/visualize/genome?' + params);
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
    '$httpParamSerializer',
    'assayFileService',
    IgvCtrl
  ]);
