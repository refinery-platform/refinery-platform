'use strict';

var TooltipCtrl = function ($element) {
  this.$element = $element;

  this.$element
    .attr('data-container', this.container)
    .one('mouseenter', function () {
      // Initialize the tool tip plugin when the element is hovered the
      // first time by the mouse cursor. This ensures that Angular has
      // successfully rendered the title and avoids performance issues.
      this.$element.tooltip({
        placement: this.placement,
        delay: {
          hide: this.delayHide || 0,
          show: this.delayShow || 0
        }
      });
      // After initializing the plugin we need to trigger the `mouseover`
      // event again to immediately show the tool tip.
      this.$element.trigger('mouseenter', this.$element);
    }.bind(this));

  if (this.hideOnClick) {
    this.$element.on('click', function () {
      this.$element.tooltip('hide');
    }.bind(this));
  }
};

Object.defineProperty(
  TooltipCtrl.prototype,
  'hideWhen', {
    enumerable: true,
    get: function () {
      return this._hideWhen;
    },
    set: function (value) {
      this._hideWhen = value;
      if (value) {
        this.$element.tooltip('hide');
      }
    }
  });

var tooltipDirective = function () {
  return {
    bindToController: {
      delayHide: '@refineryTooltipDelayHide',
      delayShow: '@refineryTooltipDelayShow',
      hideOnClick: '@refineryTooltipHideOnClick',
      hideWhen: '=refineryTooltipHideWhen',
      container: '@refineryTooltipContainer',
      placement: '@refineryTooltipPlacement'
    },
    controller: 'TooltipCtrl',
    controllerAs: 'tooltip',
    restrict: 'A'
  };
};

angular
  .module('tooltip', [])
  .controller('TooltipCtrl', ['$element', TooltipCtrl])
  .directive('refineryTooltip', [tooltipDirective]);
