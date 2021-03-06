"use strict";

var api = require("./apiclient");
var utils = require("./utils");
var custom = require("./custom");
var perms = require("./permissions");
var validator = require("./validate");
var exec = require("child_process").exec;
var nicetime = require('./nicetime');
var chatHandlers = require('./genericcommands').chatHandlers;
var checkPerms = require('./genericcommands').checkPerms;

function handle(bot, username, msg, fromIRC) {
	var split = msg.split(" "),
        command = String(split.splice(0, 1)).substring(1).toLowerCase(),
        rest = split.join(" "),
        ctx = {
            bot: bot,
            answer: function (str) {
                bot.sendChatMsg(str);
            },
            isPrivate: false
        };
    
    bot.getPermissionData(fromIRC ? "justJanne" : username, function (award, rank) {
        if (chatHandlers[command]) {
            if (fromIRC) {
                var answer = checkPerms(bot, "justJanne", award, rank, command, false) || [false];
                if (answer[0]) {
                    return chatHandlers[command](ctx, username, rest, fromIRC);
                }
            } else {
                var answer2 = checkPerms(bot, username, award, rank, command, false) || [false];
                console.log()
                if (answer2[0]) {
                    return chatHandlers[command](ctx, username, rest, fromIRC);
                } else if (answer2[1]) {
                    answer2[1].forEach(function (e) {
                        bot.sendPM(username, e);
                    });
                } else {
                    bot.sendPM(username, "You don’t have the permissions to do that");
                }
            }
        }
    });

	// Goto custom commands if we can't find one here
	return custom.handle(bot, username, msg, fromIRC);
}

exports.handle = handle;