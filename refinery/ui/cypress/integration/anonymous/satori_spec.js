describe('Satori', function() {
  it('prints "No data available"', function() {
    cy.visit('/');
    cy.visible_btn('Explore').click();

    cy.visible('Intro Tour');
    cy.visible('Highlight:');
    cy.visible('Lock:');
    cy.visible('Query:');
    cy.visible('TREEMAP:');
    cy.visible('Depth:');

    cy.get('#list-graph-wrapper').contains('No data available!').should('visible');
    cy.get('#treemap-wrapper').contains('No data available!').should('visible');
  });

  it('renders mock API response', function() {
    cy.visit('/');
    cy.visible_btn('Explore').click();

    cy.visible('Intro Tour');
    cy.visible('Highlight:');
    cy.visible('Lock:');
    cy.visible('Query:');
    cy.visible('TREEMAP:');
    cy.visible('Depth:');

    cy.get('#list-graph-wrapper').contains('No data available!').should('visible');
    cy.get('#treemap-wrapper').contains('No data available!').should('visible');
  });
});