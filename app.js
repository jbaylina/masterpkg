/*jslint node: true */
/* global __mods */
/* global __top */
'use strict';


var fs = require('fs');
var access = fs.createWriteStream('/console.log', { flags: 'a' });

process.stdout.pipe(access);
process.stderr.pipe(access);

var path = require('path');
global.__top = process.cwd();
global.__mods = {};

// Load all mods
fs.readdirSync(path.join(__top, "master_modules")).forEach(function(module) {
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
