// Adds the socket listeners
var addHandlers = function(bot) {
	// Socket handlers
	bot.socket.on("addUser", function(data) {
		bot.handleAddUser(data);
	});

	bot.socket.on("banlist", function(data) {
		bot.handleBanlist(data);
	});

	bot.socket.on("changeMedia", function(data) {
		bot.handleChangeMedia(data);
	});

	bot.socket.on("chatMsg", function(data) {
		bot.handleChatMsg(data);
	});

	bot.socket.on("delete", function(data) {
		bot.handleDeleteMedia(data);
	});

	bot.socket.on("disconnect", function() {
		setTimeout(function() {
			process.exit(0);
		}, 10000);
	});
    
    bot.socket.on("setMotd", function(motd) {
        var permissions_regex = /permissions\:\:(\{.*\})/;
        var schedule_regex = /schedule\:\:(\[.*\])/;

        motd = motd.replace(/&quot;/g, '"');

        console.log(motd);
        
        var permissions_matches = motd.match(permissions_regex);
        var schedule_matches = motd.match(schedule_regex);
        
        // Load permissions from MOTD
        if (permissions_matches) 
            bot.customPermissions = JSON.parse(permissions_matches[1]) || {};
        
        if (schedule_matches) 
            bot.schedule = JSON.parse(schedule_matches[1]) || [];
			
		bot.handleSchedule();
    });

	bot.socket.on("emoteList", function(emotes) {
		// No point in storing if we can't
		// send it later
		if (!bot.enableWebServer)
			return;

		bot.channelEmotes = emotes;
	});

	bot.socket.on("error", function(err) {
		bot.logger.errlog.log(err);
	});

	bot.socket.on("login", function(data) {
		bot.handleLogin(data);
	});

	bot.socket.on("mediaUpdate", function(data) {
		bot.handleMediaUpdate(data);
	});

	bot.socket.on("moveVideo", function(data) {
		bot.handleMoveMedia(data);
	});

	bot.socket.on("needPassword", function(data) {
		bot.handleNeedPassword(data);
	});

	bot.socket.on("playlist", function(data) {
		bot.handlePlaylist(data);
	});

	bot.socket.on("pm", function(data) {
        bot.handlePM(data, true);
	});

	bot.socket.on("queue", function(data) {
		bot.handleAddMedia(data);
	});

	bot.socket.on("removeEmote", function(emote) {
		bot.handleRemoveEmote(emote);
	});

	bot.socket.on("setCurrent", function(data) {
		bot.handleSetCurrent(data);
	});

	bot.socket.on("setLeader", function(data) {
		bot.handleSetLeader(data);
	});

	bot.socket.on("setTemp", function(data) {
		bot.handleSetTemp(data);
	});

	bot.socket.on("setUserRank", function(data) {
		bot.handleSetUserRank(data);
	});
    
    bot.socket.on("setUserMeta", function(data) {
		bot.handleSetUserMeta(data);
	});
    
    bot.socket.on("setAFK", function(data) {
		bot.handleSetAFK(data);
	});

	bot.socket.on("updateEmote", function(data) {
		bot.handleEmoteUpdate(data);
	});

	bot.socket.on("usercount", function(data) {
		bot.storeUsercount(data);
	});

	bot.socket.on("userLeave", function(data) {
		bot.handleUserLeave(data["name"]);
	});

	bot.socket.on("userlist", function(data) {
		bot.handleUserlist(data);
	});
};

exports.addHandlers = addHandlers;
