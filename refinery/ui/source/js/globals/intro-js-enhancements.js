'use strict';

angular
  .module('refineryApp')
  .constant(
    'introJsDefaultOptions', {
      showStepNumbers: false,
      exitOnOverlayClick: true,
      exitOnEsc: true,
      nextLabel: '<span class="intro-js-prev">Next</span>',
      prevLabel: '<span class="intro-js-prev">Previous</span>',
      skipLabel: '<span class="intro-js-exit">Exit</span>',
      doneLabel: '<span class="intro-js-exit">Thanks</span>'
    }
  )
  .service('introJsBeforeChangeEvent', function () {
    return function (fn) {
      return function () {
        // The `this` context is the intro.js context

        var currentStep = this._options.steps[this._currentStep];

        // Check for dynamic elements, e.g., elements Angular inserted after
        // initialization of the intro.js guide.
        if (currentStep.dynamicElement) {
          // Reassign element based on selector function.
          this._introItems[this._currentStep].element =
            currentStep.dynamicElement();
          if (currentStep.dynamicElementPosition) {
            // Reassign position
            this._introItems[this._currentStep].position =
              currentStep.dynamicElementPosition;
          }
        }

        if (typeof(currentStep.beforeExecutives) === 'function') {
          currentStep.beforeExecutives.call(this);
        }

        if (typeof(fn) === 'function') {
          fn.call(this);
        }
      };
    };
  })
  .service('introJsAfterChangeEvent', function () {
    return function (fn) {
      return function () {
        // The `this` context is the intro.js context

        var currentStep = this._options.steps[this._currentStep];

        if (typeof(currentStep.afterExecutives) === 'function') {
          currentStep.afterExecutives.call(this);
        }

        if (typeof(fn) === 'function') {
          fn.call(this);
        }
      };
    };
  });
