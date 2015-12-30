/// <reference path="typings/node/node.d.ts"/>
"use strict";

var htmlescape = require('escape-html');
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

function numberWithCommas(x) {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
    return parts.join(".");
}

function isNumber(o) {
    return !isNaN(o - 0) && (o !== null && (o !== "" && o !== false));
}

var lastAction = {};

var getLeaderAllowed = function (bot, permLevel, rankLevel) {
    var active_mods = bot.userlist.filter(function (e) {
        return !e.meta.afk && (e.rank > 1 && e.name !== bot.username);
    });
    console.log(permLevel + ":" + rankLevel + ":" + active_mods.length);
    return permLevel === "always" || rankLevel === "always" || ((permLevel === "afk" || rankLevel === "afk") && active_mods.length === 0);
};

var getPermLevel = function (bot, award, command) {
    while (award >= 0) {
        if (bot.customPermissions.award && bot.customPermissions.award[award] && (bot.customPermissions.award[award][command] !== undefined)) 
            return bot.customPermissions.award[award][command];
        
        award--;
    }
    return -1;
};

var getRankLevel = function (bot, rank, command) {
    while (rank >= 0) {
        if (bot.customPermissions.rank && bot.customPermissions.rank[rank] && (bot.customPermissions.rank[rank][command] !== undefined)) 
            return bot.customPermissions.rank[rank][command];
        
        rank--;
    }
    return -1;  
};

var timegate = function (bot, username, award, rank, command, isPrivate) {
    console.log(bot.customPermissions);

    if (lastAction[command] === undefined)
        lastAction[command] = {};
    
    var now = new Date().getTime() / 1000,
        then = lastAction[command][username] || 0,
        diff = now - then,
        permLevel = getPermLevel(bot, award, command),
        rankLevel = getRankLevel(bot, rank, command);
    
    if (isNumber(permLevel))
        permLevel *= 60;
    
    if (isNumber(rankLevel))
        rankLevel *= 60;
    
    if (isNumber(permLevel) && permLevel > -60 && isPrivate ||
               isNumber(rankLevel) && rankLevel > -60 && isPrivate) {
        return [true];
    } else if ((isNumber(permLevel) && diff > permLevel && permLevel > -60) || (isNumber(rankLevel) && diff > rankLevel && rankLevel > -60)) {
        lastAction[command][username] = now;
        return [true];
    } else if ((isNumber(permLevel) && permLevel > -60) || (isNumber(rankLevel)  && rankLevel > -60)) {
        if (permLevel === -60)
            return [false, ["You used this command " + moment(then*1000).fromNow(),"You can use this command again " + moment(rankLevel*1000 + then*1000).fromNow()]];
        else if (rankLevel === -60)
            return [false, ["You used this command " + moment(then*1000).fromNow(),"You can use this command again " + moment(permLevel*1000 + then*1000).fromNow()]];
        else
            return [false, ["You used this command " + moment(then*1000).fromNow(),"You can use this command again " + moment(Math.min(permLevel, rankLevel)*1000 + then*1000).fromNow()]];
    } else if (getLeaderAllowed(bot, permLevel, rankLevel)) {
        return [true];
    } else {
        return [false];
    }
};

var reset_cooldown = function (username, command) {
    lastAction[command][username] = 0;
};

