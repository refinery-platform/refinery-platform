'use strict';

function locationTest (currentPath, matchPath, regex) {
  if ((regex && new RegExp(matchPath).test(currentPath)) ||
    matchPath === currentPath) {
    return true;
  }
  return false;
}

angular
  .module('refineryRouter')
  // Normally we would use `service` but services can't be injected into a
  // provider while constants can. This is weird but seems to be a limitation of
  // Angular.
  .constant('locationTest', locationTest);
