function refineryExpandablePanel (
  $animate,
  $animateCss,
  $,
  pubSub,
  dashboardExpandablePanelService,
  dashboardDataSetPreviewService,
  dashboardWidthFixerService) {
  'use strict';

  var transitionSpeed = 0.25;

  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      var el = angular.element(element),
          $el = $(el),
          $parent = $el.parent();

      el.addClass('expandable');

      dashboardExpandablePanelService.expander.push(function () {
        var animator = $animateCss(element, {
              duration: transitionSpeed,
              easing: 'cubic-bezier(0.3, 0.1, 0.6, 1)',
              from: {
                position: 'absolute',
                // Add the 20px of total left / right padding.
                width: $el.width() + 20
              },
              to: {
                position: 'absolute',
                width: $parent.width()
              }
            });

        pubSub.trigger('expanding');
        animator
          .start()
          .then(function () {
            el.addClass('full-width');
            element.removeAttr('style');
            pubSub.trigger('expandFinished');
          })
          .catch(function (e) {
            console.error(e);
          });
      });

      dashboardExpandablePanelService.collapser.push(function () {
        var parentWidth = $parent.width(),
            animator = $animateCss(element, {
              duration: transitionSpeed,
              easing: 'cubic-bezier(0.3, 0.1, 0.6, 1)',
              from: {
                position: 'absolute',
                width: parentWidth
              },
              to: {
                position: 'absolute',
                width: parentWidth / 3
              }
            });

        pubSub.trigger('collapsing');
        animator
          .start()
          .then(function () {
            el.removeClass('full-width');
            element.removeAttr('style');
            pubSub.trigger('collapsFinished');
            dashboardWidthFixerService.trigger('resetter');
          })
          .catch(function (e) {
            console.error(e);
          });
      });
    }
  };
}

angular
  .module('refineryDashboard')
  .directive('refineryExpandablePanel', [
    '$animate',
    '$animateCss',
    '$',
    'pubSub',
    'dashboardExpandablePanelService',
    'dashboardDataSetPreviewService',
    'dashboardWidthFixerService',
    refineryExpandablePanel
  ]);
