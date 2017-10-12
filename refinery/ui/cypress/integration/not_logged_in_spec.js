describe('Not logged in', function() {
  it('Has homepage', function() {
    cy.visit('/');
    //cy.visible('Refinery');

    cy.visible('Collaboration');
    cy.visible('Statistics');
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

  it('Has statistics', function() {
    cy.visit('/');
    cy.visible('Statistics').click();

    cy.visible('Statistics');

    cy.visible('Users');
    cy.visible('Groups');
    cy.visible('Files');
    cy.visible('Data Sets');
    cy.visible('Workflows');
    cy.visible('Projects');
  });

  it('Has about', function() {
    cy.visit('/');
    cy.visible('About').click();

    //cy.visible('About Refinery');

    cy.visible('Background');
    cy.visible('Contact');
    cy.visible('Funding');
    cy.visible('Most Recent Code for this Instance');
    cy.visible('Team');
  });

  it('Has explore', function() {
    cy.visit('/');
    cy.get('.btn').contains('Explore').should('visible').click();

    cy.visible('Intro Tour');
    cy.visible('Highlight:');
    cy.visible('Lock:');
    cy.visible('Query:');
    cy.visible('TREEMAP:');
    cy.visible('Depth:');

    cy.get('#list-graph-wrapper').contains('No data available!').should('visible');
    cy.get('#treemap-wrapper').contains('No data available!').should('visible');
  });

  it('Has list', function() {
    cy.visit('/');
    cy.get('.btn').contains('List').should('visible').click();

    cy.visible('Filename');
    cy.visible('Organism');
    cy.visible('Technology');
    cy.visible('Antibody');
    cy.visible('Date');
    cy.visible('Genotype');
  });
});
