function visible(text) {
  return cy.contains(text).should('visible');
}

describe('Not logged in', function() {
  it('Has homepage', function() {
    cy.visit('/');
    visible('Refinery');

    visible('Collaboration');
    visible('Statistics');
    visible('About');

    visible('Register');
    visible('Login');

    visible('Launch Pad');

    visible('Data Sets');
    visible('Analyses');
    visible('Workflows');

    visible('No data sets available.');
    visible('No analyses available.');
    visible('No workflows available.');

    cy.get('#global-analysis-status').should('visible').click();
    visible('Recent Analyses');
    visible('No analyses performed.');
  });

  it('Has statistics', function() {
    cy.visit('/');
    visible('Statistics').click();

    visible('Statistics');

    visible('Users');
    visible('Groups');
    visible('Files');
    visible('Data Sets');
    visible('Workflows');
    visible('Projects');
  });

  it('Has about', function() {
    cy.visit('/');
    visible('About').click();

    visible('About Refinery');

    visible('Background');
    visible('Contact');
    visible('Funding');
    visible('Most Recent Code for this Instance');
    visible('Team');
  });

  it('Has explore', function() {
    cy.visit('/');
    cy.get('.btn').contains('Explore').should('visible').click();

    visible('Intro Tour');
    visible('Highlight:');
    visible('Lock:');
    visible('Query:');
    visible('TREEMAP:');
    visible('Depth:');

    cy.get('#list-graph-wrapper').contains('No data available!').should('visible');
    cy.get('#treemap-wrapper').contains('No data available!').should('visible');
  });

  it('Has list', function() {
    cy.visit('/');
    cy.get('.btn').contains('List').should('visible').click();

    visible('Filename');
    visible('Organism');
    visible('Technology');
    visible('Antibody');
    visible('Date');
    visible('Genotype');
  });
});
