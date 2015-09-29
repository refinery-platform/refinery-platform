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
        var parentWidth = $parent.width(),
            // The span4's width percentage changes when `position` is switched
            // from `relative` to `absolute`, since the absolute width includes
            // 1.5% of left and right margin.
            absPercentage = (
              (parentWidth / (parentWidth * 1.030927835)) * 31.91489362
            ),
            animator = $animateCss(element, {
              duration: transitionSpeed,
              easing: 'cubic-bezier(0.3, 0.1, 0.6, 1)',
              from: {
                position: 'absolute',
                width: absPercentage + '%'
              },
              to: {
                position: 'absolute',
                width: '97%'
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
            absPercentage = (
              (parentWidth / (parentWidth * 1.030927835)) * 31.91489362
            ),
            animator = $animateCss(element, {
              duration: transitionSpeed,
              easing: 'cubic-bezier(0.3, 0.1, 0.6, 1)',
              from: {
                position: 'absolute',
                width: '97%'
              },
              to: {
                position: 'absolute',
                width: absPercentage + '%'
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
