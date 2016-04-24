var repl = require('repl');
var util = require('util');

function start(client, options) {
  var server = repl.start(options);

  server.eval = (function(eval) {
    return function(cmd, context, filename, callback) {
      client.request('Runtime.evaluate', {
        expression: cmd,
      }, function(error, result, response) {
        if (error) {
          return callback(error);
        }

        if (response.wasThrown) {
          var recoverable = [].some(function(error) {
            return result.description.match(error);
          });

          if (recoverable) {
            return eval.call(server, cmd, context, filename, callback);
          }

          return callback(result.value || result.description);
        }

        callback(null, result);
      });
    };
  }(server.eval));

  server.writer = function(object, depth) {
    return object.value || object.description;
  };

  server.complete = (function(complete) {
    return function(line, callback) {
      if (/^\./.test(line)) {
        return complete.call(server, line, callback);
      }

      callback(null, []);
    };
  }(server.complete));

  if (client.socket) {
    client.request('Console.enable');
    client.request('Runtime.enable');
  }

  client.on('ready', function() {
    client.request('Console.enable');
    client.request('Runtime.enable');
  });

  client.on('data', function(response) {
    if (response.method === 'Console.messageAdded') {
      var message = response.params.message;
      var parameters = message.parameters.map(function(parameter) {
        return server.writer(parameter);
      });

      server.output.write(util.format.apply(null, parameters) + '\n');
    }
  });

  return server;
}

module.exports = start;
