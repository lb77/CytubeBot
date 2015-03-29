"use strict";

var api = require("./apiclient");
var utils = require("./utils");
var custom = require("./custom");
var perms = require("./permissions");
var validator = require("./validate");
var exec = require("child_process").exec;
var nicetime = require('./nicetime');
var chatHandlers = require('./genericcommands').chatHandlers;

function handle(bot, username, msg, fromIRC) {
	var split = msg.split(" "),
        command = String(split.splice(0, 1)).substring(1),
        rest = split.join(" "),
        ctx = {
            bot: bot,
            answer: function (str) {
                bot.sendPM(username, str);
            },
            isPrivate: true
        };

	if (chatHandlers[command]) {
		return chatHandlers[command](ctx, username, rest, fromIRC);
    }

	// Goto custom commands if we can't find one here
	return custom.handle(bot, username, msg, fromIRC);
}

exports.handle = handle;