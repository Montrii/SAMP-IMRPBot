// const puppeteer = require('puppeteer');
//



const DiscordJS = require("discord.js");
const { Intents } = require("discord.js");
const dotenv = require("dotenv");
const axios = require("axios");
const cheerio = require("cheerio");

dotenv.config();


const client = new DiscordJS.Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.DIRECT_MESSAGE_TYPING,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
        Intents.FLAGS.DIRECT_MESSAGE_TYPING
    ]
})


// custom imports
let CommandHandler = require("./classes/command/CommandHandler");
let IMRPWebpage = require("./classes/browser/IMRPWebpage");

function loadCommands()
{
    new CommandHandler(process.env.DISCORD_SERVER_ID, client, [
        {
            commandName: "factions",
            commandDescription: "Gets all current factions.",
            commandInteractionrReply: "",
            commandChannelOnly: true,
            commandChannel: process.env.DISCORD_COMMANDCHANNEL_ID,
            callFunction: async (interaction, client) =>
            {
                await interaction.reply({ content: "Searching for factions..", ephemeral: false });
                axios.get("https://sa-mp.im/server/fun-stats").then(async (response) => {
                    if(response.status === 200)
                    {
                        let $ = cheerio.load(response.data);
                        let factions = $('div[class="faq"]')[0].children[34].children[0].children[1].children;

                        let factionList = [];
                        factions.forEach((faction) => {
                            factionList.push({name: faction.children[0].children[0].data, members: faction.children[1].children[0].data, leaders: []});
                        })


                        const factionLeadersHtml = await axios.get("https://sa-mp.im/server/faction-leaders");
                        $ = cheerio.load(factionLeadersHtml.data);


                        const allFactionLeaders = $('div[class="admins"]')[0].children;
                        const factionsOnLeader = $('h2[class="title"]');
                        factionsOnLeader.each((index, element) => {
                            let currentFaction = factionList.find(faction => faction.name === element.children[0].data);
                            // if faction has leaders
                            if(currentFaction !== undefined)
                            {
                                let factionIndexInList = allFactionLeaders.indexOf(element);
                                let getCurrentFactionIndex = factionList.indexOf(currentFaction)
                                let getEndOfFactionLeaders;
                                let factionLeaders = [];
                                for(let i = factionIndexInList; i < allFactionLeaders.length; i++)
                                {
                                    if(allFactionLeaders[i].name === "br")
                                    {
                                        getEndOfFactionLeaders = i;
                                        break;
                                    }
                                }

                                for(let i = factionIndexInList + 1; i < getEndOfFactionLeaders; i++)
                                {

                                    factionLeaders.push(allFactionLeaders[i].children[1].children[0].data.replace("\n", "").replace("\t", "").replace("\n", ""));
                                }

                                factionList[getCurrentFactionIndex].leaders = factionLeaders;


                            }
                        })
                        let factionText = "";
                        factionList.forEach((faction, index) => {
                            if(index > 0)
                            {
                                factionText += "\n\n" + (index+1) + ". **" + faction.name + "** | Members: **" + faction.members + "**\nLeaders: " + faction.leaders.join(", ")
                            }
                            else
                                factionText += (index+1) + ". **" + faction.name + "** | Members: **" + faction.members + "**\nLeaders: " + faction.leaders.join(", ")

                        });

                        let embed = new DiscordJS.MessageEmbed()
                            .setTitle("__**Factions**__")
                            .setColor("#0099ff")
                            .setThumbnail("https://cdn.discordapp.com/avatars/1062827513560182825/b8042d7c9272bedbc9ad37e5ef9a4c8b.webp?size=80")
                            .setFooter("IMRP-Infos-Bot")
                            .setTimestamp()
                            .setDescription(factionText);

                        await interaction.editReply({ embeds: [embed], ephemeral: false });
                    }
                    else
                    {
                        await interaction.editReply({ content: "Error while fetching factions.", ephemeral: false });
                    }


                })
            }
        },
        {
            commandName: "admins",
            commandDescription: "Displays all current admins that are online.",
            commandInteractionrReply: "",
            commandChannelOnly: true,
            commandChannel: process.env.DISCORD_COMMANDCHANNEL_ID,
            commandOptions: [],
            callFunction: async (interaction, client) => {
                await interaction.reply({ content: "Searching for admins that are online...", ephemeral: false });
                axios.get("https://sa-mp.im/server/players").then(async response =>
                {
                    if(response.status === 200)
                    {
                        // $('div[class="admins"]')[0]
                        let $ = cheerio.load(response.data);
                        let players = $("table[class='tbl_list']")[0].children[1].children;
                        let admins = players.filter((player) => {
                            return player.children[0].children[2] !== undefined && player.children[0].children[2].children[0].data.includes("Admin")
                        });
                        let foundAdmins = [];
                        admins.forEach((admin) => {
                            let adminName = admin.children[0].children[1].children[0].data.replace("\n", "").replace("\t", "").replace("\n", "");
                            let level = admin.children[1].children[0].data;
                            foundAdmins.push({ name: adminName, level: level });
                        });
                        if(foundAdmins.length === 0)
                        {
                            await interaction.editReply({ content: "No admins found that are online.", ephemeral: false });
                        }
                        else
                        {
                            axios.get("https://sa-mp.im/server/admins").then(async response2 => {
                                if(response2.status === 200)
                                {
                                    $ = cheerio.load(response2.data);
                                    let adminRanks = $('div[class="admins"]')[0].children.filter((child) => {
                                        return child.name === "div";
                                    });

                                    foundAdmins.forEach((admin, index) => {
                                        let adminRank = adminRanks.filter((rank) => {
                                            return rank.children[1].data.includes(admin.name)
                                        });
                                        foundAdmins[index] = { name: admin.name, level: admin.level, rank: adminRank[0].children[3].data.replace("\n", "").replace("\n", "").replace("(", "").replace(")", "") };
                                    });
                                    let embed = new DiscordJS.MessageEmbed()
                                        .setColor("#0099ff")
                                        .setThumbnail("https://cdn.discordapp.com/avatars/1062827513560182825/b8042d7c9272bedbc9ad37e5ef9a4c8b.webp?size=80")
                                        .setTitle("Admins online - " + foundAdmins.length)
                                        .setDescription("There are currently **" + foundAdmins.length + "** admins online.")
                                        .setTimestamp();
                                    foundAdmins.forEach((admin) => {
                                        embed.addField("Name", admin.name,true);
                                        embed.addField("Level", admin.level,true);
                                        if(admin.rank.includes("Lead") || admin.rank.includes("Head") || admin.rank.includes("Owner"))
                                        {
                                            embed.addField("Rank", "```ansi" + "\n" + "[2;33m[2;33m[2;33m[2;31m" + admin.rank + "[0m[2;33m[0m[2;33m[0m[2;33m[0m[2;33m[0m" + "\n```",true);
                                        }
                                        else if(admin.rank.includes("Senior"))
                                        {
                                            embed.addField("Rank", "```ansi" + "\n" + "[2;33m[2;33m[2;33m" + admin.rank + "[0m[2;33m[0m[2;33m[0m[2;33m[0m" + "\n```",true);
                                        }
                                        else if(admin.rank.includes("Basic"))
                                        {
                                            embed.addField("Rank", "```ansi" + "\n" + "[2;33m[2;33m[2;33m[2;31m[2;32m[2;32m" + admin.rank + "[0m[2;32m[0m[2;31m[0m[2;33m[0m[2;33m[0m[2;33m[0m[2;33m[0m" + "\n```",true);
                                        }
                                        else
                                        {
                                            embed.addField("Rank", admin.rank,true);
                                        }
                                        embed.addField("\u200B", "\u200B",false);
                                    });
                                    await interaction.editReply({ embeds: [embed], ephemeral: false });
                                }
                                else
                                {
                                    await interaction.editReply({ content: "Error while fetching admins from website.", ephemeral: false });
                                }
                            })
                        }
                    }
                    else
                    {
                        await interaction.editReply({ content: "Error while searching for admins.", ephemeral: false });
                    }
                });
            }
        },
        {
            commandName: "online",
            commandDescription: "Showcases the amount of players that are currently online.",
            commandInteractionrReply: "",
            commandChannelOnly: true,
            commandChannel: process.env.DISCORD_COMMANDCHANNEL_ID,
            commandOptions: [
            ],
            callFunction: async (interaction, client) => {
                await interaction.reply({ content: "Checking for players that are online..", ephemeral: false });
                axios.get("https://sa-mp.im/server/players").then(async response =>
                {
                    if(response.status === 200)
                    {
                        const $ = cheerio.load(response.data);
                        let embed = new DiscordJS.MessageEmbed()
                            .setColor("#0099ff")
                            .setThumbnail("https://cdn.discordapp.com/avatars/1062827513560182825/b8042d7c9272bedbc9ad37e5ef9a4c8b.webp?size=80")
                            .setTitle("Online players - " + $('div[class="highlight"]')[0].children[0].data)
                            .setDescription("There are currently **" + $('div[class="highlight"]')[0].children[0].data + "** players online.")
                            .setTimestamp();


                        await interaction.followUp({ embeds: [embed] , ephemeral: false });
                    }
                    else
                    {
                        await interaction.followUp({ content: "There has been an error while trying to fetch online players. Please try again later.", ephemeral: false });
                    }

                });

            }
        },
        {
            commandName: "searchplayer",
            commandDescription: "Find a specific account on IMRP.",
            commandInteractionrReply: "",
            commandChannelOnly: true,
            commandChannel: process.env.DISCORD_COMMANDCHANNEL_ID,
            commandOptions: [
                {
                    name: "username",
                    description: "The username of the account you want to find.",
                    type: "STRING",
                    required: true
                }
            ],
            callFunction: async (interaction, client) => {
                const username = interaction.options.getString("username");
                interaction.reply({ content: "Searching for account...", ephemeral: false });
                const information = await new IMRPWebpage(DiscordJS, client).findPlayer(username)
                if(information.status === false)
                {
                    interaction.followUp({content: information.message, ephemeral: false});
                    return;
                }
                else
                {
                    let embed = new DiscordJS.MessageEmbed()
                        .setColor("#0099ff")
                        .setThumbnail(information.player.skinImage)
                        .setTitle("Player: " + information.player.username)
                        .setURL(information.skinImage)
                        .setDescription("Displays information about the player: **" + information.player.username + "**")
                        .setTimestamp();
                    // if premium member
                    if(!information.player.status.includes("Regular"))
                    {
                        embed.addField("Rank", "```yaml"+ "\n" + information.player.status + " ```", false);
                    }
                    else
                    {
                        embed.addField("Rank", information.player.status, false);
                    }
                    embed.addField("Level", information.player.levelAndRp, true);
                    embed.addField("Hours", information.player.hours, true);
                    embed.addField("Job", information.player.job, false);
                    embed.addField("Faction", information.player.factionMember, false);
                    embed.addField("Team", information.player.teamMember, false);
                    embed.addField("Group", information.player.groupMember, false);
                    embed.addField("Admin entries", information.player.adminLog, true);
                    embed.addField("Criminal offenses", information.player.criminalOffenses, true);
                    // client.channels.cache.find(channel => channel.id === this.commandChannel).send();
                    interaction.followUp({embeds: [embed], ephemeral: false});
                    return;
                }
            }
        }
    ]);
}

client.on('ready', async () => {
    console.log("IMRP-Infos Bot is launched!");
    loadCommands();
    let imrpClass = new IMRPWebpage(DiscordJS, client);
    imrpClass.repeatLoadingReports(1000 * 60 * 3);
})


client.login(process.env.IMRP_BOT_TOKEN);