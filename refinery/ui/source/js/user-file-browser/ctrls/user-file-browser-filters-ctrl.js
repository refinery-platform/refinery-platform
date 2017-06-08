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
          { name: 'Affymetrix Probe Results', count: 42 }
        ]
      },
      Owner: {
        facetObj: [
          { name: 'Chuck McCallum', count: 42 },
          { name: 'Geoff Nelson', count: 42 }
        ]
      },
      Antibody: {
        facetObj: [
          { name: 'HNF4A', count: 42 },
          { name: 'FRTS4', count: 42 }
        ]
      },
      Celltype: {
        facetObj: [
          { name: 'Caco-2', count: 42 },
          { name: 'HeLa', count: 42 }
        ]
      },
      Genotype: {
        facetObj: [
          { name: 'C57BL/6J', count: 42 }
        ]
      }
    };
  }
})();

