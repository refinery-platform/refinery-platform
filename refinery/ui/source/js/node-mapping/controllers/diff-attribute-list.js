'use strict';

function DiffAttributeListCtrl ($log, $scope) {
  this.log = $log;

  function checkIfUpdateDiff (oldVal, newVal) {
    if (oldVal && !newVal) {
      this.log.debug('Attribute setA initialized');
      this.updateDiff();
    }
    if (newVal) {
      this.log.debug('Attribute setA changed');
      this.updateDiff();
    }
  }

  $scope.$watch(function () {
    return this.setA.attributes;
  }.bind(this), checkIfUpdateDiff.bind(this));
  $scope.$watch(function () {
    return this.setB.attributes;
  }.bind(this), checkIfUpdateDiff.bind(this));


  // helper method for updating diff @params: obj {name: '', value: ''}
  this.seperateCommonAndDiffAttributes = function (attributeA, attributeB) {
    if (attributeA.name === attributeB.name) {
      if (attributeA.value === attributeB.value) {
        this.commonAttributes.push({
          name: attributeA.name,
          value: attributeA.value
        });
      } else {
        this.diffAttributes.push({
          name: attributeA.name,
          valueSetA: attributeA.value,
          valueSetB: attributeB.value
        });
      }
    }
  };

  this.updateDiff = function () {
    this.diffAttributes = [];
    this.commonAttributes = [];
    this.log.debug('Updating diff lists ...');

    if (this.setA.attributes === null && this.setB.attributes === null) {
      this.log.debug('Both sets empty');
    } else if (this.setB.attributes !== null && this.setA.attributes !== null) {
      for (var i = 0; i < this.setA.attributes.length; ++i) {
        this.seperateCommonAndDiffAttributes(this.setA.attributes, this.setB.attributes);
      }
    } else if (this.setA.attributes === null) {
      angular.copy(this.setB.attributes, this.commonAttributes);
    } else {
      // ( expect this.setB.attributes === null)
      angular.copy(this.setA.attributes, this.commonAttributes);
    }
  };
}

angular
  .module('refineryNodeMapping')
  .controller('DiffAttributeListCtrl', [
    '$log', '$scope', DiffAttributeListCtrl
  ]);
