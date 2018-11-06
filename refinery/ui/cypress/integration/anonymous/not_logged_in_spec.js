describe('Not logged in', function() {

  it('Has homepage', function() {
    cy.viewport(1366, 768) //macbook 11"

    cy.visit('/');
    //cy.visible('Refinery');

    cy.visible('Collaboration');
    cy.visible('About');

    cy.visible('Register');
    cy.visible('Login');

    cy.visible('Launch Pad');

    cy.visible('Data Sets');
    cy.visible('Analyses');
    cy.visible('Workflows');

    cy.visible('No data sets available.');
    cy.visible('No analyses available.');
    cy.visible('No workflows available.');

    cy.get('#global-analysis-status').should('visible').click();
    cy.visible('Recent Analyses');
    cy.visible('No analyses performed.');
  });

  it('Has about', function() {
    cy.viewport(1366, 768) //macbook 11"
    cy.visit('/');
    cy.visible('About').click();

    //cy.visible('About Refinery');

    cy.visible('Background');
    cy.visible('Contact');
    cy.visible('Funding');
    cy.visible('Most Recent Code for this Instance');
    cy.visible('Team');
  });

  it('Has list', function() {
    cy.visit('/');
    cy.visible_btn('List').click();

    cy.visible('Date Submitted');
    cy.visible('Sample Name');
    cy.visible('Name');
  });
});
