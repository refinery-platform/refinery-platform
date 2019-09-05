/**
 * Select All Button Ctrl
 * @namespace Select All Button Ctrl
 * @desc Main controller for the select all button.
 * @memberOf refineryApp.refineryFileBrowser
 */
(function () {
  'use strict';
  angular
    .module('refineryFileBrowser')
    .controller('SelectAllButtonCtrl', SelectAllButtonCtrl);

  SelectAllButtonCtrl.$inject = [
    '$',
    '_',
    '$scope',
    '$window',
    'activeNodeService',
    'assayFileService',
    'assayFiltersService',
    'dataSetPropsService',
    'fileBrowserFactory',
    'fileParamService',
    'fileRelationshipService',
    'toolSelectService'
  ];

  function SelectAllButtonCtrl (
    $,
    _,
    $scope,
    $window,
    activeNodeService,
    assayFileService,
    assayFiltersService,
    dataSetPropsService,
    fileBrowserFactory,
    fileParamService,
    fileRelationshipService,
    toolSelectService
  ) {
    var inputTypeUuid = toolSelectService.selectedTool.file_relationship.input_files[0].uuid;
    var totalFileCount = dataSetPropsService.dataSet.file_count;
    var vm = this;
    vm.isAllSelected = true; // Toggle text on select all
    vm.hexInputColor = fileRelationshipService.inputFileTypeColor[inputTypeUuid];
    vm.nodeSelectCount = 0; // initializes number displaying nodes selected count
    vm.updatingSelectionStatus = false; // display wait message during api wait
    vm.updateSelection = updateSelection;

    /**
     * @name getCurrentParams
     * @desc  Helper private method which generates the latest params
     * @memberOf refineryFileBrowser.getCurrentParams
    **/
    function getCurrentParams () {
      var params = {  // add filters to facets
        data_set_uuid: $window.dataSetUuid,
        uuid: $window.externalAssayUuid,
        include_facet_count: false
      };
      params.filter_attribute = fileParamService.fileParam.filter_attribute;
      // grabbing a subset of attributes
      var attributeNames = Object.keys(params.filter_attribute).concat([
        'uuid', fileBrowserFactory.attributesNameKey.Name
      ]);
      params.facets = attributeNames.join(',');
      return params;
    }

    /**
     * @name updateSelection
     * @desc  View method which updates the node selections for single input
     * list workflows.
     * @memberOf refineryFileBrowser.updateSelection
    **/
    function updateSelection () {
      var assayFiles = fileBrowserFactory.assayFiles;
      if (!vm.isAllSelected) {
        vm.isAllSelected = true;
        vm.updatingSelectionStatus = true;

        var assayFilesQuery = assayFileService.query(getCurrentParams());
        assayFilesQuery.$promise.then(function (response) {
          if (!_.has(activeNodeService.selectionObj, '0.' + inputTypeUuid)) {
            activeNodeService.selectionObj = angular.copy({ 0: {} });
            activeNodeService.selectionObj[0][inputTypeUuid] = {};
          }
          for (var i = 0; i < response.nodes.length; i++) {
            if (!_.has(activeNodeService.selectionObj[0][inputTypeUuid],
              response.nodes[i].uuid) || !activeNodeService.selectionObj[0][inputTypeUuid]
              [response.nodes[i].uuid]) {
              angular.copy(response.nodes[i], activeNodeService.activeNodeRow);
              activeNodeService.selectionObj[0][inputTypeUuid][response.nodes[i].uuid] = true;
              fileRelationshipService.setNodeSelectCollection(
                inputTypeUuid, activeNodeService.selectionObj
              );
              fileRelationshipService.setGroupCollection(
                inputTypeUuid, activeNodeService.selectionObj
              );
            }
          }
          // reset selected node in UI
          angular.copy({}, activeNodeService.activeNodeRow);
          vm.updatingSelectionStatus = false;
        });
      } else if (vm.nodeSelectCount === totalFileCount === assayFiles) {
        vm.isAllSelected = false;
        fileRelationshipService.resetInputGroup();
      } else {
        // remove selection on the currect view
        vm.isAllSelected = false;
        var selectionGroup = activeNodeService.selectionObj[0][inputTypeUuid];
        for (var i = 0; i < assayFiles.length; i++) {
          if (selectionGroup[assayFiles[i].uuid] || selectionGroup[assayFiles[i].uuid]) {
            angular.copy(assayFiles[i], activeNodeService.activeNodeRow);
            selectionGroup[assayFiles[i].uuid] = false;
            fileRelationshipService.setNodeSelectCollection(
              inputTypeUuid, activeNodeService.selectionObj, assayFiles[i].uuid
            );
            fileRelationshipService.setGroupCollection(
              inputTypeUuid, activeNodeService.selectionObj, assayFiles[i].uuid
            );
          }
        }
      }
    }

    vm.$onInit = function () {
      // resets selection when filters are updated
      $scope.$watchCollection(function () {
        return assayFiltersService.attributeFilter;
      }, function () {
        vm.isAllSelected = vm.nodeSelectCount === totalFileCount;
      });

      $scope.$watchCollection(function () {
        return assayFiltersService.analysisFilter;
      }, function () {
        vm.isAllSelected = vm.nodeSelectCount === totalFileCount;
      });
      // update selection count when user selects through table or tool panel
      $scope.$watch(function () {
        return fileRelationshipService.nodeSelectCount;
      }, function (selectCount) {
        vm.nodeSelectCount = selectCount;
        // button will display state when all data set nodes are selected
        vm.isAllSelected = selectCount === totalFileCount;
      });
    };
  }
})();
