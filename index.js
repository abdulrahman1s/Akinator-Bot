import 'dotenv/config' // Load environment variables.
import { createServer } from 'http'
import { Client, Intents } from 'discord.js'
import Akinator from './Akinator.js'

if (!process.env.DISCORD_TOKEN) {
    console.error('"DISCORD_TOKEN" is required to run the bot.')
    process.exit()
}

if (process.env.REPL_ID) { // Repl.it requires the app to listen for incoming requests to run
    createServer((_, res) => res.end('Pong')).listen(process.env.PORT || '0.0.0.0')
}


const client = new Client({
    intents: [Intents.FLAGS.GUILDS]
})

// Login to Discord API
client.login(process.env.DISCORD_TOKEN)


client.on('ready', async () => {
    console.log('Connected to Discord API!')

    // Set bot activity.
    client.user.setActivity({
        name: '/akinator',
        type: 'WATCHING'
    })

    const commands = [{
        name: 'akinator',
        description: 'Akinator Game! 🧞',
        options: [{
            name: 'language',
            description: 'Select the language you prefer. (default: English)',
            type: 'STRING',
            required: false,
            choices: [{
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
            }]
        }]
    }]

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
    const filter = intercation => intercation.user.id === ctx.user.id
    const channel = await client.channels.fetch(ctx.channelId)

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
    await ctx.editReply({ components: [], embeds: [game.embed] })
})
