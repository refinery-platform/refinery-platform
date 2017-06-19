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
      vm.gridOptions.columnDefs = userFileBrowserFactory.createColumnDefs(solr.attributes);

      vm.gridOptions.data = [];
      for (var i = 0; i < solr.nodes.length; i++) {
        var node = solr.nodes[i];
        var url = node.REFINERY_NAME_6_3_s;
        vm.gridOptions.data.push({
          url: url,
          technology: 'TODO',
          filename: url ? decodeURIComponent(url.replace(/.*\//, '')) : '',
          organism: node.organism_Characteristics_6_3_s,
          date: 'TODO',
          antibody: node.antibody_Factor_Value_6_3_s,
          cell_type: node.cell_line_Characteristics_6_3_s,
          published: 'TODO',
          accession: 'TODO',
          genotype: 'TODO',
          owner: 'TODO'
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
      rowHeight: 35
    };
  }
})();

