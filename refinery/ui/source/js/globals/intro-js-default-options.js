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
  );
