/*jslint node: true */

"use strict";

var path = require('path');
var fs = require('fs');
var async = require('async');
var bower = require('bower');
// var mainBowerFiles = require('main-bower-files');
var U=require("underscore");
var npm = require("npm");
var glob = require("glob");

var config=require('./core/config.js');

module.exports.generateBowers = function(cb) {
	var mainBower = {
		name: "master",
		dependencies: {}
	};
	async.each(Object.keys(config.masterModules), function(moduleName, cb) {
		var module = config.masterModules[moduleName];
		var bModuleName = "masterModule_" + moduleName;
		var jsonFile = path.join(module.dir, 'master.json');
		fs.exists(jsonFile, function(exists) {
			if (exists) {
				mainBower.dependencies[bModuleName]= module.dir;
				fs.readFile(jsonFile, function(err, contents) {
					if (err) return cb(err);
					var mMasterConfig;
					try {
						mMasterConfig = JSON.parse(contents);
					} catch (err2) {
						return cb(err2);
					}
					var mBowerConfig = {
						name: bModuleName,
						dependencies: mMasterConfig.bowerDependencies,
						ignore: ["*", "!bower.json"]
					};
					fs.writeFile(path.join(module.dir, "bower.json"), JSON.stringify(mBowerConfig, null, 1), cb);
				});
			} else {
				cb();
			}
		});

	}, function(err) {
		if (err) return (err);
		fs.writeFile(path.join(process.cwd(), "bower.json"), JSON.stringify(mainBower, null, 1), function(err) {
			if (err) return err;
			bower.commands.install().on('end', function(results) {
				cb();
			});
		});
	});
};


module.exports.generateNpmPackages = function(cb) {
	var mainNpm = {
		name: "master",
		dependencies: {}
	};
	async.each(Object.keys(config.masterModules), function(moduleName, cb) {
		var module = config.masterModules[moduleName];
		var jsonFile = path.join(module.dir, 'master.json');
		fs.exists(jsonFile, function(exists) {
			if (exists) {
				fs.readFile(jsonFile, function(err, contents) {
					if (err) return cb(err);
					var mMasterConfig;
					try {
						mMasterConfig = JSON.parse(contents);
					} catch (err2) {
						return cb(err2);
					}
					for (var d in mMasterConfig.npmDependencies) {
						mainNpm.dependencies[d] = mMasterConfig.npmDependencies[d];
					}
					cb();
				});
			} else {
				cb();
			}
		});

	}, function(err) {
		if (err) return (err);
		fs.readFile(path.join(process.cwd(), "master.json"), function(err, contents) {
			if (!err) {
					var mainConfig;
					try {
						mainConfig = JSON.parse(contents);
					} catch (err2) {
					}
					for (var d in mainConfig.npmDependencies) {
						mainNpm.dependencies[d] = mainConfig.npmDependencies[d];
					}
					mainNpm.version = mainConfig.version || "0.0.1";
					mainNpm.description = mainConfig.description || "";
					mainNpm.repository = mainConfig.repository || ".";
					mainNpm.license = mainConfig.license || "Private";
			}
			fs.writeFile(path.join(process.cwd(), "package.json"), JSON.stringify(mainNpm, null, 1), function(err) {
				if (err) return err;
				npm.load({}, function (err, npm) {
				  // use the npm object, now that it's loaded.
				  //
				  if (err) return cb(err);

				  npm.commands.install([], cb);
				});
			});
		});
	});

};



function ensureExists(path, mask, cb) {
    if (typeof mask == 'function') { // allow the `mask` parameter to be optional
        cb = mask;
        mask = '0777';
    }
    fs.mkdir(path, mask, function(err) {
        if (err) {
            if (err.code == 'EEXIST') cb(null); // ignore the error if the folder already exists
            else cb(err); // something else went wrong
        } else cb(null); // successfully created folder
    });
}

function getHeadBodyTemplates(cb) {
	var headTemplates = [];
	var bodyTemplates = [];
	async.each(Object.keys(config.masterModules), function(moduleName, cb) {
		var module = config.masterModules[moduleName];

		async.parallel([
			function(cb3) {
				var headFile=path.join(module.dir, "client", "head.jade");
				fs.exists(headFile , function(exist) {
					if (exist) {
						headTemplates.push(headFile);
					}
					cb3();
				});
			},
			function(cb3) {
				var bodyFile=path.join(module.dir, "client", "body.jade");
				fs.exists(bodyFile , function(exist) {
					if (exist) {
						bodyTemplates.push(bodyFile);
					}
					cb3();
				});
			},
		], cb);


	}, function(err) {
		if (err) return cb(err);
		cb(null, headTemplates, bodyTemplates);
	});
}

module.exports.generateIndexJade = function(cb) {
	var tmpPath = path.join(process.cwd(), "tmp");


	getHeadBodyTemplates(function(err, headTemplates, bodyTemplates) {
		if (err) return cb(err);

		var jsFiles = [];
		var cssFiles = [];

		var html = [];
		html.push("doctype html");
		html.push('html(lang="en")');
		html.push('\thead');
		headTemplates.forEach(function(f) {
			html.push("\t\tinclude "+path.relative(tmpPath, f));
		});
		html.push('\t\tlink(rel="stylesheet",href="app.css")');
		html.push("\tbody");
		bodyTemplates.forEach(function(f) {
			html.push("\t\tinclude "+path.relative(tmpPath, f));
		});
		html.push('\t\tscript(src="app.js")');
		html.push('');

		ensureExists(tmpPath, function(err) {
			if (err) return cb();
			fs.writeFile(path.join(tmpPath, "index.jade"), html.join("\n"), cb);
		});
	});
};

var quoteString = function(S) {
  return '"'+S.replace(/(["\s'$`\\])/g,'\\$1')+'"';
};


module.exports.generateRequiresModule = function(cb) {
	var output = "";
	async.each(Object.keys(config.masterModules), function(moduleName, cb) {
		var module = config.masterModules[moduleName];
		glob(path.join(process.cwd(), module.dir, 'client', '**', '*.js' ), {realpath:true, ignore: path.join(process.cwd(), module.dir, 'client', 'static', '**' ) }, function(err, files) {
			U.each(files, function(filename) {
				output += "require(" + quoteString(filename) +");\n";
			});
			cb();
		});
	}, function(err) {
		if (err) return cb(err);
		ensureExists(path.join(process.cwd(), "tmp"), function(err2) {
			fs.writeFile(path.join(process.cwd(), "tmp", "modules.js"), output, cb);
		});
	});
};


module.exports.generateClientConfigModule = function(cb) {
	ensureExists(path.join(process.cwd(), "tmp"), function(err) {
		if (err) return cb(err);
		fs.writeFile(path.join(process.cwd(), "tmp", "client_config.js"), "module.exports = " + JSON.stringify(config.clientConfig, null, 1) + ";\n", cb);
	});
};



