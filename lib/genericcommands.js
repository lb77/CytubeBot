"use strict";

var api = require("./apiclient");
var utils = require("./utils");
var custom = require("./custom");
var perms = require("./permissions");
var validator = require("./validate");
var exec = require("child_process").exec;
var nicetime = require("./nicetime");
var request = require('request');

function numberWithCommas(x) {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
    return parts.join(".");
}

function isNumber(o) {
    return !isNaN(o - 0) && (o !== null && (o !== "" && o !== false));
}

var lastEmbed = {
};

var lastBigEmbed = {
};

var embedTimes = [
    0,
    0,
    30 * 60 * 1000,
    15 * 60 * 1000,
    5 * 60 * 1000
];

var bigEmbedTimes = [
    0,
    0,
    0,
    30 * 60 * 1000,
    15 * 60 * 1000
];

var chatHandlers = {
    "add": function (ctx, username, data, fromIRC) {
        if (fromIRC || !data) {
            return;
        }
        ctx.bot.checkPermission(username, 2, "A", function (hasPermission) {
            if (!hasPermission) {
                return;
            }
            var vidList = [],
                pos = "end",
                splitData = data.split(/\s+/g),
                addFun = function (vid, pos) {
                    if (vid.type === "yt" && ctx.bot.youtubeapi) {
                        validator.validate(ctx.bot, vid.id, vid.type, null, function (unplayable) {
                            if (unplayable) {
                                return;
                            } else {
                                ctx.bot.addVideo(null, null, null, null, pos, vid);
                            }
                        });
                    } else {
                        ctx.bot.addVideo(null, null, null, null, pos, vid);
                    }
                };
            if (splitData.length === 2) {
                if (splitData[splitData.length - 1] === "next") {
                    pos = "next";
                    splitData.splice(splitData.length - 1, 1);
                    data = splitData.join("");
                }
            }
            addFun(utils.handle(ctx.bot, "parseMediaLink", data), pos);
        });
    },
    "addrandom": function (ctx, username, data, fromIRC) {
        if (fromIRC) {
            return;
        }
        ctx.bot.checkAward(username, 2, 2, function (hasPermission) {
            if (hasPermission && (data <= 20 && 1 <= data)) {
                ctx.bot.addRandomVideos(data);
            }
        });
    },
    "ban": function (ctx, username, data, fromIRC) {
        if (!data || fromIRC) {
            return;
        }
        ctx.bot.checkPermission(username, 2, "N", function (hasPermission) {
            if (!hasPermission) {
                return;
            }
            if (username.toLowerCase() === data.split(/\s+/g)[0].toLowerCase()) {
                return;
            }
            ctx.answer("/ban " + data, true);
        });
    },
    "blacklist": function (ctx, username, data, fromIRC) {
        if (fromIRC) {
            return;
        }
        ctx.bot.checkPermission(username, 3, null, function (hasPermission) {
            if (!hasPermission) {
                return;
            }
            ctx.bot.blacklistVideo();
        });
    },
    "blacklistedusers": function (ctx) {
        ctx.bot.listBlacklistedUsers();
    },
    "blacklistuser": function (ctx, username, data, fromIRC) {
        if (typeof data === "undefined" || fromIRC) {
            return;
        }
        ctx.bot.checkPermission(username, 3, null, function (hasPermission) {
            if (!hasPermission) {
                return;
            }
            var match = data.match(/(\w*) (true|false)/),
                user = match[1],
                flag = match[2];
            if (!match) {
                return;
            }
            if (user === ctx.bot.username) {
                return;
            }
            if (flag === "true") {
                flag = true;
            } else {
                flag = false;
            }
            ctx.bot.blacklistUser(user, flag);
        });
    },
    "blockedusers": function (ctx) {
        ctx.bot.listBlockedUsers();
    },
    "blockuser": function (ctx, username, data, fromIRC) {
        if (fromIRC || !data) {
            return;
        }
        ctx.bot.checkPermission(username, 3, null, function (hasPermission) {
            if (!hasPermission) {
                return;
            }
            var match = data.match(/(\w*) (true|false)/),
                user = match[1],
                flag = match[2];
            if (!match) {
                return;
            }
            if (user === ctx.bot.username) {
                return;
            }
            if (flag === "true") {
                flag = true;
            } else {
                flag = false;
            }
            ctx.bot.blockUser(user, flag);
        });
    },
    "bump": function (ctx, username, data, fromIRC) {
        if (fromIRC || !data) {
            return;
        }
        ctx.bot.checkAward(username, 4, 2, function (hasPermission) {
            if (!hasPermission) {
                return;
            }
            var bumpData = utils.handle(ctx.bot, "parseBumpData", data);
            if (!bumpData) {
                return;
            }
            utils.handle(ctx.bot, "genericUIDLoop", bumpData);
        });
    },
    "checkplaylist": function (ctx) {
        ctx.bot.checkPlaylist();
    },
    "choose": function (ctx, username, data) {
        if (!data) {
            return;
        }
        var choices = data.trim().split(/\s+/g),
            choice = choices[Math.floor(Math.random() * choices.length)];
        ctx.answer("[Choose: " + choices.join(" ") + "] " + choice);
    },
    "clearchat": function (ctx, username, data, fromIRC) {
        if (fromIRC) {
            return;
        }
        ctx.bot.checkPermission(username, 2, "M", function (hasPermission) {
            if (!hasPermission) {
                return;
            }
            ctx.answer("/clear", true);
        });
    },
    "currenttime": function (ctx) {
        var currentTime = Math.round(ctx.bot.leaderData.currentTime);
        ctx.answer("Current Time: " + currentTime);
    },
    "user": function (ctx, username, data) {
        if (ctx.isPrivate && username.toLowerCase() === "janne") {
            var users = ctx.bot.userlist.filter(function (n) {return n.name.toLowerCase() === data.trim().toLowerCase(); });
            var user = users[0] || "No User found";
            console.log(user);
            ctx.answer(user);
        } else {
            ctx.bot.sendPM(username, "You have no permission to do that");
        }
    },
    "delete": function (ctx, username, data, fromIRC) {
        if (fromIRC) {
            return;
        }
        data = {
            userData: data,
            username: username
        };
        ctx.bot.checkPermission(username, 2, "D", function (hasPermission) {
            var deleteData = utils.handle(ctx.bot, "parseDeleteData", data);
            if (username.toLowerCase() === deleteData.name.toLowerCase()) {
                utils.handle(ctx.bot, "genericUIDLoop", deleteData);
            } else {
                if (hasPermission) {
                    utils.handle(ctx.bot, "genericUIDLoop", deleteData);
                }
            }
        });
    },
    "deletevideos": function (ctx, username, data, fromIRC) {
        if (fromIRC) {
            return;
        }
        ctx.bot.checkPermission(username, 5, null, function (hasPermission) {
            if (!hasPermission) {
                return;
            }
            ctx.bot.deleteVideosFromDatabase(data);
        });
    },
    "disallow": function (ctx, username, data, fromIRC) {
        if (!data || fromIRC) {
            return;
        }
        ctx.bot.checkPermission(username, 2, "M", function (hasPermission) {
            if (!hasPermission) {
                return;
            }
            var match = data.match(/(\w*)/),
                user = match[1].toLowerCase(),
                caller = utils.handle(ctx.bot, "getUser", username);
            if (!match) {
                return;
            }
            if (user === ctx.bot.username) {
                return;
            }
            var postUserRank = function (rank) {
                ctx.bot.checkPermission(user, 2, "M", function (userAlsoHasPermission) {
                    var lesserOrEqualUser = user && caller.rank <= rank;
                    if (lesserOrEqualUser && !userAlsoHasPermission) {
                        return ctx.bot.disallowUser(user, true);
                    } else {
                        if (lesserOrEqualUser && userAlsoHasPermission) {
                            return;
                        }
                    }
                    return ctx.bot.disallowUser(user, true);
                });
            };
            ctx.bot.db.getUserRank(user, postUserRank);
        });
    },
    "duplicates": function (ctx, username, data, fromIRC) {
        if (fromIRC || ctx.bot.playlist.length === 0) {
            return;
        }
        ctx.bot.checkPermission(username, 2, "D", function (hasPermission) {
            if (!hasPermission) {
                return;
            }
            var lookedUp = [],
                numDeleted = 0,
                inLookedUp = function (vid) {
                    var k;
                    for (k = 0; k < lookedUp.length; k += 1) {
                        if (lookedUp[k].id === vid.media.id && lookedUp[k].type === vid.media.type) {
                            return true;
                        }
                    }
                    return false;
                },
                duplicateUIDs = ctx.bot.playlist.map(function (video) {
                    if (inLookedUp(video)) {
                        return video.uid;
                    } else {
                        lookedUp.push({
                            id: video.media.id,
                            type: video.media.type
                        });
                    }
                });
            duplicateUIDs.forEach(function (vid, index) {
                numDeleted += 1;
                if (typeof duplicateUIDs[index] === "undefined") {
                    numDeleted -= 1;
                    return duplicateUIDs.splice(index, 1);
                }
            });

            utils.handle(ctx.bot, "genericUIDLoop", {
                "kind": "deleteVideo",
                "num": "all",
                "uids": duplicateUIDs.reverse()
            });
            ctx.answer("Deleted: " + numDeleted);
        });
    },
    "emotes": function (ctx) {
        if (!ctx.bot.enableWebServer) {
            return ctx.answer("WebServer not enabled");
        }
        ctx.answer(ctx.bot.webURL + ":" + ctx.bot.webPort + "/emotes");
    },
    "forecast": function (ctx, username, data) {
        if (ctx.bot.muted || (!ctx.bot.weatherunderground || !data)) {
            return;
        }
        var now = Date.now(),
            waitTime = (ctx.bot.weatherLimiter.curIntervalStart + ctx.bot.weatherLimiter.tokenBucket.interval - now) / 1E3;
        if (ctx.bot.weatherLimiter.getTokensRemaining() < 1) {
            ctx.bot.sendPM(username, "Too many requests sent. Available in: " + waitTime + " seconds");
            return;
        }
        var tomorrow = data.match("tomorrow");
        if (tomorrow) {
            data = data.replace(/tomorrow/ig, "");
        }
        var postAPI = function (resp) {
            var parsedJSON = JSON.parse(resp);
            if (parsedJSON.response.error || parsedJSON.response.results) {
                return ctx.bot.sendPM(username, "Error");
            }
            var forecastData = {
                    json: parsedJSON,
                    tomorrow: tomorrow
                },
                forecastStrings = utils.handle(ctx.bot, "parseForecastData", forecastData);
            
            forecastStrings.forEach(function (string) {
                ctx.answer(string);
            });
        };
        ctx.bot.weatherLimiter.removeTokens(1, function () {
            api.APICall(data, "forecast", ctx.bot.weatherunderground, postAPI);
        });
    },
    "help": function (ctx, username) {
        ctx.bot.sendPM(username, "https://github.com/nuclearace/CytubeBot/blob/master/README.md#commands");
    },
    "internals": function (ctx) {
        if (!ctx.bot.enableWebServer) {
            return ctx.answer("WebServer not enabled");
        }
        ctx.answer(ctx.bot.webURL + ":" + ctx.bot.webPort + "/internals");
    },
    "ipban": function (ctx, username, data, fromIRC) {
        if (!data || fromIRC) {
            return;
        }
        ctx.bot.checkPermission(username, 2, "N", function (hasPermission) {
            if (!hasPermission) {
                return;
            }
            if (username.toLowerCase() === data.toLowerCase()) {
                return;
            }
            ctx.answer("/ipban " + data, true);
        });
    },
    "kick": function (ctx, username, data, fromIRC) {
        if (!data || fromIRC) {
            return;
        }
        ctx.bot.checkPermission(username, 2, "I", function (hasPermission) {
            if (!hasPermission) {
                return;
            }
            ctx.answer("/kick " + data, true);
        });
    },
    "listpermissions": function (ctx, username, data) {
        var name;
        if (!data) {
            name = username;
        } else {
            name = data;
        }
        perms.handle(ctx.bot, "sendHybridModPermissions", name.toLowerCase());
    },
    "management": function (ctx, username, data, fromIRC) {
        if (fromIRC) {
            return;
        }
        ctx.bot.checkPermission(username, 2, "G", function (hasPermission) {
            if (hasPermission && data.indexOf("on") !== -1) {
                ctx.bot.logger.syslog.log("!~~~! Bot is now managing the playlist");
                ctx.bot.stats.managing = true;
                ctx.bot.writePersistentSettings();
            } else {
                if (hasPermission && data.indexOf("off") !== -1) {
                    ctx.bot.logger.syslog.log("!~~~! The bot is no longer managing the playlist");
                    ctx.bot.stats.managing = false;
                    ctx.bot.writePersistentSettings();
                }
            }
            if (ctx.bot.playlist.length === 0 && ctx.bot.stats.managing) {
                ctx.bot.addRandomVideos();
            }
        });
    },
    "mute": function (ctx, username, data, fromIRC) {
        if (fromIRC) {
            return;
        }
        ctx.bot.checkPermission(username, 2, "M", function (hasPermission) {
            if (hasPermission && !ctx.bot.stats.muted) {
                ctx.bot.stats.muted = !ctx.bot.stats.muted;
                ctx.bot.logger.syslog.log("!~~~! " + username + " muted bot");
                ctx.bot.writePersistentSettings();
            }
        });
    },
    "unmute": function (ctx, username, data, fromIRC) {
        if (fromIRC) {
            return;
        }
        ctx.bot.checkPermission(username, 2, "M", function (hasPermission) {
            if (hasPermission && ctx.bot.stats.muted) {
                ctx.bot.stats.muted = !ctx.bot.stats.muted;
                ctx.bot.logger.syslog.log("!~~~! " + username + " unmuted bot");
                ctx.bot.writePersistentSettings();
            }
        });
    },
    "permissions": function (ctx, username, data, fromIRC) {
        if (fromIRC) {
            return;
        }
        ctx.bot.checkPermission(username, 3, null, function (hasPermission) {
            var match = data.trim().match(/^((\+|\-)((ALL)|(.*)) )?(.*)$/),
                permission = match[1],
                name = match[6].toLowerCase();
            
            if (!hasPermission) {
                return;
            } else {
                if (permission) {
                    permission = permission.toUpperCase();
                }
            }
            ctx.bot.handleHybridModPermissionChange(permission, name);
        });
    },
    "star": function (ctx, username, rest, fromIRC) {
        if (fromIRC) {
            return;
        }
        var stars = ["is a regular user", "is a frequent user", "has a silver star", "has a gold star", "has a diamond star"],
            split = rest.trim().split(/\s+/g),
            name,
            award;
        if (split.length === 1) {
            name = split[0];
            ctx.bot.getAward(name, function (userAward) {
                ctx.answer(name + " " + stars[userAward]);
            });
        } else {
            if (split.length === 2) {
                name = split[0];
                award = split[1];
                if (award < 0 || award > 4) {
                    ctx.bot.sendPM(username, "Error: Only values between 0 and 4 are valid");
                } else {
                    ctx.bot.checkPermission(username, 3, null, function (hasPermission) {
                        if (!hasPermission) {
                            ctx.bot.sendPM(username, "You have no permission to award stars");
                        } else {
                            ctx.bot.getAward(name, function (userAward) {
                                if (userAward === award) {
                                    ctx.bot.sendPM(username, name + " already " + stars[award]);
                                } else {
                                    ctx.bot.setAward(name, award);
                                    ctx.bot.sendPM(username, "Granted " + stars[award] + " to " + name);
                                }
                            });
                        }
                    });
                }
            } else {
                ctx.bot.sendPM(username, "Syntax Error. Use `$star name` to lookup a users awards, or `$star name (0|1|2|3|4)` to grant an award");
            }
        }
    },
    "poll": function (ctx, username, data, fromIRC) {
        if (!data || fromIRC) {
            return;
        }
        ctx.bot.checkAward(username, 3, 2, function (hasPermission) {
            if (!hasPermission) {
                return;
            }
            var hidden = false,
                splitData = data.split(".");
            if (splitData[splitData.length - 1].toLowerCase().match("true")) {
                hidden = true;
                splitData.splice(splitData.length - 1, 1);
            }
            var title = splitData[0];
            splitData.splice(0, 1);

            ctx.bot.createPoll({
                title: title,
                opts: splitData,
                obscured: hidden
            });
        });
    },
    "endpoll": function (ctx, username, data, fromIRC) {
        if (fromIRC) {
            return;
        }
        ctx.bot.checkAward(username, 3, 2, function (hasPermission) {
            if (!hasPermission) {
                return;
            }
            ctx.bot.endPoll();
        });
    },
    "quote": function (ctx, username, data) {
        var nick,
            id;
        if (data.indexOf("#") === 0) {
            id = data.substring(1);
        } else {
            nick = data.trim();
        }
        ctx.bot.db.getQuote(nick, id, function (row) {
            if (row === 0) {
                ctx.answer("No Quote found");
            } else {
                var nick = row.username,
                    msg = utils.handle(this, "filterMsg", row.msg),
                    id = row.id;
                
                ctx.answer("[#" + id + "] " + nick + ": " + msg);
            }
        });
    },
    "lastspoke": function (ctx, username, raw) {
        var data = raw.trim().split(/\s+/g),
            nick = data[0] || username,
            offset = data[1] || 0;
        
        if (data.length > 2) {
            ctx.answer("Syntax Error");
        } else {
            ctx.bot.db.getLastMsg(nick, offset, function (row) {
                if (row === 0) {
                    ctx.answer("No Message found");
                } else {
                    var nick = row.username,
                        msg = utils.handle(this, "filterMsg", row.msg),
                        timestamp = nicetime(row.timestamp / 1000);
                    ctx.answer(timestamp);
                    //ctx.answer("[" + timestamp + "] " + nick + ": " + msg);
                }
            });
        }
    },
    "findquote": function (ctx, username, data) {
        ctx.bot.db.findQuote(data.trim(), function (rows) {
            var row, nick, msg, id;
            
            if (rows === 0) {
                ctx.answer("No Quote found");
            } else {
                if (Array.isArray(rows)) {
                    if (rows.length === 1) {
                        row = rows[0];
                        
                        nick = row.username;
                        msg = row.msg;
                        id = row.id;
                        
                        msg = utils.handle(this, "filterMsg", msg);
                        ctx.answer("[#" + id + "] " + nick + ": " + msg);
                    } else {
                        if (rows.length === 0) {
                            ctx.answer("No Quote found");
                        } else {
                            ctx.answer(rows.map(function (s) {
                                return "#" + s.id;
                            }).join(" "));
                        }
                    }
                } else {
                    row = rows;
                    
                    nick = row.username;
                    msg = row.msg;
                    msg = utils.handle(this, "filterMsg", msg);
                    
                    id = row.id;
                    ctx.answer("[#" + id + "] " + nick + ": " + msg);
                }
            }
        });
    },
    "quotelist": function (ctx, username, nick) {
        ctx.bot.db.quotelist(nick.trim(), function (rows) {
            ctx.answer(rows.map(function (s) {
                return "#" + s;
            }).join(" "));
        });
    },
    "addquote": function (ctx, username, raw) {
        ctx.bot.checkPermission(username, 2, null, function (hasPermission) {
            var nick, msg, id;
            
            if (!hasPermission) {
                return;
            }
            var callback = function (row) {
                if (row === 0) {
                    return;
                }
                
                nick = row.username;
                msg = utils.handle(this, "filterMsg", row.msg);
                id = row.id;
                
                ctx.answer("Added Quote [#" + id + "] " + nick + ": " + msg);
            };
            
            var data = raw.trim().split(/\s+/g);
            if (data[0].indexOf("#") === 0 && isNumber(data[0].substring(1))) {
                id = data[0].substring(1);
                nick = data[1];
                msg = data.splice(2).join(" ");
                ctx.bot.db.insertQuote(nick, msg, id, callback);
            } else {
                nick = data[0];
                msg = data.splice(1).join(" ");
                ctx.bot.db.insertQuote(nick, msg, id, callback);
            }
        });
    },
    "delquote": function (ctx, username, id) {
        ctx.bot.checkPermission(username, 2, null, function (hasPermission) {
            if (!hasPermission) {
                return;
            }
            if (isNumber(id)) {
                ctx.bot.db.removeQuote(id);
            } else {
                ctx.bot.sendPM(username, '"' + id + '" is not a number');
            }
        });
    },
    "whois": function (ctx, username, nick) {
        ctx.bot.db.getUserData(nick.trim(), function (user) {
            var first = (user.first !== 0) ? nicetime(user.first) : "Veteran User",
                last = nicetime(user.last),
                msg = "*First Seen*: " + first + "; *Last Seen*: " + last + "; *Count*: " + numberWithCommas(user.count) + "; *Average*: " + (user.sum / user.count).toFixed(2) + "; *Total*: " + numberWithCommas(user.sum);
            
            ctx.answer("[Whois: " + nick + "] " + msg);
        });
    },
    "restart": function (ctx, username, data, fromIRC) {
        if (fromIRC) {
            return;
        }
        if (username.trim().toLowerCase() === "janne") {
            if (data) {
                ctx.answer("[kill] " + data);
                setTimeout(function () {
                    process.exit(0);
                }, 500);
            } else {
                process.exit(0);
            }
        }
    },
    "leader": function (ctx, username, data, fromIRC) {
        if (fromIRC) {
            return;
        }
        ctx.bot.checkAward(username, 2, 2, function (hasPermission, award) {
            if (!hasPermission) {
                return;
            }
            var active_mods = ctx.bot.userlist.filter(function (e) {
                return !e.meta.afk && (e.rank > 1 && e.name !== ctx.bot.username);
            });
            if (award >= 4 || active_mods.length === 0) {
                ctx.bot.sendAssignLeader(username);
            } else {
                if (ctx.bot.findUser(username).rank > 1) {
                    ctx.bot.sendPM(username, "You are already mod or leader");
                } else {
                    if (active_mods.length > 0) {
                        ctx.bot.sendPM(username, "You can only use $leader if there are no active mods");
                    }
                }
            }
        });
    },
    "unleader": function (ctx, username, data, fromIRC) {
        if (fromIRC) {
            return;
        }
        ctx.bot.checkPermission(username, 1.5, null, function (hasPermission) {
            if (!hasPermission) {
                return;
            }
            ctx.bot.sendAssignLeader("");
        });
    },
    "settime": function (ctx, username, data, fromIRC) {
        if (fromIRC || !data) {
            return;
        }
        ctx.bot.checkAward(username, 2, 2, function (hasPermission) {
            if (!hasPermission) {
                return;
            }
            
            var parsedTime = data.match(/(\+|\-)?(\d*)/),
                plusMinus = parsedTime[1],
                time = parseInt(parsedTime[2]);
            
            if (isNaN(time)) {
                return ctx.bot.sendPM(username, "Time given is not a number");
            }
            
            if (ctx.bot.sendAssignLeader(ctx.bot.username)) {
                return ctx.bot.logger.cytubelog.log("!~~~! Cannot set leader: Insufficient rank");
            }
            
            if (plusMinus) {
                if (plusMinus === "+") {
                    time = ctx.bot.leaderData.currentTime + time;
                }
                if (plusMinus === "-") {
                    time = ctx.bot.leaderData.currentTime - time;
                }
            }
            var setFun = function (callback) {
                ctx.bot.sendMediaUpdate(time, false);
                ctx.bot.sendAssignLeader("");
                callback();
            };

            ctx.bot.waitingFunctions.push({
                settime: true,
                fun: setFun
            });
        });
    },
    "shuffle": function (ctx, username, data, fromIRC) {
        if (fromIRC) {
            return;
        }
        ctx.bot.checkPermission(username, 2, "U", function (hasPermission) {
            if (!hasPermission) {
                return;
            }
            ctx.bot.shufflePlaylist();
        });
    },
    
    "debug": function (ctx, username, data) {
        var media = ctx.bot.playlist.filter(function (n) { return n.uid === ctx.bot.currentUID; })[0];
        console.log(media);
        var i = ctx.bot.playlist.indexOf(media);
        console.log(i);
        if (i !== -1) {
            var uid = ctx.bot.playlist[i + 1].uid;
            console.log(uid);
        }
    },
    "skip": function (ctx, username, data, fromIRC) {
        if (fromIRC) {
            return;
        }
        
        ctx.bot.checkAward(username, 3, 2, function (hasPermission) {
            if (!hasPermission) {
                ctx.bot.sendPM(username, "You have no permission to do that");
                return;
            }
            
            var amount = isNumber(data) ? new Number(data) : 1;
            var media = ctx.bot.playlist.filter(function (n) { return n.uid === ctx.bot.currentUID; })[0];
            var i = ctx.bot.playlist.indexOf(media);
            if (i !== -1) {
                var index = Math.min(i + amount, ctx.bot.playlist.length);
                var uid = ctx.bot.playlist[index].uid;
                ctx.bot.jumpTo(uid);
            }
        });
    },
    "stats": function (ctx) {
        ctx.bot.getGeneralStats();
        if (ctx.bot.enableWebServer) {
            ctx.answer(ctx.bot.webURL + ":" + ctx.bot.webPort + "/");
        }
    },
    "status": function (ctx, username) {
        if ((new Date().getTime() - ctx.bot.timeSinceLastStatus) / 1000 < 120) {
            return ctx.bot.sendPM(username, "Status cooldown");
        }
        ctx.bot.timeSinceLastStatus = new Date().getTime();
        ctx.bot.sendStatus();
    },
    "translate": function (ctx, username, data) {
        if (data) {
            var groups = data.match(/^(\[(([A-z]{2})|([A-z]{2}) ?-?> ?([A-z]{2}))\] ?)?(.+)$/),
                from = groups[4],
                to = groups[5],
                text = groups[6];
            if (!from) {
                from = null;
                to = "en";
            }
            
            var getURL = function (text, to, from) {
                var base = "https://translate.google.com/translate_a/single?client=webapp&sl=%lang_origin&tl=%lang_target&dt=bd&dt=ld&dt=qc&dt=rm&dt=t&dj=1&q=%query";
                base = base.replace("%lang_origin", from || "auto");
                base = base.replace("%lang_target", to || "en");
                base = base.replace("%query", encodeURIComponent(text));
                return base;
            };

            var getTranslation = function (text, to, from, callback) {
                var options = {
                    url: getURL(text, to, from),
                    json: true,
                    headers: {'user-agent': 'NokiaN97/21.1.107 (SymbianOS/9.4; Series60/5.0 Mozilla/5.0; Profile/MIDP-2.1 Configuration/CLDC-1.1) AppleWebkit/525 (KHTML, like Gecko) BrowserNG/7.1.4'}
                };

                request(options, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        callback(body);
                    }
                });
            };

            var formatTranslation = function (trans) {
                return "[" + trans.src + "] " + trans.sentences.map(function (l) { return l.trans || ""; }).reduce(function (a, b) { return a + " " + b; });
            };
            
            getTranslation(text, to, from, function (response) {
                ctx.answer(formatTranslation(response));
            });
        }
    },
    "unban": function (ctx, username, data, fromIRC) {
        if (!data || fromIRC) {
            return;
        }
        ctx.bot.checkPermission(username, 2, "N", function (hasPermission) {
            if (!hasPermission) {
                return;
            }
            var unbanFun = function (callback) {
                var i;
                for (i = 0; i < ctx.bot.banlist.length; i += 1) {
                    if (ctx.bot.banlist[i].name.toLowerCase() === data.toLowerCase()) {
                        var unbanJSON = {
                            id: ctx.bot.banlist[i].id,
                            name: ctx.bot.banlist[i].name
                        };
                        ctx.bot.sendUnban(unbanJSON);
                    }
                }
                callback();
            };

            ctx.bot.waitingFunctions.push({
                unban: true,
                fun: unbanFun
            });
            ctx.bot.socket.emit("requestBanlist");
        });
    },
    "userlimit": function (ctx, username, data, fromIRC) {
        if (!data || fromIRC) {
            return;
        }
        ctx.bot.checkPermission(username, 3, "L", function (hasPermission) {
            if (!hasPermission) {
                return;
            }
            var userlimitData = {
                match: data.match(/^(true|false) ?(\d*)|(\d*)/),
                callback: function () {
                    ctx.bot.checkPlaylist();
                    ctx.bot.writePersistentSettings();
                }
            };
            utils.handle(ctx.bot, "parseUserlimit", userlimitData);
        });
    },
    "weather": function (ctx, username, data) {
        if (!ctx.bot.weatherunderground) {
            return ctx.bot.sendPM(username, "No weatherunderground API key!");
        }
        if (!data || ctx.bot.muted) {
            return;
        }
        var now = Date.now(),
            waitTime = (ctx.bot.weatherLimiter.curIntervalStart + ctx.bot.weatherLimiter.tokenBucket.interval - now) / 1E3;
        if (ctx.bot.weatherLimiter.getTokensRemaining() < 1) {
            ctx.bot.sendPM(username, "Too many requests sent. Available in: " + waitTime + " seconds");
            return;
        }
        var postAPI = function (resp) {
            var parsedJSON = JSON.parse(resp);
            if (parsedJSON.response.error || parsedJSON.response.results) {
                return ctx.bot.sendPM(username, "Error");
            }
            var location = parsedJSON.current_observation.display_location.full,
                temp_f = parsedJSON.current_observation.temp_f,
                temp_c = parsedJSON.current_observation.temp_c,
                date = parsedJSON.current_observation.observation_time,
                weather = parsedJSON.current_observation.weather;
            ctx.answer("Currently " + weather + " and " + temp_f + "F " + "(" + temp_c + "C) in " + location + ". " + date);
        };
        ctx.bot.weatherLimiter.removeTokens(1, function () {
            api.APICall(data, "weather", ctx.bot.weatherunderground, postAPI);
        });
    },
    "wolfram": function (ctx, username, query) {
        if (!ctx.bot.wolfram) {
            return ctx.bot.sendPM(username, "No wolfram API key!");
        }
        api.APICall(query, "wolfram", ctx.bot.wolfram, function (result) {
            var answer = result.split("\n").join("\\\\").replace(/\|/g, ";;");
            answer = answer.replace(/\//gi, "/\ufeff").replace(/\^/gi, "^\ufeff").replace(/\>/gi, "\ufeff>");
            ctx.answer("'''" + answer);
        });
    },
    "embed": function (ctx, username, link) {
        ctx.bot.checkAward(username, 2, 2, function (hasPermission, award) {
            var now = new Date().getTime(),
                then = lastEmbed[username] || 0,
                diff = now - then,
                allowed = diff >= embedTimes[award];
            
            if (hasPermission && (allowed || ctx.isPrivate)) {
                var pattern = "!!",
                    links = link.trim().split(/\s+/g),
                    found = false;
                
                ctx.answer(links.map(function (str) {
                    if (str.indexOf("://") !== -1 && !found) {
                        found = true;
                        return str + pattern;
                    }
                }).join(" "));
                if (!ctx.isPrivate) {
                    lastEmbed[username] = new Date().getTime();
                }
            } else if (hasPermission) {
                ctx.bot.sendPM(username, "Your last embed was " + nicetime(then / 1000));
                ctx.bot.sendPM(username, "http://i.imgur.com/N8rprcK.jpg!!");
            } else {
                ctx.bot.sendPM(username, "You do not have the necessary permissions");
            }
        });
    },
    "bigembed": function (ctx, username, link) {
        ctx.bot.checkAward(username, 3, 2, function (hasPermission, award) {
            var now = new Date().getTime(),
                then = lastBigEmbed[username] || 0,
                diff = now - then,
                allowed = diff >= embedTimes[award];
            
            if (hasPermission && (allowed || ctx.isPrivate)) {
                var pattern = "!",
                    links = link.trim().split(/\s+/g),
                    found = false;
                ctx.answer(links.map(function (str) {
                    if (str.indexOf("://") !== -1 && !found) {
                        found = true;
                        return str + pattern;
                    }
                }).join(" "));
                if (!ctx.isPrivate) {
                    lastBigEmbed[username] = new Date().getTime();
                }
            } else if (hasPermission) {
                ctx.bot.sendPM(username, "Your last embed was " + nicetime(then / 1000));
                ctx.bot.sendPM(username, "http://i.imgur.com/N8rprcK.jpg!!");
            } else {
                ctx.bot.sendPM(username, "You do not have the necessary permissions");
            }
        });
    },
    "firstspoke": function (ctx) {
        ctx.answer("He is dead, Jim.");
    }
};
exports.chatHandlers = chatHandlers;