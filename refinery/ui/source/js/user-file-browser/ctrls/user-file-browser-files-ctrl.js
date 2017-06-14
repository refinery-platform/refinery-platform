(function () {
  'use strict';

  angular
  .module('refineryUserFileBrowser')
  .controller('UserFileBrowserFilesCtrl', UserFileBrowserFilesCtrl);

  UserFileBrowserFilesCtrl.$inject = [
    '$q',
    'userFileBrowserFactory'
  ];

  function UserFileBrowserFilesCtrl ($q, userFileBrowserFactory) {
    var vm = this;
    var promise = $q.defer();
    var getUserFiles = userFileBrowserFactory.getUserFiles;
    getUserFiles().then(function (solr) {
      vm.gridOptions.data = [
          { url: 'foo.txt', technology: 'ChIP-seq',
            filename: 'YES.fastq.gz', organism: 'Homo sapiens',
            date: '2017-06-01', owner: 'Chuck McCallum',
            antibody: 'HNF4A', cell_type: 'Caco-2', published: 'yes',
            accession: 'GDS6248', genotype: 'N/A'
          },
          { url: 'bar.txt', technology: 'RNA-seq',
            filename: 'YES.fastq.gz', organism: 'Mus musculus',
            date: '2017-05-01', owner: 'Chuck McCallum',
            antibody: '', cell_type: 'mesenteric white adipose tissues', published: 'no',
            accession: 'GDS6249', genotype: 'C57BL/6J'
          }
      ]; // TODO: Remove this mock data.
      for (var i = 0; i < solr.nodes.length; i++) {
        vm.gridOptions.data.push({
          url: 'TODO',
          technology: 'TODO',
          filename: 'TODO',
          organism: 'TODO',
          date: 'TODO',
          antibody: 'TODO',
          cell_type: 'TODO',
          published: 'TODO',
          accession: 'TODO',
          genotype: 'TODO'
        });
      }
      promise.resolve();
    }, function () {
      promise.reject();
    });

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
      ]
    };
  }
})();

