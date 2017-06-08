(function () {
  'use strict';

  angular
  .module('refineryUserFileBrowser')
  .controller('UserFileBrowserFilesCtrl', UserFileBrowserFilesCtrl);

  function UserFileBrowserFilesCtrl () {
    var vm = this;
    vm.gridOptions = {
      appScopeProvider: vm,
      useExternalSorting: true,
      selectionRowHeaderWidth: 35,
      rowHeight: 35,
      columnDefs: [
          { field: 'url',
            enableSorting: false,
            displayName: '',
            cellTemplate:
                '<div class="ui-grid-cell-contents" >' +
                '<a href="{{grid.getCellValue(row, col)}}" target="_blank">' +
                '<i class="fa fa-arrow-circle-o-down"></i>' +
                '</a>' +
                '</div>',
            width: 30 },
          { field: 'type' },
          { field: 'organism' },
          { field: 'filetype' },
          { field: 'date' },
          { field: 'owner' },
          { field: 'antibody' },
          { field: 'cell_type' },
          { field: 'published' },
          { field: 'geo_accession' },
          { field: 'genotype' }
      ],
      data: [
          { url: 'foo.txt', type: 'DNA', organism: 'human',
            filetype: 'sample', date: 'sample', owner: 'sample',
            antibody: 'sample', cell_type: 'sample', published: 'sample',
            geo_accession: 'sample', genotype: 'sample'
          },
          { url: 'bar.txt', type: 'RNA', organism: 'mouse',
            filetype: 'sample', date: 'sample', owner: 'sample',
            antibody: 'sample', cell_type: 'sample', published: 'sample',
            geo_accession: 'sample', genotype: 'sample'
          }
      ]
    };
  }
})();

