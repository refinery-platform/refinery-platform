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
    (text) => {
      cy.contains(text).should('visible')
    }
);


Cypress.Commands.add('django_shell',
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
);