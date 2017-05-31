(function () {
  'use strict';

  angular
  .module('refineryUserFileBrowser')
  .controller('UserFileBrowserCtrl', UserFileBrowserCtrl);

  UserFileBrowserCtrl.$inject = [
  ];

  function UserFileBrowserCtrl () {
    this.attributeFilters = {
      type: {
        internal_name: 'foo',
        facetObj: [
          { name: 'DNA', count: 4 },
          { name: 'RNA', count: 7 }
        ]
      } };
  }
})();

