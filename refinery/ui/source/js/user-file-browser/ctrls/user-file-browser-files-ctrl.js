(function () {
  'use strict';

  angular
  .module('refineryUserFileBrowser')
  .controller('UserFileBrowserFilesCtrl', UserFileBrowserFilesCtrl);

  UserFileBrowserFilesCtrl.$inject = [
    'userFileBrowserFactory'
  ];

  function UserFileBrowserFilesCtrl (userFileBrowserFactory) {
    var vm = this;
    var getUserFiles = userFileBrowserFactory.getUserFiles;
    console.log(getUserFiles());  // TODO: How do I use this?

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
          { field: 'dataset',
            enableSorting: false,
            displayName: '',
            cellTemplate:
                '<div class="ui-grid-cell-contents" >' +
                '<a href="{{grid.getCellValue(row, col)}}" target="_blank">' +
                '<i class="fa fa-file"></i>' +
                '</a>' +
                '</div>',
            width: 30 },
          { field: 'filename' },
          { field: 'technology' },
          { field: 'organism' },
          { field: 'date' },
          { field: 'owner' },
          { field: 'antibody' },
          { field: 'cell_type' },
          { field: 'published' },
          { field: 'accession',
            cellTemplate:
                '<div class="ui-grid-cell-contents" >' +
                '<a href="{{grid.getCellValue(row, col)}}" target="_blank">' +
                '<i class="fa fa-external-link"></i> {{grid.getCellValue(row, col)}}' +
                '</a>' +
                '</div>' },
          { field: 'genotype' }
      ],
      data: [
          { url: 'foo.txt', technology: 'ChIP-seq',
            filename: 'SRR064951.fastq.gz', organism: 'Homo sapiens',
            date: '2017-06-01', owner: 'Chuck McCallum',
            antibody: 'HNF4A', cell_type: 'Caco-2', published: 'yes',
            accession: 'GDS6248', genotype: 'N/A'
          },
          { url: 'bar.txt', technology: 'RNA-seq',
            filename: 'SRR064952.fastq.gz', organism: 'Mus musculus',
            date: '2017-05-01', owner: 'Chuck McCallum',
            antibody: '', cell_type: 'mesenteric white adipose tissues', published: 'no',
            accession: 'GDS6249', genotype: 'C57BL/6J'
          }
      ]
    };
  }
})();

