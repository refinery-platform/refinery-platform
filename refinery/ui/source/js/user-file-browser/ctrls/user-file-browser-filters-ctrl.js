(function () {
  'use strict';

  angular
  .module('refineryUserFileBrowser')
  .controller('UserFileBrowserFiltersCtrl', UserFileBrowserFiltersCtrl);

  function UserFileBrowserFiltersCtrl () {
    var vm = this;
    vm.attributeFilters = {
      type: {
        facetObj: [
          { name: 'DNA', count: 4 },
          { name: 'RNA', count: 7 }
        ]
      },
      organism: {
        facetObj: [
          { name: 'mouse', count: 3 },
          { name: 'human', count: 8 }
        ]
      },
      filetype: {
        facetObj: [
          { name: 'sample', count: 42 }
        ]
      },
      owner: {
        facetObj: [
          { name: 'sample', count: 42 }
        ]
      },
      antibody: {
        facetObj: [
          { name: 'sample', count: 42 }
        ]
      },
      cell_type: {
        facetObj: [
          { name: 'sample', count: 42 }
        ]
      },
      genotype: {
        facetObj: [
          { name: 'sample', count: 42 }
        ]
      }
    };
  }
})();

