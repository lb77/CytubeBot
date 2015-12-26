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

var data = "Hallo, wie geht's?";
            var groups = data.match(/^(\[(([A-z]{2})|([A-z]{2}) ?-?> ?([A-z]{2}))\] ?)?(.+)$/),
                from = groups[4],
                to = groups[5],
                text = groups[6];
            if (!from) {
                from = null;
                to = "en";
            }

            var getURL = function (text, to, from) {
                var base = "https://translate.google.com/translate_a/single?client=t&sl=%lang_origin&tl=%lang_target&hl=en&dt=bd&dt=ex&dt=ld&dt=md&dt=qca&dt=rw&dt=rm&dt=ss&dt=t&dt=at&ie=UTF-8&oe=UTF-8&ssel=0&tsel=0&kc=1&dj=1&q=%query";
                base = base.replace("%lang_origin", from || "auto");
                base = base.replace("%lang_target", to || "en");
                base = base.replace("%query", encodeURIComponent(text));
                return base;
            };

            var getTranslation = function (text, to, from, callback) {
                var options = {
                    url: getURL(text, to, from),
                    json: true,
                    headers: {
                      'Host': 'translate.google.com',
                      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:43.0) Gecko/20100101 Firefox/43.0',
                      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                      'Accept-Language': 'en-US,en;q=0.5',
                      'DNT': '1',
                      'Referer': 'https://translate.google.com/',
                      'Cache-Control': 'max-age=0',
                      'Connection': 'keep-alive'
                    }
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
                console.log(formatTranslation(response));
            });
