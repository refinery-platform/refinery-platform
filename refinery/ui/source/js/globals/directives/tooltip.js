angular
  .module('toolTip', [])
  .directive('toolTip', ['$', function ($) {
    return {
      restrict: 'A',
      link: function(scope, element, attrs) {
        var $element = $(element);

        $element
          .attr('data-container', attrs.toolTipContainer)
          .one('mouseover', function () {
            // Initialize the tool tip plugin when the element is hovered the
            // first time by the mouse cursor. This ensures that Angular has
            // successfully rendered the title and avoids performance issues.
            $element.tooltip({
              placement: attrs.toolTipPlacement
            });
            // After initializing the plugin we need to trigger the `mouseover`
            // event again to immediately show the tool tip.
            $element.trigger('mouseover');
        });
      }
    };
  }]);
