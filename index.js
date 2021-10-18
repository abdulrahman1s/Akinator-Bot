require('dotenv/config') // Load environment variables.

const { Client } = require('discord.js')
const Akinator = require('./Akinator')
const client = new Client({
    intents: ['GUILDS']
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

client.on('interactionCreate', async ctx => {
    if (!ctx.isCommand()) return

    // Ignore non exists commands.
    if (ctx.commandName !== 'akinator') return

    await ctx.deferReply()

    const language = ctx.options.getString('language', false) || 'en'
    const game = new Akinator(language)

    // Start The game.
    await game.start()

    // Filter to ignore non-playing users.
    const filter = intercation => intercation.user.id === ctx.user.id

    await ctx.editReply({
        components: [game.toComponent()],
        embeds: [game.toEmbed()]
    })

    const channel = await client.channels.fetch(ctx.channelId)

    while (!game.ended) { // Game loop, only stops once the game ended.
        try { // Trying to catch game errors without break the while bot.
            await game.ask(channel, filter)
            await ctx.editReply({ embeds: [game.toEmbed()], components: [game.toComponent()] })
        } catch (e) { // Only happens while the 30 seconds ends without response. 
            // Log errors.
            if (e instanceof Error) console.error(e)

            await ctx.editReply({
                components: [],
                embeds: [],
                content: 'Timeout.'
            })

            return // Stop The Game
        }
    }

    // End the game.
    await game.end()

    // Remove buttons, And put the final embed.
    await ctx.editReply({ components: [], embeds: [game.toEmbed()] })
})