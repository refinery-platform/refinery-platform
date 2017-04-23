(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .controller('NodeSelectionPopoverCtrl', NodeSelectionPopoverCtrl);

  NodeSelectionPopoverCtrl.$inject = [
    '$scope',
    '_',
    'fileRelationshipService',
    'selectedNodesService'
  ];

  function NodeSelectionPopoverCtrl (
    $scope,
    _,
    fileRelationshipService,
    selectedNodesService
  ) {
    var fileService = fileRelationshipService;
    var nodeService = selectedNodesService;
    var vm = this;
    vm.activeNode = nodeService.activeNodeRow;
    vm.attributes = fileService.attributesObj; // contains the data attributes
    vm.currentGroup = fileService.currentGroup; // group indices ex: [0, 0]
    /** current group's data structure for each level ex:[ 'Pair','List'] **/
    vm.currentTypes = fileService.currentTypes;
    // selectedNodes ordered by group indicies
    vm.groupCollection = fileService.groupCollection;
    vm.inputFileTypes = fileService.inputFileTypes; // current tool's inputFileTypes
    // selectedNodes ordered by group indicies
    vm.nodeSelection = fileService.nodeSelectCollection;
    vm.selectNode = selectNode; // method
    vm.selectionObj = nodeService.selectionObj; // ui-select obj track checkbox
  /*
   * ---------------------------------------------------------
   * Method
   * ---------------------------------------------------------
   */
    /**
     * Updates service data object with the selected/deselected now
     * @param {string} inputUuid - file input type uuid provided by tool
     * definition api
     * @param {string} deselectFileUuid - OPTIONAL, given when user
     * deselects a checkbox
     */
    function selectNode (inputUuid, deselectFileUuid) {
      console.log('in select node');
      console.log(vm.selectionObj);
      fileService.setNodeSelectCollection(inputUuid, vm.selectionObj, deselectFileUuid);
      fileService.setGroupCollection(inputUuid, vm.selectionObj, deselectFileUuid);
      vm.groupCollection = fileService.groupCollection;
      console.log('selectNode');
      console.log(vm.groupCollection);
    }
  /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    // When selected tools are update, so are their inputFileTypes
    $scope.$watchCollection(
      function () {
        return fileService.inputFileTypes;
      },
      function () {
        vm.inputFileTypes = fileService.inputFileTypes;
        vm.currentGroup = fileService.currentGroup;
        vm.currentTypes = fileService.currentTypes;
        vm.groupCollection = fileService.groupCollection;
        vm.nodeSelection = fileService.nodeSelectCollection;
      }
    );
    // When user changes the group selection from the control panel
    $scope.$watchCollection(
      function () {
        return fileService.currentGroup;
      },
      function () {
        vm.currentGroup = fileService.currentGroup;
        vm.currentTypes = fileService.currentTypes;
      }
    );
  }
})();
