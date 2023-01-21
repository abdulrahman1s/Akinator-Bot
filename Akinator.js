import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import { Aki } from 'aki-api'

const emojis = ['👍', '👎', '❔', '🤔', '🙄', '❌']


class Akinator {
    constructor(region = 'en') {
        this.api = new Aki({ region })
    }

    get answers() {
        return this.api.answers
    }

    get question() {
        return this.api.question
    }

    get score() {
        return this.api.currentStep
    }

    get ended() {
        return this.api.progress >= 70 || this.api.currentStep >= 78
    }

    start() {
        return this.api.start()
    }

    stop() {
        return this.api.win()
    }

    /**
     * 
     * @param {import("discord.js").TextChannel} channel 
     */
    ask(channel, filter) {
        return new Promise((resolve, reject) => {
            const collector = channel.createMessageComponentCollector({ filter, time: 30_000 })

            collector
                .on('collect', async (ctx) => {
                    await ctx.deferUpdate()

                    const answer = Number(ctx.customId)

                    await this.api.step(answer)

                    collector.stop()
                })
                .on('end', (_, reason) => {
                    if (reason === 'time') {
                        reject()
                    } else {
                        resolve()
                    }
                })
        })
    }

    get embed() {
        if (this.ended) {
            const someone = this.answers[0]
            return new EmbedBuilder()
                .setTitle('Is this your character?')
                .setDescription(`**${someone.name}**\n${someone.description}\nRanking as **#${someone.ranking}**`)
                .setImage(someone.absolute_picture_path)
                .setColor('Random')
        }

        return new EmbedBuilder()
            .setTitle(`${this.score + 1}. ${this.question}`)
            .setColor('Random')
            .setFooter({ text: 'You have 30 seconds to answer.' })
    }

    get component() {
        const row = new ActionRowBuilder()

        if (this.ended) row.addComponents(
            new ButtonBuilder()
                .setLabel('Yes')
                .setStyle(ButtonStyle.Primary)
                .setCustomId('yes'),
            new ButtonBuilder()
                .setLabel('No')
                .setStyle(ButtonStyle.Danger)
                .setCustomId('no')
        )
        else row.addComponents(this.answers.map((answer, index) => {
            return new ButtonBuilder()
                .setEmoji(emojis[index])
                .setLabel(answer)
                .setStyle(ButtonStyle.Primary)
                .setCustomId(index.toString())
        }))

        return row
    }
}

export default Akinator
