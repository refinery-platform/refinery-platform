'use strict';

function ImportConfirmationService ($ngConfirm) {
  // If a metadata revision is taking place, we'll warn the user about the
  // potential for data loss
  this.showConfirmation = function (parentScope) {
    $ngConfirm(
      {
        title: 'Warning: Potential Datafile Loss',
        content: 'This metadata revision may remove datafiles that have been' +
        ' uploaded prior if they are not referenced in the newly revised' +
        ' metadata file.',
        buttons: {
          continueWithImport: {
            text: 'Continue',
            btnClass: 'btn-warning',
            action: function () {
              parentScope.startImport();
            }
          },
          cancelImport: {
            text: 'Cancel',
            btnClass: 'btn-default'
          }
        }
      }
    );
  };
}

angular
  .module('refineryDataSetImport')
  .service('importConfirmationService', [
    '$ngConfirm',
    ImportConfirmationService
  ]);
