(function () {
  'use strict';

  angular
  .module('refineryUserFileBrowser')
  .controller('UserFileBrowserCtrl', UserFileBrowserCtrl);

  UserFileBrowserCtrl.$inject = [
  ];

  function UserFileBrowserCtrl () {
    this.attributeFilters = { attribute: 'attributeObj' };
  }
})();

