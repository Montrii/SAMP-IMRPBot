const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const IMRPReport = require("./IMRPReport");
const axios = require("axios");

let currentTokenID = "currenttoken";
let currentUserId = "currentuserid";
class IMRPWebpage
{
    playerReportsHTML = [];
    playerReports = [];

    discordjs;

    client;
    env;
    constructor(DiscordJS, client, env)
    {
        this.discordjs = DiscordJS;
        this.client = client;
        this.env = env;
    }

    repeatLoadingReports(time)
    {
        setInterval(async () => {
            await this.getPlayerReportsWithPuppeteer();
            await Promise.all(this.playerReports.map(async (report) => {
                await this.addOrPassReportsToDiscord(report);
            }));
            await this.deleteReports(this.playerReports);
            this.clearReports();
        }, time)
    }

// crashed?
    async deleteReports(reports)
    {
        await this.client.channels.cache.find(channel => channel.id === process.env.DISCORD_PLAYERREPORTS_CHANNEL_ID).messages.fetch({limit: 100}).then(async (messages) =>
        {
            await Promise.all(messages.map(async message =>{
                const foundReports = reports.find(report => message.embeds[0].description.includes(report.getTitle()));
                if(foundReports === undefined || foundReports === null)
                {
                    await message.delete();
                }
            }));
        })
            .catch((error) =>
            {
                console.log(error);
            });
    }

    getReportEmbedMessage(report)
    {
        var today = new Date();
        return new this.discordjs.MessageEmbed()
            .setColor("#0099ff")
            .setThumbnail("https://cdn.discordapp.com/avatars/1062827513560182825/b8042d7c9272bedbc9ad37e5ef9a4c8b.webp?size=80")
            .setTitle("A new Player Report ( " + report.getSection() + " ) has been found.")
            .setURL(report.getLink())
            .setDescription("Report Title: **" + report.getTitle() + "**")
            .setTimestamp();
    }

    getReportFullEmbedMessage(report)
    {
        let role = this.client.guilds.cache.get(process.env.DISCORD_SERVER_ID).roles.cache.find(role => role.name === report.getReportedFamily());
        let rolecolor = "#0099ff"
        if(role === null || role === undefined)
        {
            role = "A report was found, however there was not a fitting role to ping."
        }
        else
        {
            rolecolor = role.color;
        }
        let embed = this.getReportEmbedMessage(report);
        embed.setColor(rolecolor)
        embed.addField('Views', report.getViewsCount(), true);
        embed.addField('Posts', report.getPostsCount(), true);
        embed.addField('Last Poster', "["+report.getLastPostAccountName()+"]("+report.getLastPostAccountLink()+")", true)

        const row = new this.discordjs.MessageActionRow()
            .addComponents(
                new this.discordjs.MessageButton()
                    .setURL(report.getLink())
                    .setLabel("Visit Report")
                    .setStyle('LINK')
            )

        row.addComponents(new this.discordjs.MessageButton().
            setURL(report.getLastPostLink())
            .setLabel("Visit latest Post")
            .setStyle('LINK'))

        return { content: `${role}`, embeds: [embed], components: [row] }
    }
    async addOrPassReportsToDiscord(report)
    {
        await this.client.channels.cache.find(channel => channel.id === process.env.DISCORD_PLAYERREPORTS_CHANNEL_ID).messages.fetch({limit: 100}).then(async (messages) => {

            let invalidMessages = messages.filter((message) => {
                return message.embeds[0] === undefined;
            });

            await Promise.all(invalidMessages.map(async (message) => {
                await message.delete();
            }));

            let message = messages.find(message => message.embeds[0].description === "Report Title: **" + report.getTitle() + "**");

            if(message == null)
            {
                console.log("[IMRP Infos] Report not found  - Adding.")
                // create message
                this.client.channels.cache.find(channel => channel.id === process.env.DISCORD_PLAYERREPORTS_CHANNEL_ID).send(this.getReportFullEmbedMessage(report))
            }
            else
            {
                // update message
                console.log("[IMRP Infos] Report found  - Updating.")
                // message.edit
                message.edit(this.getReportFullEmbedMessage(report));
            }
        }).catch((error) => {
            console.log(error);
        });
    }

