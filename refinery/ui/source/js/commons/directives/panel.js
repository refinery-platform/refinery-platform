'use strict';

function RefineryPanelCtrl (_$element_, _$timeout_, _$window_, _$_, _pubSub_) {
  var CTRL = this;
  var ELEMENT = _$element_;
  var $ = _$_;
  var PARENT_REF_ELEMENT = (function () {
    var el = ELEMENT[0].parentNode;
    while (el.tagName.toLowerCase() !== 'body') {
      if (el.hasAttribute('refinery-panel')) {
        return $(el);
      }
      el = el.parentNode;
    }
    return undefined;
  }());
  var ELEMENT_REF_OFFSET = (function () {
    var el = ELEMENT[0].parentNode;
    while (el.tagName.toLowerCase() !== 'body') {
      if (el.hasAttribute('refinery-panel-ref-offset')) {
        return $(el);
      }
      el = el.parentNode;
    }
    return undefined;
  }());
  var PUB_SUB = _pubSub_;
  var $timeout = _$timeout_;
  // I honestly don't know why we have to wrap `$window` again in a jQuery
  // function. That should have been done by Angular already (like with
  // `$element`).
  var WINDOW = $(_$window_);

  var fullHeight;
  var minHeight = parseInt(ELEMENT.css('min-height'), 10);

  function getFullHeight (windowHeight) {
    var refHeight = windowHeight;
    var refOffsetEl = ELEMENT_REF_OFFSET || ELEMENT;

    if (PARENT_REF_ELEMENT) {
      refHeight = PARENT_REF_ELEMENT.offset().top +
      PARENT_REF_ELEMENT.height();
    } else if (!windowHeight) {
      refHeight = WINDOW.height();
    }

    fullHeight = Math.max(
      refHeight - refOffsetEl.offset().top - 10,
      minHeight
    );
  }

  function RefineryPanel () {
    PUB_SUB.on('refineryPanelUpdateHeight', function (event) {
      if (event.ids[CTRL.id]) {
        this.updateHeight();
      }
    }.bind(this));

    PUB_SUB.on('resize', function (event) {
      this.refreshHeight(event.width, event.height);
    }.bind(this));

    $timeout(function () {
      this.refreshHeight();
    }.bind(this), 0);
  }

  RefineryPanel.prototype.refreshHeight = function (windowWidth, windowHeight) {
    getFullHeight(windowHeight);

    if (windowWidth <= 767) {
      ELEMENT.css('height', 'inherit');
    } else {
      ELEMENT.css(
        'height', Math.round(fullHeight * CTRL.getRelHeight()) + 'px'
      );
    }
  };

  RefineryPanel.prototype.updateHeight = function () {
    ELEMENT.css('height', Math.round(fullHeight * CTRL.getRelHeight()) + 'px');
  };

  RefineryPanel.prototype.refreshMinHeight = function () {
    minHeight = parseInt(ELEMENT.css('min-height'), 10);
  };

  return new RefineryPanel();
}

function refineryPanelDirective () {
  return {
    bindToController: {
      id: '@refineryPanelId',
      getRelHeight: '&refineryPanelGetRelHeight'
    },
    controller: 'RefineryPanelCtrl',
    controllerAs: 'panel',
    restrict: 'A'
  };
}

angular
  .module('refineryApp')
  .controller('RefineryPanelCtrl', [
    '$element', '$timeout', '$window', '$', 'pubSub', RefineryPanelCtrl
  ])
  .directive('refineryPanel', [
    refineryPanelDirective
  ]);
