var rdbgp = require('rdbgp');
var repl = require('..');

var client = rdbgp.connect({
  port: 9222,
});

var server = repl(client);
