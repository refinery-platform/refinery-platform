'use strict';

function refineryExpandablePanel (
  $animate,
  $animateCss,
  $log,
  $,
  pubSub,
  dashboardExpandablePanelService,
  dashboardDataSetPreviewService,
  dashboardWidthFixerService) {
  var transitionSpeed = 0.25;

  return {
    restrict: 'A',
    link: function (scope, element) {
      var el = angular.element(element);
      var $el = $(el);
      var $parent = $el.parent();

      el.addClass('expandable');

      dashboardExpandablePanelService.lockFullWith.push(function () {
        el.addClass('full-width');
      });

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
            $log.error(e);
          });
      });

      dashboardExpandablePanelService.collapser.push(function () {
        var parentWidth = $parent.width();
        var animator = $animateCss(element, {
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
            $log.error(e);
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
    '$log',
    '$',
    'pubSub',
    'dashboardExpandablePanelService',
    'dashboardDataSetPreviewService',
    'dashboardWidthFixerService',
    refineryExpandablePanel
  ]);
