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
}

DiffAttributeListCtrl.prototype.updateDiff = function () {
  this.diffAttributes = [];
  this.commonAttributes = [];

  var i = 0;

  this.log.debug('Updating diff lists ...');

  if (this.setA.attributes === null && this.setB.attributes === null) {
    this.log.debug('Both sets empty');
    return;
  }

  if (this.setB.attributes !== null && this.setA.attributes !== null) {
    for (i = 0; i < this.setA.attributes.length; ++i) {
      if (this.setA.attributes[i].name === this.setB.attributes[i].name) {
        if (this.setA.attributes[i].value === this.setB.attributes[i].value) {
          this.commonAttributes.push({
            name: this.setA.attributes[i].name,
            value: this.setA.attributes[i].value
          });
        } else {
          this.diffAttributes.push({
            name: this.setA.attributes[i].name,
            valueSetA: this.setA.attributes[i].value,
            valueSetB: this.setB.attributes[i].value
          });
        }
      }
    }
    return;
  }

  if (this.setA.attributes === null) {
    for (i = 0; i < this.setB.attributes.length; ++i) {
      this.commonAttributes.push({
        name: this.setB.attributes[i].name,
        value: this.setB.attributes[i].value
      });
    }
    return;
  }

  if (this.setB.attributes === null) {
    for (i = 0; i < this.setA.attributes.length; ++i) {
      this.commonAttributes.push({
        name: this.setA.attributes[i].name,
        value: this.setA.attributes[i].value
      });
    }
    return;
  }
};

angular
  .module('refineryNodeMapping')
  .controller('DiffAttributeListCtrl', [
    '$log', '$scope', DiffAttributeListCtrl
  ]);
