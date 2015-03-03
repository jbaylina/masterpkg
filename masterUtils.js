/*jslint node: true */
/*global __top */
"use strict";

var path = require('path');
var fs = require('fs');
var async = require('async');
var bower = require('bower');
// var mainBowerFiles = require('main-bower-files');
var U=require("underscore");
var npm = require("npm");

global.__top =  process.cwd();

module.exports.generateBowers = function(cb) {
	var modulesPath = path.join(__top, 'master_modules');

	fs.readdir(modulesPath, function(err, modules) {
		if (err) return cb(err);
		var mainBower = {
			name: "master",
			dependencies: {}
		};
		async.each(modules, function(module, cb2) {
			var jsonFile = path.join(modulesPath, module, 'master.json');
			fs.exists(jsonFile, function(exists) {
				if (exists) {
					mainBower.dependencies["masterModule_"+module]= path.join(modulesPath, module);
					fs.readFile(jsonFile, function(err, contents) {
						if (err) return cb2(err);
						var mMasterConfig;
						try {
							mMasterConfig = JSON.parse(contents);
						} catch (err2) {
							return cb2(err2);
						}
						var mBowerConfig = {
							name: "masterModule_"+module,
							dependencies: mMasterConfig.bowerDependencies,
							ignore: ["*", "!bower.json"]
						};
						fs.writeFile(path.join(modulesPath, module, "bower.json"), JSON.stringify(mBowerConfig, null, 1), cb2);
					});
				} else {
					cb2();
				}
			});

		}, function(err) {
			if (err) return (err);
			fs.writeFile(path.join(__top, "bower.json"), JSON.stringify(mainBower, null, 1), function(err) {
				if (err) return err;
				bower.commands.install().on('end', function(results) {
					cb();
				});
			});
		});
	});
};

