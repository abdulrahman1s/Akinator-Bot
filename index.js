import 'dotenv/config' // Load environment variables.
import { createServer } from 'http'
import { Client, GatewayIntentBits as Intents, SlashCommandBuilder, SlashCommandStringOption, ActivityType, EmbedBuilder } from 'discord.js'
import Akinator from './Akinator.js'

if (!process.env.DISCORD_TOKEN) {
    console.error('"DISCORD_TOKEN" is required to run the bot.')
    process.exit()
}

if (process.env.REPL_ID) { // Repl.it requires the app to listen for incoming requests to keep running!
    createServer((_, res) => res.end('Pong')).listen(process.env.PORT || '0.0.0.0')
}


const client = new Client({
    intents: [Intents.Guilds]
})

// Login to Discord API
client.login(process.env.DISCORD_TOKEN)


client.on('ready', async (client) => {
    console.log('Connected to Discord API!')
    console.log(client.user.tag)

    // Set bot activity.
    client.user.setActivity({
        name: '/akinator',
        type: ActivityType.Watching
    })


    const commands = [new SlashCommandBuilder()
        .setName('akinator')
        .setDescription('Akinator Game! 🧞')
        .addStringOption(new SlashCommandStringOption()
            .setName('language')
            .setDescription('Select the language you prefer. (default: English)')
            .setChoices({
                name: 'English',
                value: 'en'
            }, {
                name: 'Arabic',
                value: 'ar'
            }, {
                name: 'Spanish',
                value: 'es'
            }, {
                name: 'French',
                value: 'fr'
            }, {
                name: 'Italian',
                value: 'it'
            }, {
                name: 'Japanese',
                value: 'jp'
            }, {
                name: 'Russian',
                value: 'ru'
            }, {
                name: 'Portuguese',
                value: 'pt'
            }, {
                name: 'Turkish',
                value: 'tr'
            }, {
                name: 'Chinese',
                value: 'cn'
            })
            .setRequired(false)
        )]


    // Deploy Global /slash commands
    await client.application.commands.set(commands)
})

client.on('interactionCreate', async (ctx) => {
    if (!ctx.isCommand()) return
    if (ctx.commandName !== 'akinator') return

    await ctx.deferReply()

    const language = ctx.options.getString('language', false) || 'en'
    const game = new Akinator(language)

    await game.start()
    await ctx.editReply({
        components: [game.component],
        embeds: [game.embed]
    })

    // To Ignore non-playing users.
    const filter = i => i.user.id === ctx.user.id && i.channelId === ctx.channelId
    const channel = await client.channels.fetch(ctx.channelId, { force: false })

    while (!game.ended) try {
        await game.ask(channel, filter) // will throw an error if did not reply within 30 seconds
        if (!game.ended) await ctx.editReply({ embeds: [game.embed], components: [game.component] })
    } catch (err) {
        if (err instanceof Error) console.error(err)
        return await ctx.editReply({
            components: [],
            embeds: [],
            content: 'Timeout.'
        })
    }

    await game.stop()

    const msg = await ctx.editReply({ components: [game.component], embeds: [game.embed] })
    const embed = new EmbedBuilder(msg.embeds[0].toJSON())

    try {
        const response = await msg.awaitMessageComponent({
            filter: i => ['yes', 'no'].includes(i.customId) && i.user.id === ctx.user.id,
            time: 30_000
        })

        const title = response.customId === 'yes'
            ? 'Awesome! Thanks for playing'
            : 'GG!'

        await msg.edit({
            components: [],
            embeds: [embed.setTitle(title)]
        })
    } catch { // probably a timeout
        await msg.edit({
            components: [],
            embeds: [embed.setTitle(null)]
        }).catch(() => null)
    }
})
