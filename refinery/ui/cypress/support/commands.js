// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This is will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })


Cypress.Commands.add('visible',
  function(text) {
    return cy.contains(text).should('visible')
  }
);

Cypress.Commands.add('visible_btn',
  function(text) {
    // Often there are other elements on the page that will match just the text,
    // but constraining it to ".btn" will find the right one.
    return cy.get('.btn').contains(text).should('visible');
  }
);


Cypress.Commands.add('django_shell',
  function(cmd) {
    function quote(str) {
      return "'" + str.replace(/'/g, "'\"'\"'") + "'";
    }

    var manage_cmd = "echo " + quote(cmd) + " | ./manage.py shell";
    var cd_cmd = "cd .. && " + manage_cmd;
    var workon_cmd = "workon refinery-platform && " + manage_cmd;
    var vagrant_cmd = 'vagrant ssh -c ' + quote(workon_cmd);
    cy.exec('( ' + cd_cmd + ' ) || ( ' + vagrant_cmd + ' )')
  }
);

Cypress.Commands.add('login_guest',
  // TODO: Figure out how to POST with CSRF tocken?
  function(next) {
    cy.visit('/accounts/login/?next=' + ( next || '/') );
    cy.get('#id_username').type('guest');
    cy.get('#id_password').type('guest');
    cy.visible_btn('Login').click();
  }
);