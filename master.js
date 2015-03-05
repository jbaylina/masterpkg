/*jslint node: true */
"use strict";

var argv = require('minimist')(process.argv.slice(2));
var gulp = require('gulp');
var gutil = require('gulp-util');
var chalk = require('chalk');
var prettyTime = require('pretty-hrtime');
var fs = require('fs');
var path = require('path');


require("./gulpfile.js");

function help() {
    console.log("master build");
}

// exit with 0 or 1
var failed = false;
process.once('exit', function(code) {
  if (code === 0 && failed) {
    process.exit(1);
  }
});

if (argv._.length === 0 ) {
    help();
    process.exit(0);
} else if (argv._[0] === "install") {
    installService();
} else {
    logEvents(gulp);
    gulp.start(argv._[0], function(err) {
        if (err) {
            console.log(err.stack);
            process.exit(1);
        }
    });
}


// format orchestrator errors
function formatError(e) {
  if (!e.err) {
    return e.message;
  }

  // PluginError
  if (typeof e.err.showStack === 'boolean') {
    return e.err.toString();
  }

  // normal error
  if (e.err.stack) {
    return e.err.stack;
  }

  // unknown (string, number, etc.)
  return new Error(String(e.err)).stack;
}

// Copied from main gulp binary.

function logEvents(gulpInst) {

  // total hack due to poor error management in orchestrator
  gulp.on('err', function () {
    failed = true;
  });

  gulp.on('task_start', function (e) {
    // TODO: batch these
    // so when 5 tasks start at once it only logs one time with all 5
    gutil.log('Starting', '\'' + chalk.cyan(e.task) + '\'...');
  });

  gulp.on('task_stop', function (e) {
    var time = prettyTime(e.hrDuration);
    gutil.log(
      'Finished', '\'' + chalk.cyan(e.task) + '\'',
      'after', chalk.magenta(time)
    );
  });

  gulp.on('task_err', function (e) {
    var msg = formatError(e);
    var time = prettyTime(e.hrDuration);
    gutil.log(
      '\'' + chalk.cyan(e.task) + '\'',
      chalk.red('errored after'),
      chalk.magenta(time)
    );
    gutil.log(msg);
  });

  gulp.on('task_not_found', function (err) {
    gutil.log(
      chalk.red('Task \'' + err.task + '\' is not in your gulpfile')
    );
    gutil.log('Please check the documentation for proper gulpfile formatting');
    process.exit(1);
  });
}

function installService() {

    var Service = require('node-windows').Service;

    var contents = fs.readFileSync(path.join(process.cwd(), 'master.json' ));
    var masterJson = JSON.stringify(contents);



    // Create a new service object
    var svc = new Service({
        name: masterJson.name,
        description: masterJson.description || masterJson.name,
        script: path.join(process.cwd(), 'app.js' )
    });

    // Listen for the "install" event, which indicates the
    // process is available as a service.
    svc.on('install',function(){
        console.log("Service installed");
    });

    svc.install();
}
