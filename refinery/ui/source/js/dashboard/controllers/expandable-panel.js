'use strict';

function ExpandablePanelCtrl (
  $animate,
  $animateCss,
  $element,
  $log,
  $timeout,
  $window,
  $,
  pubSub,
  dashboardExpandablePanelService,
  dashboardDataSetPreviewService,
  dashboardWidthFixerService
) {
  var transitionSpeed = 0.25;

  var jqElement = $($element);
  var jqParent = jqElement.parent();

  $element.addClass('expandable');

  dashboardExpandablePanelService.lockFullWith.push(function () {
    $element.addClass('full-width');
  });

  dashboardExpandablePanelService.expander.push(function () {
    var animator = $animateCss($element, {
      duration: transitionSpeed,
      easing: 'cubic-bezier(0.3, 0.1, 0.6, 1)',
      from: {
        position: 'absolute',
        // Add the 20px of total left / right padding.
        width: jqElement.width() + 20
      },
      to: {
        position: 'absolute',
        width: jqParent.width()
      }
    });

    pubSub.trigger('expanding');
    animator
      .start()
      .then(function () {
        $element
          .addClass('full-width')
          .removeAttr('style');

        $window.requestAnimationFrame(function () {
          $timeout(function () {
            pubSub.trigger('expandFinished');
          }, 0);
        });
      })
      .catch(function (e) {
        $log.error(e);
      });
  });

  dashboardExpandablePanelService.collapser.push(function () {
    var parentWidth = jqParent.width();
    var animator = $animateCss($element, {
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
        $element
          .removeClass('full-width')
          .removeAttr('style');


        $window.requestAnimationFrame(function () {
          $timeout(function () {
            pubSub.trigger('collapseFinished');
            dashboardWidthFixerService.trigger('resetter');
          }, 0);
        });
      })
      .catch(function (e) {
        $log.error(e);
      });
  });
}

angular
  .module('refineryDashboard')
  .controller('ExpandablePanelCtrl', [
    '$animate',
    '$animateCss',
    '$element',
    '$log',
    '$timeout',
    '$window',
    '$',
    'pubSub',
    'dashboardExpandablePanelService',
    'dashboardDataSetPreviewService',
    'dashboardWidthFixerService',
    ExpandablePanelCtrl
  ]);
