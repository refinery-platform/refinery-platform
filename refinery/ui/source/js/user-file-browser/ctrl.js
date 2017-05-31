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
      }
    };
    this.gridOptions = {
      appScopeProvider: this,
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