    clearReports()
    {
        this.playerReports = [];
    }


    sleep(ms)
    {
        return new Promise(resolve => setTimeout(resolve, ms));
    }




    hasNumber(myString)
    {
        return /\d/.test(myString);
    }
    isReportReportingMultiple(title)
    {
        return this.hasNumber(title) && title.includes("players");
    }
    isReportReportingUs(title)
    {
        return title.includes(process.env.REPORTED_FAMILY)
    }
    reportWhoIsBeingReported(title)
    {
        if(title.includes(process.env.REPORTED_FAMILY))
        {
            let removed = process.env.REPORTED_FAMILY.replace("_", "");
            return removed;
        }
    }
    async webScrapingPlayerReports()
    {
        await Promise.all(this.playerReportsHTML.map(async (html) => {
            console.log("[IMRP Infos] Parsing Report: " + html.title);
            let $ = cheerio.load(html.html);
            // if there are reports
            if($('ul[class="topiclist topics"]').length > 0)
            {
                const playerReports = $('ul[class="topiclist topics"]')[0].children.filter((child) => {
                    return child.data !== '\n' && child.type !== 'text';
                });

                // Heroku really does not like a lambda expression here -> leading to a threadLeak.
                // therefore we use a normal for loop here.
                for(let i = 0; i < playerReports.length; i++)
                {
                    let report = playerReports[i];
                    let posts = report.children[1].children[3].children[0].data;
                    let views = report.children[1].children[5].children[0].data;
                    let lastPostLink = "https://forum.sa-mp.im" + report.children[1].children[7].children[0].children[4].attribs.href.replace(".", "");
                    let lastPostAccount = "https://forum.sa-mp.im" + report.children[1].children[7].children[0].children[2].attribs.href.replace(".", "")
                    let lastPostAccountName = report.children[1].children[7].children[0].children[2].children[0].data;
                    let title;
                    // unread posts
                    if(report.children[1].children[1].children[5] !== undefined)
                    {
                        title = report.children[1].children[1].children[5].children[1].children[0].data;
                        let link = "https://forum.sa-mp.im" + report.children[1].children[1].children[5].children[1].attribs.href.replace(".", "");
                        let cutTitle = title.substring(title.indexOf("reporting"), title.length);
                        if(this.isReportReportingUs(cutTitle))
                        {
                            console.log("[IMRP Infos] Scraping Single Report: " + title);
                            this.playerReports.push(new IMRPReport(title, link, posts, views, lastPostLink, lastPostAccount, lastPostAccountName, html.title, this.reportWhoIsBeingReported(cutTitle)))
                        }
                        else if(this.isReportReportingMultiple(cutTitle))
                        {
                            console.log("[IMRP Infos] Scraping Report that contains multiple people " + title);
                            let result = await this.doesMultipleReportIncludeUs(link);
                            if(result.result)
                            {
                                this.playerReports.push(new IMRPReport(title, link, posts, views, lastPostLink, lastPostAccount, lastPostAccountName, html.title, result.reportedFamily))
                            }
                        }
                    }
                    // read posts
                    else
                    {
                        title = report.children[1].children[1].children[3].children[1].children[0].data;
                        let link = "https://forum.sa-mp.im" + report.children[1].children[1].children[3].children[1].attribs.href.replace(".", "");
                        let cutTitle = title.substring(title.indexOf("reporting"), title.length);
                        if(this.isReportReportingUs(cutTitle))
                        {
                            this.playerReports.push(new IMRPReport(title, link, posts, views, lastPostLink, lastPostAccount, lastPostAccountName, html.title, this.reportWhoIsBeingReported(cutTitle)))
                        }
                        else if(this.isReportReportingMultiple(cutTitle))
                        {
                            let result = await this.doesMultipleReportIncludeUs(link);
                            if(result.result)
                            {
                                this.playerReports.push(new IMRPReport(title, link, posts, views, lastPostLink, lastPostAccount, lastPostAccountName, html.title, result.reportedFamily))
                            }
                        }
                    }
                }
            }
            else
            {
                console.log("[IMRP Infos] - No Reports found for Section: " + html.title);
            }
        })).catch((error) => {
            console.log(error);
        });

    }


