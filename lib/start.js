var CytubeBot = require("./cytubebot")
var Config = require("./config")
var fs = require("fs")

process.on("exit", function() {
	console.log("\n!~~~! CytubeBot is shutting down\n")
})

Config.load(function(config) {
	var bot = CytubeBot.init(config);

	// Socket handlers
	bot.socket.on("addUser", function(data) {
		bot.handleAddUser(data)
	})

	bot.socket.on("channelOpts", function(data) {
		bot.handleChannelOpts(data)
	})

	bot.socket.on("changeMedia", function(data) {
		bot.handleChangeMedia(data)
	})

	bot.socket.on("chatMsg", function(data) {
		bot.handleChatMsg(data)
	})

	bot.socket.on("delete", function(data) {
		bot.handleDeleteMedia(data)
	})

	bot.socket.on("disconnect", function(data) {
		process.exit(0)
	})

	bot.socket.on("mediaUpdate", function(data) {
		bot.handleMediaUpdate(data)
	})

	bot.socket.on("moveVideo", function(data) {
		bot.handleMoveMedia(data)
	})

	bot.socket.on("needPassword", function(data) {
		bot.handleNeedPassword(data)
	})

	bot.socket.on("playlist", function(data) {
		bot.handlePlaylist(data)
	})

	bot.socket.on("queue", function(data) {
		bot.handleAddMedia(data)
	})

	bot.socket.on("setCurrent", function(data) {
		bot.handleSetCurrent(data)
	})

	bot.socket.on("setTemp", function(data) {
		bot.handleSetTemp(data)
	})

	bot.socket.on("setUserRank", function(data) {
		bot.handleSetUserRank(data)
	})

	bot.socket.on("usercount", function(data) {
		bot.storeUsercount(data)
	})

	bot.socket.on("userLeave", function(data) {
		bot.handleUserLeave(data["name"])
	})

	bot.socket.on("userlist", function(data) {
		bot.handleUserlist(data)
	})

	// Join the room
	bot.start()
});