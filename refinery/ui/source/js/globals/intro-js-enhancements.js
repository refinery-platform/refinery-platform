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
        var previousStep = this._options.steps[this._currentStep - 1];

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

        if (
          previousStep && typeof(previousStep.afterExecutives) === 'function'
        ) {
          previousStep.afterExecutives.call(this);
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