module.exports.generateNpmPackagesOld = function(cb) {
	var modulesPath = path.join(__top, 'master_modules');

	fs.readdir(modulesPath, function(err, modules) {
		if (err) return cb(err);
		var mainNpm = {
			name: "master",
			dependencies: {}
		};
		async.each(modules, function(module, cb2) {
			var jsonFile = path.join(modulesPath, module, 'master.json');
			fs.exists(jsonFile, function(exists) {
				if (exists) {
					mainNpm.dependencies["masterModule_"+module]= "file:" + path.join(modulesPath, module);
					fs.readFile(jsonFile, function(err, contents) {
						if (err) return cb2(err);
						var mMasterConfig;
						try {
							mMasterConfig = JSON.parse(contents);
						} catch (err2) {
							return cb2(err2);
						}
						var mNpmConfig = {
							name: "masterModule_"+module,
							version: mMasterConfig.version || "0.0.1",
							dependencies: mMasterConfig.npmDependencies,
							ignore: ["*", "!package.json"]
						};
						fs.writeFile(path.join(modulesPath, module, "package.json"), JSON.stringify(mNpmConfig, null, 1), function(err) {
							if (err) return cb2(err);
							fs.writeFile(path.join(modulesPath, module, ".npmignore"), "*\n!package.json\n", cb2);
						});
					});
				} else {
					cb2();
				}
			});

		}, function(err) {
			if (err) return (err);
			fs.readFile(path.join(__top, "master.json"), function(err, contents) {
				if (!err) {
						var mainConfig;
						try {
							mainConfig = JSON.parse(contents);
						} catch (err2) {
						}
						for (var d in mainConfig.npmDependencies) {
							mainNpm.dependencies[d] = mainConfig.npmDependencies[d];
						}
						mainNpm . version = mainConfig.version || "0.0.1";
				}
				fs.writeFile(path.join(__top, "package.json"), JSON.stringify(mainNpm, null, 1), function(err) {
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
	});
};

module.exports.generateNpmPackages = function(cb) {
	var modulesPath = path.join(__top, 'master_modules');

	fs.readdir(modulesPath, function(err, modules) {
		if (err) return cb(err);
		var mainNpm = {
			name: "master",
			dependencies: {}
		};
		async.each(modules, function(module, cb2) {
			var jsonFile = path.join(modulesPath, module, 'master.json');
			fs.exists(jsonFile, function(exists) {
				if (exists) {
					fs.readFile(jsonFile, function(err, contents) {
						if (err) return cb2(err);
						var mMasterConfig;
						try {
							mMasterConfig = JSON.parse(contents);
						} catch (err2) {
							return cb2(err2);
						}
						for (var d in mMasterConfig.npmDependencies) {
							mainNpm.dependencies[d] = mMasterConfig.npmDependencies[d];
						}
						cb2();
					});
				} else {
					cb2();
				}
			});

		}, function(err) {
			if (err) return (err);
			fs.readFile(path.join(__top, "master.json"), function(err, contents) {
				if (!err) {
						var mainConfig;
						try {
							mainConfig = JSON.parse(contents);
						} catch (err2) {
						}
						for (var d in mainConfig.npmDependencies) {
							mainNpm.dependencies[d] = mainConfig.npmDependencies[d];
						}
						mainNpm . version = mainConfig.version || "0.0.1";
				}
				fs.writeFile(path.join(__top, "package.json"), JSON.stringify(mainNpm, null, 1), function(err) {
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
	var modulesPath = path.join(__top, 'master_modules');
	fs.readdir(modulesPath, function(err, modules) {
		if (err) return cb(err);
		async.each(modules, function(module, cb2) {

			async.parallel([
				function(cb3) {
					var headFile=path.join(modulesPath, module, "client", "head.jade");
					fs.exists(headFile , function(exist) {
						if (exist) {
							headTemplates.push(headFile);
						}
						cb3();
					});
				},
				function(cb3) {
					var bodyFile=path.join(modulesPath, module, "client", "body.jade");
					fs.exists(bodyFile , function(exist) {
						if (exist) {
							bodyTemplates.push(bodyFile);
						}
						cb3();
					});
				},
			], cb2);


		}, function(err) {
			if (err) return cb(err);
			cb(null, headTemplates, bodyTemplates);
		});
	});

}

module.exports.generateIndexJade = function(cb) {
	var tmpPath = path.join(__top, "tmp");


	getHeadBodyTemplates(function(err, headTemplates, bodyTemplates) {
		if (err) return cb(err);

//		var files = mainBowerFiles({});
		var jsFiles = [];
		var cssFiles = [];
/*		files.forEach(function(f) {
			var ext = path.extname(f);
			if (ext==='.js') {
				jsFiles.push(f);
			} else if (ext==='.css') {
				cssFiles.push(f);
			}
		});
*/
		var html = [];
		html.push("doctype html");
		html.push('html(ng-app="app", lang="en")');
		html.push('\thead');
/*		cssFiles.forEach(function(f) {
			var relf = path.relative(topPath, f);
			html.push('\t\tlink(rel="stylesheet",href="'+ relf +'")');
		});
*/		headTemplates.forEach(function(f) {
			html.push("\t\tinclude "+path.relative(tmpPath, f));
		});
		html.push('\t\tlink(rel="stylesheet",href="app.css")');
		html.push("\tbody");
		bodyTemplates.forEach(function(f) {
			html.push("\t\tinclude "+path.relative(tmpPath, f));
		});
/*		jsFiles.forEach(function(f) {
			var relf = path.relative(topPath, f);
			html.push('\t\tscript(src="'+ relf +'")');
		});
*/		html.push('\t\tscript(src="app.js")');
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
	var modulesPath = path.join(__top, 'master_modules');
	var output = "";
	fs.readdir(modulesPath, function(err, modules) {
		if (err) return cb(err);
		async.each(modules, function(module, cb2) {
			var indexName = path.join(__top, 'master_modules', module, 'client', 'index.js');
			fs.exists(indexName, function(exists) {
				if (exists) {
					output += "module.exports." + module + "= require(" + quoteString(indexName) +");\n";
				}
				cb2();
			});
		}, function(err) {
			if (err) return cb(err);
			ensureExists(path.join(__top, "tmp"), function(err2) {
				if (err) return cb(err);
				fs.writeFile(path.join(__top, "tmp", "modules.js"), output, cb);
			});
		});
	});
};

function getModuleClientConfig(module, cb2) {
	var clientConfig = {};
	var masterJsonFile = path.join(__top, 'master_modules', module, 'master.json');
	fs.exists(masterJsonFile, function(exists) {
		if (exists) {
			fs.readFile(masterJsonFile, function(err, data) {
				if (err) return cb2(err);
				var masterJson;
				try {
					masterJson = JSON.parse(data);
				} catch (err) {
					return cb2(err);
				}
				if (masterJson.commonConfig) {
					U.extend(clientConfig, masterJson.commonConfig);
				}
				if (masterJson.clientConfig) {
					U.extend(clientConfig, masterJson.clientConfig);
				}
				cb2(null,clientConfig);
			});
		} else {
			cb2(null, clientConfig);
		}
	});
}

function getModulesClientConfig(cb) {
	var modulesPath = path.join(__top, 'master_modules');
	var clientConfig = {};
	fs.readdir(modulesPath, function(err, modules) {
		if (err) return cb(err);
		async.each(modules, function(module, cb2) {
			getModuleClientConfig(module, function(err, conf) {
				if (err) return cb2(err);
				U.extend(clientConfig, conf);
				cb2();
			});
		}, function(err) {
			if (err) return cb(err);
			cb(null, clientConfig);
		});
	});
}

function getProjectClientConfig(cb) {
	var clientConfig = {};
	fs.readFile(path.join(__top, 'master.json' ), function(err, data) {
		if (err) return cb(null, {});
		var masterJson;
		try {
			masterJson = JSON.parse(data);
		} catch (err) {
			return cb(null, {});
		}
		if (masterJson.commonConfig) {
			U.extend(clientConfig, masterJson.commonConfig);
		}
		if (masterJson.clientConfig) {
			U.extend(clientConfig, masterJson.clientConfig);
		}
		cb(null, clientConfig);
	});
}

module.exports.generateClientConfigModule = function(cb) {
	var clientConfig = {};
	async.series([function(cb2) {
		getModulesClientConfig(function(err, conf) {
			if (err) return cb2(err);
			U.extend(clientConfig, conf);
			cb2();
		});
	}, function(cb2) {
		getProjectClientConfig(function(err, conf) {
			if (err) return cb2(err);
			U.extend(clientConfig, conf);
			cb2();
		});
	}], function(err) {
		if (err) return cb(err);
		ensureExists(path.join(__top, "tmp"), function(err2) {
			if (err) return cb(err);
			fs.writeFile(path.join(__top, "tmp", "client_config.js"), "module.exports = " + JSON.stringify(clientConfig, null, 1) + ";\n", cb);
		});
	});


};

module.exports.getGulpConfig = function() {
	var masterJsonFile = path.join(__top, 'master.json');
	var gulpConfig = {};
	if (fs.existsSync(masterJsonFile)) {
		var masterConfigString = fs.readFileSync(masterJsonFile);
		var masterConfig = JSON.parse(masterConfigString);
		U.extend(gulpConfig, masterConfig.gulpConfig);
	}
	return gulpConfig;
};


