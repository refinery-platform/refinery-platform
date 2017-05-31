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
      },
      organism: {
        internal_name: 'bar',
        facetObj: [
          { name: 'mouse', count: 3 },
          { name: 'human', count: 8 }
        ]
      },
    };
  }
})();

