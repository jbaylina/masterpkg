/*jslint node: true */
/* global __mods */
'use strict';

process.env.TZ = 'UTC';

var fs = require('fs');
var _ = require('underscore');

process.chdir(__dirname);

/*
var access = fs.createWriteStream('/console.log', { flags: 'a' });

process.stdout.pipe(access);
process.stderr.pipe(access);
*/
var path = require('path');
global.__top = process.cwd();
global.__mods = {};

__mods.config = require("./core/config");
var config = __mods.config;

// Load all mods

_.each(config.masterModules, function(module, moduleName) {
	var filename = path.join(process.cwd(), module.dir, "server", "index.js");
    if (fs.existsSync(filename)) {
		__mods[moduleName] = require(filename);
	}
});

// Init all mods
for (var m in __mods) {
	if (  (__mods.hasOwnProperty(m))&&
		(typeof __mods[m] === "object")&&
		(typeof __mods[m].init === "function"))
	{
		__mods[m].init();
	}
}
