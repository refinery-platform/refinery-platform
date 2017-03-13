(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .directive('inputGroupCartTree', inputGroupCartTree);

  function inputGroupCartTree () {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        member: '='
      },
      template: '<div><div ng-if="member.file_relationship.length == 0">' +
      '<li><ul><li ng-repeat="inputFile in member.input_files">' +
      '<ul><li ng-repeat="fileObj in inputFile.allowed_filetypes">' +
      '{{fileObj.name}}</li></ul></li></ul></li></div>' +
      '<div ng-if="member.file_relationship.length > 0">' +
      '<input-group-cart collection="member">' +
      '</input-group-cart>' +
      '</div></div>',
    };
  }
})();
