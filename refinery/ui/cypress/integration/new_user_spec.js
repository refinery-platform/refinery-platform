function visible(text) {
  return cy.contains(text).should('visible');
}

function django_shell(cmd) {
  function quote(str) {
    return "'" + str.replace(/'/g, "'\"'\"'") + "'";
  }

  var manage_cmd = "echo " + quote(cmd) + " | ./manage.py shell_plus";
  var cd_cmd = "cd .. && " + manage_cmd;
  var workon_cmd = "workon refinery-platform && " + manage_cmd;
  var vagrant_cmd = 'vagrant ssh -c ' + quote(workon_cmd);
  cy.exec('( ' + cd_cmd + ' ) || ( ' + vagrant_cmd + ' )')
}

describe('New user', function() {
  it('Account creation works', function() {
    cy.visit('/accounts/register/');

    visible('Sign Up');
    visible('Register for an account');
    visible('Indicates a required field');

    cy.get('.btn').contains('Register').should('visible').click();

    visible('Please correct the errors below.');

    var username = 'cypress_' + Date.now();
    var password = 'password';
    cy.get('#id_username').type(username);
    cy.get('#id_first_name').type('first');
    cy.get('#id_last_name').type('last');
    cy.get('#id_affiliation').type('affiliation');
    cy.get('#id_email').type(username + '@example.com');
    cy.get('#id_password1').type(password);
    cy.get('#id_password2').type(password);

    cy.get('.btn').contains('Register').should('visible').click();

    visible('Registration complete');
    visible('Thank you for registering!');
    visible('Your account is currently pending approval.');

    django_shell(
        'from django.contrib.auth.models import User; ' +
        'u = User.objects.filter(username="' + username + '")[0]; ' +
        'u.is_active = True; ' +
        'u.save()'
    );

    visible('Login').click();
    cy.get('#id_username').type(username);
    cy.get('#id_password').type(password);
    cy.get('.btn').contains('Login').click();
    // At this point we are still on the "Thank you for registering" page.

    visible('first last')
  });
});