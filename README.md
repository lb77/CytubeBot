CytubeBot
=========

Install
-------
1. Install [node.js](http://nodejs.org/)
2. Either use `git clone http://git.kuschku.de/justJanne/CytubeBot.git` if you have git or download the zip file. (git is better since it allows easier updates via `git pull`
3. cd into the CytubeBot directory and run `npm install`
4. Add required info into config.json. See config section.
5. run `node index.js`

Notes: 
If you receive errors related to libxmljs, you need to install GCC and run `npm install` again. Getting it to work on Windows is a pain, so your best bet is to run it on Linux or OS X.

Config
------
- `cytubeServer` - URL of the server. Ex "cytu.be" or "somecytubeserver.com:socketport" where socketport is replaced by the socketIO port
- `username` - Account name the bot uses on the Cytube server
- `pw` [optional] - Password for the bot, blank logs in as guest
- `room` - Room the bot should join
- `roompassword` [optional] - Room password if there is one
- `wolfram` [optional] - WolframAlpha apikey. See http://products.wolframalpha.com/api/
- `weatherunderground` [optional] - WeatherUnderground apikey. see http://www.wunderground.com/weather/api/
- `mstranslateclient` [optional] - Microsoft client name. See http://www.microsofttranslator.com/dev/ and http://msdn.microsoft.com/en-us/library/hh454950.aspx 
- `mstranslatesecret` [optional] - Microsoft secret key
- `youtubev3` [optional] - Youtubev3 api key. See https://developers.google.com/youtube/v3/
- `deleteIfBlockedIn` [optional] - If given youtubev3 and you would like to delete videos blocked in a specific country, put the 2 letter country code of it here
- `enableWebServer` - Turns on/off the webserver
- `webURL` [optional] - The domain/ip you would use to connect to the webserver example: http://google.com or http://192.76.32.222
- `webPort` [optional] - The port for the webserver. Anything below 1000 requires root.
- `socketPort` [optional] - The port for socketIO. Anything below 1000 requires root.
- `useIRC` - Whether or not to bridge to IRC. Note: All commands that require rank will not work
- `ircServer` [optional] - the IRC server address. ex: "irc.6irc.net"
- `ircNick` [optional] - The nickname of the bot on irc.
- `ircPass` [optional] - Password for the IRC nick (If needed).
- `ircChannel` [optional] - The channel the bot should join. ex: "#testing"
- `usemodflair` - Whether to use modflair or not.
- `enableLogging` - Whether to write log data to a file
- `maxvideolength` - Maximum length of videos to select from database


Commands
--------
- `$poll title.option1.option2.etc.[true]` - Opens a poll, use . to seperate options. The last option, if "true", makes it an obscured poll (votes are hidden to non-mods). Requires mod or "P" permission
- `$endpoll` - Ends a poll. Requires mod or "P" permission
- `$addrandom [n]` - Adds n random videos from database. Requires mod on channel or "R" permission.
- `$skip` - Skips the current video. Requires mod on channel or "S" permission.
- `$bump -(user|title) (username | title to be matched) [all|n]` - Bumps all or n videos by username, or bumps videos matching the given title. Ex: `$bump -title the dog 2` -  Will bump the last two videos matching `.*the dog.*`.
- `$add URL [next]` -  Adds link, requires mod because of potential for media limit abuse.
- `$shuffle` - Shuffles the playlist. Requries mod or permission
- `$settime time` - Sets the time on the video to time. Whereas time is in seconds. Requires mod or "T" permission.
- `$embed URL` - Embeds a URL in chat
- `$bigembed URL` - Same as `$embed`, but larger
- `$star USER` - See which rank a user has
- `$setstar USER` - Set the rank for a user
- `$quote [username]` - Fetches a quote from the user given, otherwise fetches a random quote
- `$quotelist [username]` - Lists all quotes from the given user
- `$wolfram query` - Queries wolframalpha for the given query
- `$weather (zip code | city/town country)` - Looks up current conditions.
- `$choose (choice1 choice2...)` - Chooses a random item from the choices given.
- `$translate [[bb] | [aa>bb] | [aa->bb]] string` -
    Translates the given string from aa, which defaults to detecting the language, to bb, which defaults to en.
    The languages aa and bb must be specified as an ISO two letter language code.


Custom Commands
---------------
You can add custom commands inside custom.js, this will help you avoid merge conflicts when I update the bot.

Contact
-------
You can contact me either by creating an issue (if you believe there is a bug or you have an idea for an improvement) or by emailing at nuclearace@cytu.be. I can also be found on the Cytube support [irc](http://webchat.6irc.net/?channels=cytube), just ask for nuclearace.