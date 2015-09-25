function LocationTest (currentPath, matchPath, regex) {
  if ((regex && new RegExp(matchPath).test(currentPath)) ||
      matchPath === currentPath) {
    return true;
  }
  return false;
}

angular
  .module('refineryRouter')
  .constant("locationTest", LocationTest);
