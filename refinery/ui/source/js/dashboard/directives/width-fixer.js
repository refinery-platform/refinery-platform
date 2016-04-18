'use strict';

function refineryWidthFixer ($, dashboardWidthFixerService) {
  return {
    restrict: 'A',
    link: function (scope, element) {
      var $element = $(element);

      dashboardWidthFixerService.fixer.push(function () {
        var width = $element.width();

        this.fixedWidth = width;
        $element.css('width', width);
      });

      dashboardWidthFixerService.resetter.push(function () {
        this.fixedWidth = 0;
        $element.css('width', '');
      });
    }
  };
}

angular
  .module('refineryDashboard')
  .directive('refineryWidthFixer', [
    '$',
    'dashboardWidthFixerService',
    refineryWidthFixer
  ]);
