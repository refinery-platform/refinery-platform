/**
 * dataSet Props Service
 * @namespace dataSetPropsService
 * @desc Service which stores the data set properties
 * @memberOf refineryApp.refineryFileBrowser
 */
(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .service('dataSetPropsService', dataSetPropsService);

  dataSetPropsService.$inject = ['_', '$window', 'dataSetV2Service'];

  function dataSetPropsService (_, $window, dataSetV2Service) {
    var vm = this;
    vm.dataSet = {};
    vm.userPerms = 'none';
    vm.refreshDataSet = refreshDataSet;

   /*
   * ---------------------------------------------------------
   * Methods Definitions
   * ---------------------------------------------------------
   */
    /**
     * @name refreshDataSet
     * @desc  Updates the dataset object from the data set v2 api
     * @memberOf refineryFileBrowser.refreshDataSet
    **/
    function refreshDataSet () {
      var params = { uuid: $window.dataSetUuid };
      var dataSet = dataSetV2Service.query(params);
      dataSet.$promise.then(function (response) {
        angular.copy(response.data, vm.dataSet);
        setUserPerms(vm.dataSet.user_perms);
      });
      return dataSet.$promise;
    }

    /**
     * @name setUserPerms
     * @desc  Process the data_set v2 api's user_perms field object into an
     * easier to use in the view. A single string permission.
     * @memberOf refineryFileBrowser.setUserPerms
     * @param {obj} permsObj - expecting an object with boolean values
    **/
    function setUserPerms (permsObj) {
      if (_.isEmpty(permsObj)) {
        vm.userPerms = 'none';
      } else if (permsObj.change) {
        vm.userPerms = 'change';
      } else if (permsObj.read) {
        vm.userPerms = 'read';
      } else if (permsObj.read_meta) {
        vm.userPerms = 'read_meta';
      } else {
        vm.userPerms = 'none';
      }
    }
  }
})();
