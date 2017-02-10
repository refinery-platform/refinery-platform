(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .factory('singleInputGroupService', [singleInputGroupService]);

  function singleInputGroupService () {
    var selectedGroup = {};
    var inputGroups = [
      { name: 'Node 1', fileType: 'BAM' },
      { name: 'Node 2', fileType: 'WIG' },
      { name: 'Node 3', fileType: 'BIG' }
    ];

    /*
    *-----------------------
    * Method Definitions
    * ----------------------
    */
    function setSelectedGroup (group) {
      angular.copy(group, selectedGroup);
    }


    /* Return */
    return {
      inputGroups: inputGroups,
      selectedGroup: selectedGroup,
      setSelectedGroup: setSelectedGroup
    };
  }
})();
