/**
 * provvis Decl Doi Factors
 * @namespace provvisDeclDoiFactors
 * @desc Service for initializing doi factors
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .factory('provvisDeclDoiFactors', provvisDeclDoiFactors);

  function provvisDeclDoiFactors (

  ) {
    var factors = {
      filtered: {
        label: 'filtered',
        value: 0.2,
        masked: true
      },
      selected: {
        label: 'selected',
        value: 0.2,
        masked: true
      },
      highlighted: {
        label: 'highlighted',
        value: 0.2,
        masked: true
      },
      time: {
        label: 'time',
        value: 0.2,
        masked: true
      },
      diff: {
        label: 'diff',
        value: 0.2,
        masked: true
      }
    };

    var service = {
      factors: factors,
      get: get,
      isMasked: isMasked,
      set: set
    };

    return service;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
    function get (prop) {
      return factors[prop].value;
    }

    function isMasked (prop) {
      return factors[prop].masked;
    }

    function set (prop, value, masked) {
      factors[prop] = {
        label: prop.toString(),
        value: value,
        masked: masked
      };
    }
  }
})();