    async doesMultipleReportIncludeUs(link)
    {
        await this.sleep(7500);
        let reportHtml = await this.visitReportDeeper(link).catch((error) => {
            console.log("[IMRP Infos] Error while visiting report " + link);
            console.log(error);
        });
        const $ = cheerio.load(reportHtml);
        // let getTextInReport = $('div[class="content"]')[1].children.filter((child) => {
        //     return (child.data !== undefined && child.data !== "\n") && ( child.type !== undefined && child.type.includes("text"));
        // })

        let reportedTag = $('div[class="content"]')[1].children.filter((child) => {
            return child.name !== undefined && child.name.includes("strong") && child.children[0].data.includes("Reported player:");
        })

        let reasonTag = $('div[class="content"]')[1].children.filter((child) => {
            return child.name !== undefined && child.name.includes("strong") && child.children[0].data.includes("Reason:");
        })
        let reportedPlayers = [];
        for(let i = $('div[class="content"]')[1].children.indexOf(reportedTag[0]); i < $('div[class="content"]')[1].children.indexOf(reasonTag[0]); i++)
        {
            // console.log($('div[class="content"]')[1].children[i]);
            if($('div[class="content"]')[1].children[i].type.includes("text"))
            {
                reportedPlayers.push($('div[class="content"]')[1].children[i])
            }
        }

        const includesReportedForUs = reportedPlayers.filter((names) => {
            return this.isReportReportingUs(names.data)
        }).length > 0;

        return new Promise((resolve, reject) => {
            if(includesReportedForUs)
            {
                resolve({result: true, reportedFamily: this.reportWhoIsBeingReported(reportedPlayers[0].data)});
            }
            else
            {
                resolve({result: false, reportedFamily: ''})
            }
        })
    }
    async visitReportDeeper(link)
    {
        const browser = await puppeteer.launch({
            headless: true,
            args: [         '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--proxy-server="direct://"',
                '--proxy-bypass-list=*']
        })
        const page = await browser.newPage();
        await page.goto('https://forum.sa-mp.im/ucp.php?mode=login&redirect=index.php', {
            waitUntil: 'load',
            // Remove the timeout
            timeout: 0
        });
        await page.waitForSelector('.inner');
        await page.$eval('input[id="username"]', (el, name) => {
            el.value = name;
        },process.env.IMRP_FORUM_USERNAME);

        await this.sleep(500);
        await page.$eval('input[id="password"]', (el, name) => {
            el.value = name;
        }, process.env.IMRP_FORUM_PASSWORD);
        await this.sleep(500);
        const hideOnlineStatus = await page.waitForSelector('#viewonline');
        await hideOnlineStatus.click();

        await this.sleep(500);
        const loginButton = await page.waitForSelector('.button1');
        await loginButton.click();

        await page.waitForNavigation();
        if (page.url().includes("https://forum.sa-mp.im/index.php?sid="))
        {
            await this.sleep(500);
            await page.goto(link , {
                waitUntil: 'load',
                // Remove the timeout
                timeout: 0
            })
            const html = await page.evaluate(() => document.querySelector("*").outerHTML);
            await this.sleep(500);
            await browser.close();
            return new Promise((resolve, reject) => {
                resolve(html);
            })
        }
        else
        {
            return new Promise((resolve, reject) => {
                resolve('');
            });
        }
    }
    async getPlayerReportsWithPuppeteer()
    {
        return await puppeteer.launch({
            headless: false,
            args: [         '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--proxy-server="direct://"',
                '--proxy-bypass-list=*']
        }).then(async browser => {
            const page = await browser.newPage();
            await page.goto('https://forum.sa-mp.im/ucp.php?mode=login&redirect=index.php', {
                waitUntil: 'load',
                // Remove the timeout
                timeout: 0
            });
            await page.waitForSelector('.inner');
            await page.$eval('input[id="username"]', (el, name) => {
                el.value = name;
            },process.env.IMRP_FORUM_USERNAME);

            await this.sleep(100);
            await page.$eval('input[id="password"]', (el, name) => {
                el.value = name;
            }, process.env.IMRP_FORUM_PASSWORD);
            await this.sleep(500);
            const hideOnlineStatus = await page.waitForSelector('#viewonline');
            await hideOnlineStatus.click();

            await this.sleep(500);
            const loginButton = await page.waitForSelector('.button1');
            await loginButton.click();

            await page.waitForNavigation();
            if(page.url().includes("https://forum.sa-mp.im/index.php?sid="))
            {
                await this.sleep(500);
                console.log("[IMRP Infos] - Account logged in - viewing Player Reports");
                await page.goto("https://forum.sa-mp.im/viewforum.php?f=179", {
                    waitUntil: 'load',
                    // Remove the timeout
                    timeout: 0
                });
                this.playerReportsHTML[0] = {title: "Other", html: await page.evaluate(() => document.querySelector("*").outerHTML)}
                console.log("[IMRP Infos] - Fetched 'Other' Player Reports");
                await this.sleep(100);
                await page.goto("https://forum.sa-mp.im/viewforum.php?f=169", {
                    waitUntil: 'load',
                    // Remove the timeout
                    timeout: 0
                });
                this.playerReportsHTML[1] = {title: "War Violations", html: await page.evaluate(() => document.querySelector("*").outerHTML)}
                console.log("[IMRP Infos] - Fetched 'War Violations' Player Reports");
                await this.sleep(100);
                await page.goto("https://forum.sa-mp.im/viewforum.php?f=176", {
                    waitUntil: 'load',
                    // Remove the timeout
                    timeout: 0
                });
                this.playerReportsHTML[2] = {title: "Death Matching", html: await page.evaluate(() => document.querySelector("*").outerHTML)}
                console.log("[IMRP Infos] - Fetched 'DeatchMatching' Player Reports");
                await this.sleep(100);
                await page.goto("https://forum.sa-mp.im/viewforum.php?f=177", {
                    waitUntil: 'load',
                    // Remove the timeout
                    timeout: 0
                });
                this.playerReportsHTML[3] = {title: "Quit to Avoid", html: await page.evaluate(() => document.querySelector("*").outerHTML)}
                console.log("[IMRP Infos] - Fetched 'Quit to Avoid' Player Reports");
                await this.sleep(100);
                await page.goto("https://forum.sa-mp.im/viewforum.php?f=178", {
                    waitUntil: 'load',
                    // Remove the timeout
                    timeout: 0
                });
                this.playerReportsHTML[4] = {title: "Non Roleplay/Powergaming", html: await page.evaluate(() => document.querySelector("*").outerHTML)}
                await this.sleep(100);
                console.log("[IMRP Infos] - Fetched 'Non Roleplaying/Powergaming' Player Reports");
                console.log("[IMRP Infos] - Webscrapping Webpages with Cheerio started.");
                await this.sleep(500);
                await browser.close();
                await this.sleep(500);
                await this.webScrapingPlayerReports();
            }
            else
            {
                console.log("[IMRP Infos] - Failed to login into acccount... cancelling.");
                await this.sleep(500);
                await browser.close();
            }

        })
    }

