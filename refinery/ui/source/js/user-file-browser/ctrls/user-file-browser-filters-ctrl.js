(function () {
  'use strict';

  angular
  .module('refineryUserFileBrowser')
  .controller('UserFileBrowserFiltersCtrl', UserFileBrowserFiltersCtrl);

  function UserFileBrowserFiltersCtrl () {
    var vm = this;
    vm.attributeFilters = {
      Technology: {
        facetObj: [
          { name: 'ChIP-seq', count: 4 },
          { name: 'RNA-seq', count: 7 }
        ]
      },
      Organism: {
        facetObj: [
          { name: 'Homo sapiens', count: 3 },
          { name: 'Mus musculus', count: 8 }
        ]
      },
      Filetype: {
        facetObj: [
          { name: 'GCT file', count: 42 },
          { name: 'Affymetrix Probe Results', count: 8 }
        ]
      },
      Owner: {
        facetObj: [
          { name: 'Chuck McCallum', count: 6 },
          { name: 'Geoff Nelson', count: 6 }
        ]
      },
      Antibody: {
        facetObj: [
          { name: 'HNF4A', count: 5 },
          { name: 'FRTS4', count: 46 }
        ]
      },
      Celltype: {
        facetObj: [
          { name: 'Caco-2', count: 42 },
          { name: 'HeLa', count: 1 }
        ]
      },
      Genotype: {
        facetObj: [
          { name: 'C57BL/6J', count: 12 }
        ]
      }
    };
  }
})();

