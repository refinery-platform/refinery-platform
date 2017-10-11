describe('Refinery', function() {
  it('Has a homepage', function() {
    cy.visit('http://192.168.50.50:8000/');
    cy.contains('Refinery');

    cy.contains('Collaboration');
    cy.contains('Statistics');
    cy.contains('About');

    cy.contains('Register');
    cy.contains('Login');

    cy.contains('Data Sets');
    cy.contains('List');
    cy.contains('Explore');
    cy.contains('Analyses');
    cy.contains('Workflows');

    cy.contains('No data sets available.');
    cy.contains('No analyses available.');
    cy.contains('No workflows available.');
  });
});
