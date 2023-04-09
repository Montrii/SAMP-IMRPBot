
# IMRPBot

This is a Bot allowing you to utilize the [Italy Mafia Roleplay Forum](https://forum.sa-mp.im) and [Italy Mafia Roleplay Dashboard](https://sa-mp.im/login) within Discord.

I used to use this Bot in order to get any reports about my friends and myself in realtime and also to search for other players very easily.

I know the code is kinda sloppy in some sense, however it did it's job.

The Bot was written in JavaScript with [discord.js](https://github.com/discordjs/discord.js/), [puppeteer](https://github.com/puppeteer/puppeteer) and [cheerio](https://github.com/cheeriojs/cheerio).

> **Warning**: The features may be deprecated due to Forum or Dashboard updates. The project is **no longer** actively maintained and therefore discontinued. This script does **not** store any of your information on some server. All data remains *local*.



## Features

- /online -> Tells you how many players are currently online.
- /admins -> Showcases all current logged in admins.
- /factions -> Displays useful information about each available faction.
- /searchplayer <Player_Name> -> Fetches public Information about entered player.
- Automatically fetching all player reports based on family name.

> All commands (including reports) are being showed in embeds.




## Installation

In order to install this bot, you will need to setup a few things before actually running it.


- Setup a [Discord bot](https://discord.com/developers/docs/getting-started).
- Create or use a [Discord Server](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server-).
- Get the [Server-ID](https://docs.statbot.net/docs/faq/general/how-find-id/#:~:text=To%20get%20a%20Channel%20ID,in%20front%20of%20the%20mention) and two different Channel-ID's.
- Setup an enviroment with [Node.js](https://nodejs.org/en) installed.

(If you are using **Heroku**, also include this step)

- Include a [Puppeteer Buildpack](https://elements.heroku.com/buildpacks/jontewks/puppeteer-heroku-buildpack).


> **Note**: Any Server that runs on Linux might have issues using puppeteer. You might wanna look into your specific OS to find a work around.


Now if your enviroment is fully setup, install all required packages:

```bash
npm install
```

Before launching the script, you now have to add the required information into your *[.env](https://github.com/Montrii/SAMP-IMRPBot/blob/main/.env)* file. Please take a look at it to understand how the information is added in there.

Once that is done, launch the script: 

```bash
node entry.js 
```



## Screenshots


Down here you can see some screenshots on how the bot sends messages.


![Player Report](https://i.imgur.com/EMDT7vJ.png)

![Search Player](https://i.imgur.com/i04nsik.png)

![Online Command](https://i.imgur.com/AxmVPpf.png)
*(...)*


## Authors

- [@Montri](https://www.github.com/Montrii)




## License

[MIT](https://choosealicense.com/licenses/mit/)

