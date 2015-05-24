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
        
        var permissions_matches = motd.match(permissions_regex);
        var schedule_matches = motd.match(schedule_regex);
        
        // Disabled currently, below is a copy-paste cached implementation of the current permissions, taken on 2015-05-25 00:27 CEST
        /*
        // Load permissions from MOTD
        if (permissions_matches) 
            bot.customPermissions = JSON.parse(permissions_matches[1]) || {};
        */
        bot.customPermissions = {"award":{"0":{"whois":0,"lastspoke":0,"firstspoke":0,"quote":0,"star":0,"restart":0},"1":{},"2":{"embed":5,"bigembed":15,"choose":1,"addrandom":1,"leader":"afk","wolfram":1,"translate":1,"skip":"afk"},"3":{"embed":15,"bigembed":30,"choose":15,"poll":0,"endpoll":0,"skip":0},"4":{"embed":5,"bigembed":15,"choose":5,"bump":0,"leader":"always"}},"rank":{"2":{"add":0,"ban":0,"addrandom":0,"bump":0,"choose":0,"clearchat":0,"currenttime":0,"delete":0,"disallow":0,"allow":0,"duplicates":0,"emotes":0,"forecast":0,"help":0,"internals":0,"ipban":0,"kick":0,"leader":0,"listpermissions":0,"management":0,"mute":0,"unmute":0,"star":0,"poll":0,"endpoll":0,"quote":0,"lastspoke":0,"findquote":0,"quotelist":0,"addquote":0,"delquote":0,"unleader":0,"settime":0,"shuffle":0,"skip":0,"stats":0,"status":0,"translate":0,"unban":0,"weather":0,"wolfram":0,"embed":0,"bigembed":0},"3":{"blacklist":0,"blacklistuser":0,"blockuser":0,"permissions":0,"setstar":0},"5":{"deletevideos":0},"1.5":{"unleader":0,"settime":0,"skip":0}}};
        
        if (schedule_matches) 
            bot.schedule = JSON.parse(schedule_matches[1]) || [];
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
