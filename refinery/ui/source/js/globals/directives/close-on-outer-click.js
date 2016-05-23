'use strict';

/**
 * Visibly toggable directive, which should be closed on an outer click.
 *
 * @method  closeOnOuterClick
 * @author  Fritz Lekschas
 * @date    2015-08-13
 *
 * @example
 * <div>
 *   <div>
 *     <button
 *       ng-click="ctrl.showBox = !!!ctrl.showBox"
 *       close-on-outer-click-external-trigger="box">
 *       Show Box
 *     </button>
 *   </div>
 *   <div
 *     class="box"
 *     close-on-outer-click="ctrl.showBox"
 *     close-on-outer-click-id="box">
 *     ...
 *   </div>
 * </div>
 *
 * @param   {Object}  pubSub              PubSub module.
 * @param   {Object}  containsDomElement  ContainsDomElement module.
 * @return  {Object}                      Angular directive object.
 */
function closeOnOuterClick (pubSub, containsDomElement) {
  /**
   * Controller class
   *
   * @method  Ctrl
   * @author  Fritz Lekschas
   * @date    2015-08-13
   *
   * @class
   * @param  {Object}  $element  Directive's root element.
   */
  function Ctrl ($element) {
    this.element = $element[0];
  }

  /**
   * Remove global click listener when after closing.
   *
   * @method  off
   * @author  Fritz Lekschas
   * @date    2015-08-13
   */
  Ctrl.prototype.off = function () {
    pubSub.off('globalClick', this.eventId);
  };

  /**
   * Register global click listener
   *
   * @method  on
   * @author  Fritz Lekschas
   * @date    2015-08-13
   */
  Ctrl.prototype.on = function () {
    this.eventId = pubSub.on('globalClick', function (e) {
      var trigger = angular.element(e.toElement || e.target)
        .attr('close-on-outer-click-external-trigger');

      if (trigger !== this.closeOnOuterClickId) {
        if (!containsDomElement(this.element, e.toElement)) {
          this.closeOnOuterClick = false;
        }
      }
    }.bind(this));
  };

  /**
   * Clues together `on()` and `off()` with visibility of the directive, which
   * can be toggled elsewhere.
   *
   * @author  Fritz Lekschas
   * @date    2015-08-13
   *
   * @name Ctrl#closeOnOuterClick
   */
  Object.defineProperty(
    Ctrl.prototype,
    'closeOnOuterClick', {
      enumerable: true,
      configurable: false,
      get: function () {
        return this._closeOnOuterClick;
      },
      set: function (value) {
        if (value) {
          this.on();
        } else {
          this.off();
        }
        this._closeOnOuterClick = value;
      }
    }
  );

  return {
    bindToController: {
      closeOnOuterClick: '=',
      closeOnOuterClickId: '@'
    },
    controller: ['$element', Ctrl],
    controllerAs: 'CloseOnOuterClickCtrl',
    restrict: 'A',
    scope: {
      closeOnOuterClick: '=',
      closeOnOuterClickId: '@'
    }
  };
}

angular
  .module('closeOnOuterClick', [
    'pubSub',
    'containsDomElement'
  ])
  .directive('closeOnOuterClick', [
    'pubSub',
    'containsDomElement',
    closeOnOuterClick
  ]);