    async findPlayer(playername)
    {
        const resultObject = await this.verifyTokenAndId(currentTokenID, currentUserId)
        if(resultObject.status)
        {
            await resultObject.page.goto("https://sa-mp.im/player/123225054/Montri_Bronx");
            await resultObject.page.waitForSelector("#search_player");
            await resultObject.page.$eval('input[placeholder="Firstname_Lastname"]', (el, name) => {
                el.value = name;
            }, playername);
            await this.sleep(100);
            await this.sleep(100);
            await resultObject.page.$eval('input[type="submit"]', el => el.click());
            await this.sleep(1500);
            if(resultObject.page.url().includes(playername))
            {
                await resultObject.page.waitForSelector(".about");
                let html = await resultObject.page.evaluate(() => document.querySelector("*").outerHTML);
                await resultObject.browser.close();
                await this.sleep(100);
                let $ = cheerio.load(html);
                let username = $('div[class="about"]')[0].children[0].children[0].data.replace("\n", "").replace("\n", "").replace(" (", "");
                let status = $('div[class="about"]')[0].children[1].children[0].children[1].children[0].data.replace("\n", "").replace("\n", "");
                let levelAndRp = "Level: " + $('div[class="about"]')[0].children[1].children[1].children[1].children[0].data.replace("\n", "").replace("\n", "").replace("(", "/ R-Points: ").replace(" R-Points)", "");
                let hours = $('div[class="about"]')[0].children[1].children[2].children[1].children[0].data.replace("\n", "").replace("\n", "");
                let lastSeen = $('div[class="about"]')[0].children[1].children[3].children[1].children[0].data.replace("\n", "").replace("\n", "");
                let job = $('div[class="about"]')[0].children[6].children[0].children[1].children[0].data.replace("\n", "").replace("\n", "");
                let factionMember = $('div[class="about"]')[0].children[6].children[1].children[1].children[0].data.replace("\n", "").replace("\n", "").replace("Yes(", "").replace(")\n", "");
                let teamMember = $('div[class="about"]')[0].children[6].children[2].children[1].children[0].data.replace("\n", "").replace("\n", "").replace("Yes(", "").replace(")\n", "");;
                let groupMember = $('div[class="about"]')[0].children[6].children[3].children[1].children[0].data.replace("\n", "").replace("\n", "");
                let adminLog = $('div[class="about"]')[0].children[6].children[5].children[1].children[0].data.replace("\n", "").replace("\n", "");
                let criminalOffenses = $('div[class="about"]')[0].children[6].children[6].children[1].children[0].data.replace("\n", "").replace("\n", "");
                let skinImage = "https://sa-mp.im" + $('div[class="skin"]')[0].children[0].attribs.src;
                return {status: true, message: "The Player '" + playername + "' was found.", player: {
                        username: username,
                        status: status,
                        levelAndRp: levelAndRp,
                        hours: hours,
                        lastSeen: lastSeen,
                        job: job,
                        factionMember: factionMember,
                        teamMember: teamMember,
                        groupMember: groupMember,
                        adminLog: adminLog,
                        criminalOffenses: criminalOffenses,
                        skinImage: skinImage
                }}
            }
            else
            {
                await resultObject.browser.close();
                console.log("[IMRP Infos - findPlayer Command]: Player not found");
                return {status: false, message: "The Player '" + playername + "' could not be found."};
            }
        }
        else
        {

            return {status: false, message: "The Player '" + playername + "' could not be found. - Fetching Player Data was unsuccessful."};
        }

    }
    async verifyTokenAndId(token, id)
    {
        return await puppeteer.launch({
            headless: true,
            args: [         '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--proxy-server="direct://"',
                '--proxy-bypass-list=*']
        }).then(async browser => {
            const page = await browser.newPage();
            const client = await page.target().createCDPSession();
            await client.send('Network.enable');
            await client.send ( 'Network.setCookie', {
                name: 'logintoken', value: token, domain: 'sa-mp.im'
            });
            await client.send ( 'Network.setCookie', {
                name: 'userid', value: id, domain: 'sa-mp.im'
            });
            await page.goto('https://sa-mp.im/profile');
            return new Promise(async (resolve, reject) => {
                if(page.url() === "https://sa-mp.im/login")
                {
                    await this.sleep(100);
                    await page.waitForSelector(".form_big");
                    await page.$eval('input[id="username"]', (el, name) => {
                        el.value = name;
                    },process.env.IMRP_PANEL_USERNAME);

                    await this.sleep(100);
                    await page.$eval('input[id="password"]', (el, name) => {
                        el.value = name;
                    }, process.env.IMRP_PANEL_PASSWORD);
                    await this.sleep(100);
                    await page.$eval('input[value="Login"]', el => el.click());
                    await this.sleep(1000);
                    if(page.url() === "https://sa-mp.im/profile")
                    {
                        const cookies = await page.cookies();
                        let tokenCookie = cookies.find(cookie => cookie.name === "logintoken");
                        let idCookie = cookies.find(cookie => cookie.name === "userid");
                        currentTokenID = tokenCookie.value;
                        currentUserId = idCookie.value;
                        resolve({status: true, message: "New Token and ID", browser: browser, page: page});
                    }
                }
                else
                {
                    resolve({status: true, message: "Valid Token and ID", browser: browser, page: page});
                }
            })
        });
    }
}

module.exports = IMRPWebpage;