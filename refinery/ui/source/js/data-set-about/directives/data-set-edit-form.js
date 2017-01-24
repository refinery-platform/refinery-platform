'use strict';

function rpDataSetEditForm (dataSetAboutFactory, $window) {
  return {
    restrict: 'A',
    templateUrl: '/static/partials/data-set-about/partials/data-set-edit-form.html',
    link: function (scope) {
      var dataSetUuid = $window.dataSetUuid;

      scope.updateDataSet = function () {
        dataSetAboutFactory.updateDataSet(
          {
            uuid: dataSetUuid,
            summary: 'Does this work'
          }
        );
      };
    }
  };
}

angular
  .module('refineryDataSetAbout')
  .directive('rpDataSetEditForm', [
    'dataSetAboutFactory',
    '$window',
    rpDataSetEditForm
  ]);
