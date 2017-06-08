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
          { field: 'organism' }
      ],
      data: [
          { url: 'foo.txt', type: 'DNA', organism: 'human' },
          { url: 'bar.txt', type: 'RNA', organism: 'mouse' }
      ]
    };
  }
})();

