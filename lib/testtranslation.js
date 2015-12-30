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

var str = "https://www.youtube.com/watch?v=TgqiSBxvdws";