'use strict';

angular
  .module('refineryApp')
  .constant(
    'introJsDefaultOptions', {
      showStepNumbers: false,
      showBullets: false,
      exitOnOverlayClick: false,
      exitOnEsc: true,
      nextLabel: '<span class="intro-js-prev"><i class="fa fa-arrow-right"></i></span>',
      prevLabel: '<span class="intro-js-prev"><i class="fa fa-arrow-left"></i></span>',
      skipLabel: '<span class="intro-js-exit"><i class="fa fa-times"></i></span>',
      doneLabel: '<span class="intro-js-exit">Close</span>'
    }
  )
  .service('introJsBeforeChangeEvent', function () {
    return function (fn) {
      return function () {
        // The `this` context is the intro.js context

        var currentStep = this._options.steps[this._currentStep];
        var nextStep = this._options.steps[this._currentStep + 1];
        var previousStep = this._options.steps[this._currentStep - 1];

        // Check for dynamic elements, e.g., elements Angular inserted after
        // initialization of the intro.js guide.
        if (currentStep.dynamicElement) {
          // Reassign element based on selector function.
          this._introItems[this._currentStep].element =
            currentStep.dynamicElement();
        }

        if (currentStep.dynamicSvgElement) {
          var el = currentStep.dynamicSvgElement();
          var clientRect = el.getBoundingClientRect();

          // Manually assign offset values as these are not available for SVG
          // elements but Intro.js needs those values.
          el.offsetWidth = clientRect.width;
          el.offsetHeight = clientRect.height;
          el.offsetTop = clientRect.top;
          el.offsetLeft = clientRect.left;

          // To avoid an exception being raised when going back as intro.js
          // expects `el.className.replace` to be valid.
          el.className = '';

          // Reassign element
          this._introItems[this._currentStep].element = el;
        }

        if (currentStep.dynamicPosition) {
          // Reassign position
          this._introItems[this._currentStep].position =
            currentStep.dynamicPosition;
        }

        if (
          previousStep &&
          typeof(previousStep.afterExecutives) === 'function' &&
          this._direction === 'forward'
        ) {
          previousStep.afterExecutives.call(this);
        }

        if (
          nextStep &&
          typeof(nextStep.afterExecutives) === 'function' &&
          this._direction === 'backward'
        ) {
          nextStep.afterExecutives.call(this);
        }

        if (typeof(currentStep.beforeExecutives) === 'function') {
          currentStep.beforeExecutives.call(this);
        }

        if (typeof(fn) === 'function') {
          fn.call(this);
        }
      };
    };
  });
