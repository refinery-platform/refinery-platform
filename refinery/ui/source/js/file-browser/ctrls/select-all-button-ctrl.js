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
    'fileBrowserSettings',
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
    fileBrowserSettings,
    fileParamService,
    fileRelationshipService,
    toolSelectService
  ) {
    var inputTypeUuid = toolSelectService.selectedTool.file_relationship.input_files[0].uuid;
    var maxFileCount = fileBrowserSettings.maxFileRequest;
    var totalFileCount = dataSetPropsService.dataSet.file_count;
    var vm = this;
    vm.hexInputColor = fileRelationshipService.inputFileTypeColor[inputTypeUuid];
    vm.isAllSelected = false; // Toggle text on select all
    vm.nodeSelectCount = 0; // initializes number displaying nodes selected count
    vm.updateSelection = updateSelection;
    vm.updatingSelectionStatus = false; // display wait message during api wait

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
     * @name getSelectionGroup
     * @desc  Helper private method which gets the selection group
     * @memberOf refineryFileBrowser.getSelectionGroup
    **/
    function getSelectionGroup () {
      // initialize selection group if needed
      if (!_.has(activeNodeService.selectionObj, '0.' + inputTypeUuid)) {
        activeNodeService.selectionObj = angular.copy({ 0: {} });
        activeNodeService.selectionObj[0][inputTypeUuid] = {};
      }
      return activeNodeService.selectionObj[0][inputTypeUuid];
    }

    /**
     * @name setNodeAndGroupSelection
     * @desc  Helper private method which updates the nodeSelectionGroup and
     * groupCollections used in tool launch panel and grid
     * @memberOf refineryFileBrowser.getSelectionGroup
    **/
    function setNodeAndGroupSelection (files, selectionGroup, deselectFlag) {
      for (var i = 0; i < files.length; i++) {
        var fileUuid = files[i].uuid;
        if (!deselectFlag && !_.has(selectionGroup, fileUuid) || !selectionGroup[fileUuid]) {
          angular.copy(files[i], activeNodeService.activeNodeRow);
          selectionGroup[fileUuid] = true;
          fileRelationshipService.setNodeSelectCollection(
            inputTypeUuid, activeNodeService.selectionObj
          );
          fileRelationshipService.setGroupCollection(
            inputTypeUuid, activeNodeService.selectionObj
          );
        } else if (deselectFlag && (!_.has(selectionGroup, fileUuid) && selectionGroup[fileUuid])) {
          angular.copy(files[i], activeNodeService.activeNodeRow);
          selectionGroup[fileUuid] = false;
          fileRelationshipService.setNodeSelectCollection(
            inputTypeUuid, activeNodeService.selectionObj, fileUuid
          );
          fileRelationshipService.setGroupCollection(
            inputTypeUuid, activeNodeService.selectionObj, fileUuid
          );
        }
      }
    }

    /**
     * @name updateSelection
     * @desc  View method which updates the node selections for single input
     * list workflows.
     * @memberOf refineryFileBrowser.updateSelection
    **/
    function updateSelection () {
      var assayFiles = fileBrowserFactory.assayFiles;
      var totalAssayCount = fileBrowserFactory.assayFilesTotalItems.count;
      var selectionGroup = getSelectionGroup();

      // current assay files is larger than 100 need to use API for full list
      if (totalAssayCount > maxFileCount) {
        vm.updatingSelectionStatus = true;
        var deselectFlag = vm.isAllSelected;
        var assayFilesQuery = assayFileService.query(getCurrentParams());
        assayFilesQuery.$promise.then(function (response) {
          setNodeAndGroupSelection(response.nodes, selectionGroup, deselectFlag);
          vm.updatingSelectionStatus = false;
          // reset selected node in UI
          angular.copy({}, activeNodeService.activeNodeRow);
        });
      } else if (vm.nodeSelectCount === totalFileCount && totalFileCount === totalAssayCount) {
        fileRelationshipService.resetInputGroup();
      } else {
        setNodeAndGroupSelection(assayFiles, selectionGroup, vm.isAllSelected);
        angular.copy({}, activeNodeService.activeNodeRow);
      }

      vm.isAllSelected = !vm.isAllSelected; // toggle selection button
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
