Cypress.Commands.add('invisible',
  {
    prevSubject: 'optional'
  },
  function(subject, text) {
    var start = subject ? cy.wrap(subject) : cy;
    return start.contains(text).should('not.visible')
  }
);

Cypress.Commands.add('visible',
  {
    prevSubject: 'optional'
  },
  function(subject, text) {
    var start = subject ? cy.wrap(subject) : cy;
    return start.contains(text).should('visible')
  }
);

Cypress.Commands.add('visible_btn',
  {
    prevSubject: 'optional'
  },
  function(subject, text) {
    // Often there are other elements on the page that will match just the text,
    // but constraining it to ".btn" will find the right one.
    var start = subject ? cy.wrap(subject) : cy;
    return start.get('.btn').contains(text).should('visible');
  }
);

function shell_quote(str) {
  return "'" + str.replace(/'/g, "'\"'\"'") + "'";
}

Cypress.Commands.add('wrap_cmd',
  function(manage_cmd) {
    var cd_cmd = "cd .. && " + manage_cmd;
    var workon_cmd = "workon refinery-platform && " + manage_cmd;
    var vagrant_cmd = 'vagrant ssh -c ' + shell_quote(workon_cmd);
    return cy.exec('( ' + cd_cmd + ' ) || ( ' + vagrant_cmd + ' )')
  }
);

Cypress.Commands.add('django_manage',
  function(tool) {
    var manage_cmd = "./manage.py " + tool;
    return cy.wrap_cmd(manage_cmd);
  }
);

Cypress.Commands.add('django_shell',
  function(cmd) {
    var manage_cmd = "echo " + shell_quote(cmd) + " | ./manage.py shell";
    return cy.wrap_cmd(manage_cmd);
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