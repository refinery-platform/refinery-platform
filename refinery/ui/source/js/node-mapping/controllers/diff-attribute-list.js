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


   // helper method for updating diff
   // var addCommonAttributes = function (attributesA, attributesB) {
   // for (var i = 0; i < setAttributes.length; ++i) {
   //   this.commonAttributes.push({
   //     name: setAttributes[i].name,
   //     value: setAttributes[i].value
   //   });
   // }
   // };

  this.updateDiff = function () {
    this.diffAttributes = [];
    this.commonAttributes = [];

    var i = 0;

    this.log.debug('Updating diff lists ...');

    if (this.setA.attributes === null && this.setB.attributes === null) {
      this.log.debug('Both sets empty');
    } else if (this.setB.attributes !== null && this.setA.attributes !== null) {
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
