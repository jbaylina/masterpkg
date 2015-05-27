/*jslint node: true */
/* global __mods */
/* global __top */
'use strict';

process.env.TZ = 'UTC';

var fs = require('fs');

process.chdir(__dirname);

/*
var access = fs.createWriteStream('/console.log', { flags: 'a' });

process.stdout.pipe(access);
process.stderr.pipe(access);
*/
var path = require('path');
global.__top = process.cwd();
global.__mods = {};



var masterConfigString = fs.readFileSync(path.join(__top, 'config.json'));
var masterConfig = JSON.parse(masterConfigString);
var modules = __mods.masterModules = masterConfig.masterModules;

__mods.config = require('./core/config');

// Load all mods
modules.forEach(function(module) {
	var filename = path.join(__top, "master_modules", module, "server", "index.js");
    if (fs.existsSync(filename)) {
		__mods[module] = require(filename);
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
