describe('New user', function() {
  var username;
  before(function() {
    username = 'cypress_' + Date.now();
  });

  it('Account creation works', function() {
    cy.visit('/accounts/register/');

    cy.visible('Sign Up');
    cy.visible('Register for an account');
    cy.visible('Indicates a required field');

    cy.visible_btn('Register').click();

    cy.visible('Please correct the errors below.');

    var password = 'password';
    cy.get('#id_username').type(username);
    cy.get('#id_first_name').type('first');
    cy.get('#id_last_name').type('last');
    cy.get('#id_affiliation').type('affiliation');
    cy.get('#id_email').type(username + '@example.com');
    cy.get('#id_password1').type(password);
    cy.get('#id_password2').type(password);

    cy.visible_btn('Register').click();

    cy.visible('Registration complete');
    cy.visible('Thank you for registering!');
    cy.visible('Your account is currently pending approval.');

    cy.django_shell(
        'from django.contrib.auth.models import User; ' +
        'u = User.objects.get(username="' + username + '"); ' +
        'u.is_active = True; ' +
        'u.save()'
    );

    cy.visible('Login').click();
    cy.get('#id_username').type(username);
    cy.get('#id_password').type(password);
    cy.visible_btn('Login').click();
    // At this point we are still on the "Thank you for registering" page.

    cy.visible('first last');
  });

  after(function() {
    cy.django_shell(
        'from django.contrib.auth.models import User; ' +
        'User.objects.get(username="' + username + '").delete()'
    );
  });
});