'use strict';

// swap white spaces with hypens
function replaceWhiteSpaceWithHyphen () {
  return function (param) {
    return typeof param !== 'undefined' ? param.replace(/ /g, '-') : param;
  };
}

angular
  .module('replaceWhiteSpaceWithHyphen', [])
  .filter('replaceWhiteSpaceWithHyphen', replaceWhiteSpaceWithHyphen);
