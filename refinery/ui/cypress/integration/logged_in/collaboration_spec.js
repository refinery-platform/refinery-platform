describe('Collaboration', function() {
  it.skip('Works', function() {
    /*
    TODO:

    I'm running into a lot of unpredictability here. I think sometimes the problem may be
    that elements are visible, without being clickable, because they are still behind a modal.

    But there are other problems, too.
     */
    cy.login_guest('/collaboration/');

    cy.visible('Group Information for');

    cy.visible('Groups');
    cy.visible('Members');
    cy.visible('Pending Invitations');

    cy.visible_btn('Add').click();
    // TODO: Often fails with: [$location:badpath] http://errors.angularjs.org/1.5.9/$location/badpath?p0=%2F%2F
    cy.visible('Add new groups');
    cy.visible('No two groups in Refinery may have the same name.');
    cy.visible('Names must be at least 3 characters long.');

    var group_name = 'group_' + Date.now();
    cy.get('[name="groupName"]').type(group_name);
    cy.visible_btn('Create group').click();

    cy.visible('Successfully created group ' + group_name);

    // Make sure modal is gone and UI has updated before proceeding.
    cy.get('body').should('not.contain', 'Add new groups');
    cy.get('#collaborationTutorialStep1').should('contain', group_name).click();

    //cy.visible(group_name).click(); // Edit the group we just created...
    cy.get('#collaborationTutorialStep2 .fa-cog').click(); // and in the middle pane, click the cog.

    cy.visible('Member Editor');
    cy.visible('If you are the last manager in a group, you must delete the group in order to remove yourself or assign another manager first.');
    cy.visible_btn('Remove').invoke('attr', 'disabled').should('eq', 'disabled');
    cy.visible_btn('Demote').invoke('attr', 'disabled').should('eq', 'disabled');
    cy.get('.close').click();

    var email = Date.now() + '@example.com';
    cy.visible_btn('Invite').click();
    cy.visible('Invite New Member');
    cy.visible('Email address required.');
    cy.get('[name="recipientEmail"]').type(email);
    cy.visible_btn('Send Invite').click();
    cy.visible('Successfully sent invitation to ' + email);

    cy.visible('Resend').click();
    cy.visible('Invitation successfully re-sent to ' + email);
    cy.visible_btn('OK').click();

    cy.visible('Revoke').click();
    cy.visible('Invitation revoked from ' + email);
    cy.visible_btn('OK').click();

    // This assumes the groups are listed in order of creation.
    cy.get('#collaborationTutorialStep1 .fa-cog:last').click();
    cy.visible('Group Editor');
    cy.get('.modal-dialog').visible(group_name);
    cy.visible_btn('Delete').click();
    cy.get('body').should('not.contain', group_name);
  });
});
