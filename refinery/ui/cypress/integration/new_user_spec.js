function visible(text) {
  return cy.contains(text).should('visible');
}

describe('New user', function() {
  it('Account creation works', function() {
    cy.visit('/');
    visible('Register').click();

    visible('Sign Up');
    visible('Register for an account');
    visible('Indicates a required field');

    cy.get('.btn').contains('Register').should('visible').click();

    visible('Please correct the errors below.');

    var timestamp = Date.now();
    cy.get('#id_username').type('cypress_' + timestamp);
    cy.get('#id_first_name').type('first');
    cy.get('#id_last_name').type('last');
    cy.get('#id_affiliation').type('affiliation');
    cy.get('#id_email').type('cypress_' + timestamp + '@example.com');
    cy.get('#id_password1').type('password');
    cy.get('#id_password2').type('password');

    cy.get('.btn').contains('Register').should('visible').click();

    visible('Registration complete');
    visible('Thank you for registering!');
    visible('Your account is currently pending approval.');
  });
});