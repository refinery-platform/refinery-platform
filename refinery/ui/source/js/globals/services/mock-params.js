'use strict';

function mockParamsFactory () {
  function s4 () {
    // hex value (decimal 65536)
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16).substring(1);
  }

  function generateUuid () {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
  }

  return {
    generateUuid: generateUuid
  };
}

angular
  .module('mockParams', [])
  .factory('mockParamsFactory', mockParamsFactory);
