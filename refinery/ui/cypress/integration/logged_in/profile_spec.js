describe('Profile', function() {
  it('Has profile', function() {
    cy.login_guest();
    cy.visible('GuestFirst GuestLast').click();

    cy.visible('Profile for guest');
    cy.visible('First Name');
    cy.visible('GuestFirst');
    cy.visible('Last Name');
    cy.visible('GuestLast');
    cy.visible('Email');
    cy.visible('guest@example.com');
    cy.visible('Affiliation');
    cy.visible('None provided');
    cy.visible('Password');
    cy.visible('Change Password?');

    cy.visible('Groups');
    cy.visible('Public');

    cy.visible('History');
    cy.visible('Joined on');
  });
});
