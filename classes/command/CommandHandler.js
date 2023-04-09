// Command Object layout:
// [
//     {
//         commandName: string,
//         commandDescription: string,
//         commandInteractionrReply: string,
//         commandChannelOnly: boolean,
//         commandChannel: string,
//         callFunction: function,
//     }
// ]

class CommandHandler
{
    client;

    commands;
    guild;
    constructor(guild, client, commands)
    {
        this.guild = guild;
        this.client = client;
        this.commands = commands;
        this.loadCommands();
    }

    loadCommands()
    {
        this.registerCommands();
        this.loadCommandInteractionCreate();
    }

    registerCommands()
    {
        let commands = this.getCommandsFromServerOrClient();
        this.commands.forEach(command =>
        {
            commands?.create({
                name: command.commandName,
                description: command.commandDescription,
                options: command.commandOptions
            })

            console.log("[IMRP-Infos-Bot]: Registered Command: " + command.commandName);
        })
    }

    getCommandsFromServerOrClient()
    {
        const guild = this.client.guilds.cache.get(this.guild);
        let commands;
        if(guild)
        {
            commands = guild.commands;
        }
        else
        {
            commands = this.client.application?.commands;
        }
        return commands;
    }

    loadCommandInteractionCreate()
    {
        this.client.on('interactionCreate', async interaction => {
            if(!interaction.isCommand()) return;
            const {commandName, options} = interaction;
            this.commands.forEach(command =>
            {
                if(commandName === command.commandName)
                {
                    if(command.commandChannelOnly)
                    {
                        if(interaction.channelId === command.commandChannel)
                        {
                            console.log("[IMRP-Infos] Catched Command Interaction (Channel-Only): " + commandName);
                            command.callFunction(interaction, this.client);
                        }
                    }
                    else
                    {
                        console.log("[IMRP-Infos] Catched Command Interaction (Global): " + commandName);
                    }
                }
            });
        });
    }
}

module.exports = CommandHandler;