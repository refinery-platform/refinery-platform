describe('Not logged in', function() {
  it('Has homepage', function() {
    cy.visit('/');
    cy.contains('Refinery');

    cy.contains('Collaboration');
    cy.contains('Statistics');
    cy.contains('About');

    cy.contains('Register');
    cy.contains('Login');

    cy.contains('Launch Pad');

    cy.contains('Data Sets');
    cy.contains('List');
    cy.contains('Explore');
    cy.contains('Analyses');
    cy.contains('Workflows');

    cy.contains('No data sets available.');
    cy.contains('No analyses available.');
    cy.contains('No workflows available.');
  });

  it('Has statistics', function() {
    cy.visit('/');
    cy.contains('Statistics').click();

    cy.contains('Statistics');

    cy.contains('Users');
    cy.contains('Groups');
    cy.contains('Files');
    cy.contains('Data Sets');
    cy.contains('Workflows');
    cy.contains('Projects');
  });

  it('Has about', function() {
    cy.visit('/');
    cy.contains('About').click();

    cy.contains('About Refinery');

    cy.contains('Background');
    cy.contains('Contact');
    cy.contains('Funding');
    cy.contains('Most Recent Code for this Instance');
    cy.contains('Team');
  });
});