var chatHandlers = {
    "add": function (ctx, username, data, fromIRC) {
        if (fromIRC || !data) {
            return;
        }
        ctx.bot.checkPermission(username, 2, "A", function (hasPermission) {
            if (!hasPermission) {
                return;
            }
            var pos = "end",
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
        
        var params = data.trim();
        var num = params.split(" ")[0];
        var query = params.substring(num.length+1).trim();

        if (num <= 20 && 1 <= num) {
            ctx.bot.addRandomVideos(num, query, function () {
                reset_cooldown(username, "addrandom");
                ctx.answer("Could not find any videos");
            });
        }
    },
    "findvideos": function(ctx,username,data,fromIRC) {
        if (fromIRC) {
            return;
        }
        
        var query = data.trim();
        ctx.bot.findVideos(5, query, function (rows) {
            console.log(rows);
            if (rows.length) {
                ctx.answer("￿t￿Results:￿,￿"+rows.map(function (row) { return "["+row.type.toUpperCase()+"]" + " " + row.title; }).join("\\\\"));
            } else {
                ctx.answer("No results found");
            }
        });
    },
    "ban": function (ctx, username, data, fromIRC) {
        if (!data || fromIRC) {
            return;
        }

        
        if (username.toLowerCase() === data.split(/\s+/g)[0].toLowerCase()) {
            return;
        }
        ctx.answer("/ban " + data, true);
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
    "blacklistedusers": function (ctx, username) {
        ctx.bot.checkAward(username, 2, 2, function (hasPermission) {
            if (hasPermission || ctx.isPrivate) {
                ctx.bot.listBlacklistedUsers();
            }
        });
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
    "blockedusers": function (ctx, username) {
        ctx.bot.checkAward(username, 2, 2, function (hasPermission) {
            if (hasPermission || ctx.isPrivate) {
                ctx.bot.listBlockedUsers();
            }
        });
    },
    "disallowedusers": function (ctx, username) {
        ctx.bot.checkAward(username, 2, 2, function (hasPermission) {
            if (hasPermission || ctx.isPrivate) {
                ctx.answer("Disallowed users: " + ((ctx.bot.stats.disallow.length === 0) ? "None" : ctx.bot.stats.disallow.join(" ")));
            }
        });
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
    "checkplaylist": function (ctx, username) {
        ctx.bot.checkPlaylist();
    },
    "choose": function (ctx, username, data) {
        if (!data || data.indexOf("://") !== -1) {
            return;
        }
        
        var choices = data.trim().split(/\s+/g),
            choice = choices[Math.floor(Math.random() * choices.length)];
            ctx.answer("[Choose: " + utils.handle(ctx.bot, "filterMsg", choices.join(" ")) + "] " + utils.handle(ctx.bot, "filterMsg", choice));
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
    "currenttime": function (ctx, username) {
        ctx.bot.checkAward(username, 4, 2, function (hasPermission) {
            if (hasPermission || ctx.isPrivate) {
                var currentTime = Math.round(ctx.bot.leaderData.currentTime);
                ctx.answer("Current Time: " + currentTime);
            }
        });
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
    "allow": function (ctx, username, data, fromIRC) {
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
                        return ctx.bot.disallowUser(user, false);
                    } else {
                        if (lesserOrEqualUser && userAlsoHasPermission) {
                            return;
                        }
                    }
                    return ctx.bot.disallowUser(user, false);
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
    "emotes": function (ctx, username) {
        ctx.bot.checkAward(username, 4, 2, function (hasPermission) {
            if (hasPermission || ctx.isPrivate) {
                if (!ctx.bot.enableWebServer) {
                    return ctx.answer("WebServer not enabled");
                }
                ctx.answer(ctx.bot.webURL + ":" + ctx.bot.webPort + "/emotes");
            }
        });
    },
    "forecast": function (ctx, username, data) {
        if (ctx.bot.muted || (!ctx.bot.weatherunderground || !data)) {
            return;
        }
        
        ctx.bot.checkAward(username, 4, 2, function (hasPermission) {
            if (hasPermission || ctx.isPrivate) {
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
            }
        });
    },
    "help": function (ctx, username) {
        ctx.bot.checkAward(username, 4, 2, function (hasPermission) {
            if (hasPermission || ctx.isPrivate) {
                ctx.bot.sendPM(username, "https://github.com/nuclearace/CytubeBot/blob/master/README.md#commands");
            }
        });
    },
    "internals": function (ctx, username) {
        ctx.bot.checkAward(username, 4, 2, function (hasPermission) {
            if (hasPermission || ctx.isPrivate) {
                if (!ctx.bot.enableWebServer) {
                    return ctx.answer("WebServer not enabled");
                }
                ctx.answer(ctx.bot.webURL + ":" + ctx.bot.webPort + "/internals");
            }
        });
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
        ctx.bot.checkAward(username, 4, 2, function (hasPermission) {
            if (hasPermission || ctx.isPrivate) {
                var name;
                if (!data) {
                    name = username;
                } else {
                    name = data;
                }
                perms.handle(ctx.bot, "sendHybridModPermissions", name.toLowerCase());
            }
        });
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
        var stars = ["is a regular user", "is a frequent user", "has a silver star", "has a gold star", "has a diamond star"],
            split = rest.trim().split(/\s+/g),
            name;
        
        name = split[0];
            ctx.bot.getAward(name, function (userAward) {
            ctx.answer(name + " " + stars[userAward]);
        });
    },
    "setstar": function (ctx, username, rest, fromIRC) {
        if (fromIRC) {
            return;
        }
        
        var stars = ["is a regular user", "is a frequent user", "has a silver star", "has a gold star", "has a diamond star"],
            split = rest.trim().split(/\s+/g),
            name,
            award;
    
        if (split.length === 2) {
            name = split[0];
            award = split[1];
            if (award < 0 || award > 4) {
                ctx.bot.sendPM(username, "Error: Only values between 0 and 4 are valid");
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
        } else {
            ctx.bot.sendPM(username, "Syntax Error. Use `$star name` to lookup a users awards, or `$star name (0|1|2|3|4)` to grant an award");
        }
    },
    "poll": function (ctx, username, data, fromIRC) {
        if (!data || fromIRC) {
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
    },
    "endpoll": function (ctx, username, data, fromIRC) {
        if (fromIRC) {
            return;
        }

        ctx.bot.endPoll();
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
                        timestamp = nicetime(row.timestamp / 1000);
                    ctx.answer(nick + ": " + timestamp);
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
        var nick, msg, id;

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
    },
    "delquote": function (ctx, username, id) {
        if (isNumber(id)) {
            ctx.bot.db.removeQuote(id);
        } else {
            ctx.bot.sendPM(username, '"' + id + '" is not a number');
        }
    },
    "whois": function (ctx, username, nick) {
        ctx.bot.db.getUserData(nick.trim(), function (user) {
            var first = (user.first !== 0) ? nicetime(user.first) : "Veteran User",
                last = nicetime(user.last),
                msg = "*First Seen*: " + first + "; *Last Seen*: " + last + "; *Count*: " + numberWithCommas(user.count) + "; *Average*: " + (user.sum / user.count).toFixed(2) + "; *Total*: " + numberWithCommas(user.sum);

            ctx.answer("[Whois: " + user.username + "] " + msg);
        });
    },
    "restart": function (ctx, username, data, fromIRC) {
        if (fromIRC) {
            return;
        }
        if (username.trim().toLowerCase() === "janne" || username.trim().toLowerCase() === "limit") {
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
        
        ctx.bot.sendAssignLeader(username);
    },
    "unleader": function (ctx, username, data, fromIRC) {
        if (fromIRC) {
            return;
        }
        ctx.bot.sendAssignLeader("");
    },
    "settime": function (ctx, username, data, fromIRC) {
        if (fromIRC || !data) {
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
    },
    "shuffle": function (ctx, username, data, fromIRC) {
        if (fromIRC) {
            return;
        }

        ctx.bot.shufflePlaylist();
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
    "autoschedule": function (ctx, username, data, fromIRC) {
        if (fromIRC) {
            return;
        }
        
        ctx.bot.autoSchedule = (data && data.trim().toLowerCase() === "true");
        ctx.answer("AutoSchedule " + (ctx.bot.stats.autoSchedule ? "enabled" : "disabled"));
        
        ctx.bot.handleSchedule();
    },
    "skip": function (ctx, username, data, fromIRC) {
        if (fromIRC) {
            return;
        }
        
        var amount = isNumber(data) ? new Number(data) : 1;
        if (amount < 1) {
            return;
        }
        var media = ctx.bot.playlist.filter(function (n) { return n.uid === ctx.bot.currentUID; })[0];
        var i = ctx.bot.playlist.indexOf(media);
        if (i !== -1) {
            var index = i + amount;
            if (ctx.bot.playlist.length < index) {
                var uid = ctx.bot.playlist[index].uid;
                ctx.bot.jumpTo(uid);
            }
        }
    },
    "stats": function (ctx, username) {
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
		ctx.answer("Fuck you, asshole!");
		return;
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
                var base = "https://translate.google.com/translate_a/single?client=webapp&sl=%lang_origin&tl=%lang_target&hl=en&dt=bd&dt=ld&dt=qc&dt=rm&dt=t&dj=1&q=%query";
                base = base.replace("%lang_origin", from || "auto");
                base = base.replace("%lang_target", to || "en");
                base = base.replace("%query", encodeURIComponent(text));
                return base;
            };

            var getTranslation = function (text, to, from, callback) {
                var options = {
                    url: getURL(text, to, from),
                    json: true,
                    headers: {'user-agent': 'Mozilla/5.0 (Linux; Android 4.4; Nexus 5 Build/BuildID) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/30.0.0.0 Mobile Safari/537.36'}
                };

                request(options, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        callback(body);
                    } else {
                        console.log(error);
                        console.log(response);
                    }
                });
            };

            var formatTranslation = function (trans) {
                return "[" + trans.src + "] " + utils.handle(this, "filterMsg", trans.sentences.map(function (l) { return l.trans || ""; }).reduce(function (a, b) { return a + " " + b; }));
            };
            
            var testTranslation = function () {
              getTranslation("Schmetterling", "en", "auto", function (response) {
                console.log(response);
              });
            }

            getTranslation(text, to, from, function (response) {
                ctx.answer(formatTranslation(response));
            });
        }
    },
    "unban": function (ctx, username, data, fromIRC) {
        if (fromIRC) {
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
    },
    "userlimit": function (ctx, username, data, fromIRC) {
        if (fromIRC) {
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
    },
    "weatherunderground": function (ctx, username, data) {
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
    "weather": function (ctx, username, query) {
        var key = "40bf9b8d2bfa0b9c231f16598dae8212";
        
        var getURL = function (query) {
            return "http://api.openweathermap.org/data/2.5/weather?APPID=%key&q=%query".replace("%key", key).replace("%query", query);
        }
        
        var getWeatherData = function (query, callback) {
            var options = {
                url: getURL(query),
                json: true
            };
        
            request(options, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    callback(body);
                } else {
                    console.log(error);
                    console.log(response);
                }
            });
        };
        
        var formatResponse = function (response) {
            var escape = "​";
            
            var formatObjectAsTable = function (obj) {
                var formatRow = function (key, value) {
                    if (value.constructor === Array) value = value.join(escape+", "+escape);
                    return key + escape + ": " + escape + value;
                }
                
                var result = [];
                for (var key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        result.push(key);
                    }
                }
        
                return result.map(function (key) {return formatRow(key, obj[key]);}).join(escape+"; "+escape);
            }
            
            if (!response || !response.cod || response.cod != 200) {
                return response.message || (response.cod + ": An error occured");
            }
            
            var data = {
                "Location": response.name + ", " + response.sys.country,
                "Weather": response.weather[0].main,
                "Temperature": 
                    (response.main.temp-273.14).toFixed(1) + "°C" + " " +
                    "(" + (response.main.temp_min-273.14).toFixed(1) + "°C" + " — "
                        + (response.main.temp_max-273.14).toFixed(1) + "°C" + ")",
                "Wind": response.wind.speed + " km/h",
                "Humidity": response.main.humidity + "%"
            }
            return escape+"t"+escape+formatObjectAsTable(data)+escape+"!"+escape;
        }
        
        getWeatherData(query, function (response) {
            var escape = "​";
            
            if (response) ctx.answer(formatResponse(response));
            else ctx.answer(escape+"t"+escape+"An Error occured"+escape+"!"+escape);
        });
    },
    "compliment": function (ctx, username) {
      var options = {
          url: "http://compliment.b303.me/",
          json: false
      };
  
      request(options, function (error, response, body) {
          if (!error && response.statusCode == 200) {
              ctx.answer("`Possibly NSFW` /s "+body);
          } else {
              console.log(error);
              console.log(response);
          }
      });
    },
    "wolfram": function (ctx, username, query) {                
        api.APICall(query, "wolfram", ctx.bot.wolfram, function (result) {
            var escape = "​";
            
            var answer = result.split("\n").map(function (line) { return line.replace(/\|/, escape+": "+escape) })
                               .join(escape+"; "+escape)
                               .replace(/\|/g, escape+", "+escape)
                               .replace(/  +/g, ' ');
            answer = answer.replace(/\//gi, "/\ufeff").replace(/\^/gi, "^\ufeff").replace(/\>/gi, "\ufeff>");
            var response = escape + "t" + escape + utils.handle(this, "filterMsg", answer) + escape + "!" + escape;
            
            ctx.answer(response);
        });
    },
    "embed": function (ctx, username, link) {        
        var pattern = "!!",
            links = link.trim().split(/\s+/g),
            found = false;

        ctx.answer(links.map(function (str) {
            if (str.indexOf("://") !== -1 && !found) {
                found = true;
                return str + pattern;
            }
        }).join(" "));
    },
    "bigembed": function (ctx, username, link) {
        var pattern = "!",
            links = link.trim().split(/\s+/g),
            found = false;
        ctx.answer(links.map(function (str) {
            if (str.indexOf("://") !== -1 && !found) {
                found = true;
                return str + pattern;
            }
        }).join(" "));
    },
    "firstspoke": function (ctx, username) {
        ctx.answer("He is dead, Jim.");
    },
    "tip": function (ctx, username, data, fromIRC) {
        var normalize = function (s) {
            var n = Number(s);
            if (isNaN(n)) return 0;
            else return n;
        }
        
        if (fromIRC) {
            return;
        }
        
        var name = data.trim().split(" ")[0];
        var amount = data.trim().split(" ")[1];
		
        ctx.bot.db.addMCoins(name, normalize(amount));
        ctx.answer(amount + " coins to " + name);
    },
    "getcoins": function (ctx, username, name, fromIRC) {
        if (fromIRC) {
            return;
        }
        
        name = name.trim();
        
        var callback = function (row) {
            if (row === 0) {
                return;
            }
            
            var nick = row.username;
            var amt = row.amount;
            ctx.answer(nick + " has " + amt + " coins");
        }
        ctx.bot.db.getMCoins(utils.handle(ctx.bot, "filterMsg", name).replace("!", ""), callback)
    },
    /*
	"report": function (ctx, username, name, fromIRC) {
		if (fromIRC) {
			return;
		}
		
		name = name.trim();
		
		ctx.bot.db.addReport(name)
		ctx.answer(name + ": REPORTED")
	},
	"getreports": function(ctx, username, name) {
		name = name.trim();
		
		var callback = function(row) {
			if (row === 0) {
				return;
			}
			
			var nick = row.username;
			var amt = row.amount;
			ctx.answer(nick + " has been reported " amt + " times");
		}
		ctx.bot.db.getReports(name, callback)
	},
	*/
	"raffle": function(ctx, username, prize, fromIRC) {
		if (prize === undefined) prize = Math.ceil(Math.random()*41+9);
		
		if (fromIRC) {
            return;
        }
		
		var callback = function(row) {
			if (row === 0) {
				return;
			}
			
			var nick = row.username;
			var amt = row.amount;
			ctx.answer(nick + " has won the raffle! (" + amt + " coins)");
		}
		
		ctx.bot.db.awardRaffle(prize, callback)
	},
	"givecoins": function(ctx, username, data, fromIRC) {
		if (fromIRC) {
            return;
        }
		
		var split = data.trim().split(" ");
		
	}
};
exports.chatHandlers = chatHandlers;
exports.checkPerms = timegate;
