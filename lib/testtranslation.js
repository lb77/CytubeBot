/// <reference path="typings/node/node.d.ts"/>
"use strict";

var api = require("./apiclient");
var utils = require("./utils");
var custom = require("./custom");
var perms = require("./permissions");
var validator = require("./validate");
var exec = require("child_process").exec;
var nicetime = require("./nicetime");
var moment = require("moment");
require("moment-duration-format");
var request = require('request');

var url = "https://drive.google.com/file/d/0B1LZ7QBn8Gk1RE44dllFZjBreEU/view";

console.log(utils.handle(this, "parseMediaLink", url));