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
    vm.isAllSelected = false; // Toggle text on select all
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

    function getSelectionGroup () {
      if (!_.has(activeNodeService.selectionObj, '0.' + inputTypeUuid)) {
        activeNodeService.selectionObj = angular.copy({ 0: {} });
        activeNodeService.selectionObj[0][inputTypeUuid] = {};
      }
      return activeNodeService.selectionObj[0][inputTypeUuid];
    }

    function setNodeAndGroupSelection (files, selectionGroup, deselectFlag) {
      for (var i = 0; i < files.length; i++) {
        var fileUuid = files[i].uuid;
        console.log(deselectFlag);
        console.log(selectionGroup);
        if (!deselectFlag && !_.has(selectionGroup, fileUuid) || !selectionGroup[fileUuid]) {
          angular.copy(files[i], activeNodeService.activeNodeRow);
          selectionGroup[fileUuid] = true;
          fileRelationshipService.setNodeSelectCollection(
            inputTypeUuid, activeNodeService.selectionObj
          );
          fileRelationshipService.setGroupCollection(
            inputTypeUuid, activeNodeService.selectionObj
          );
        } else if (deselectFlag && selectionGroup[fileUuid]) {
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

      if (!vm.isAllSelected) {
        vm.isAllSelected = true;
        vm.updatingSelectionStatus = true;
        // if current assay files list is > set continious scroll list ?100
        // then call API
        if (totalAssayCount > maxFileCount) {
          var assayFilesQuery = assayFileService.query(getCurrentParams());
          assayFilesQuery.$promise.then(function (response) {
            setNodeAndGroupSelection(response.nodes, selectionGroup, false);
          });
        } else {
          setNodeAndGroupSelection(assayFiles, selectionGroup, false);
        }
        // reset selected node in UI
        angular.copy({}, activeNodeService.activeNodeRow);
        vm.updatingSelectionStatus = false;
      } else if (vm.nodeSelectCount === totalFileCount && totalFileCount === totalAssayCount) {
        vm.isAllSelected = false;
        fileRelationshipService.resetInputGroup();
      } else {
        // remove selection on the currect view
        vm.isAllSelected = false;
        if (totalAssayCount > maxFileCount) {
          var assayQuery = assayFileService.query(getCurrentParams());
          assayQuery.$promise.then(function (response) {
            setNodeAndGroupSelection(response.nodes, selectionGroup, true);
          });
        } else {
          setNodeAndGroupSelection(assayFiles, selectionGroup, true);
        }
        angular.copy({}, activeNodeService.activeNodeRow);
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
