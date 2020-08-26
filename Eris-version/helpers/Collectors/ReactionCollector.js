const Base = require("./BaseCollector");

class ReactionCollector extends Base {

    constructor(client, message, filter, options = {}) {
        super(filter, options);
        this.message = message;
        this.users = new Map();
        this.total = 0;
        this.empty = this.empty.bind(this);
        this._handleChannelDeletion = this._handleChannelDeletion.bind(this);
        this._handleGuildDeletion = this._handleGuildDeletion.bind(this);
        this._handleMessageDeletion = this._handleMessageDeletion.bind(this);

        client.on("messageReactionAdd", this.handleCollect);
        client.on("messageReactionRemove", this.handleDispose);
        client.on("messageReactionRemoveAll", this.empty);
        client.on("messageDelete", this._handleMessageDeletion);
        client.on("channelDelete", this._handleChannelDeletion);
        client.on("guildDelete", this._handleGuildDeletion);

        this.once("end", () => {
            client.removeListener("messageReactionAdd", this.handleCollect);
            client.removeListener("messageReactionRemove", this.handleDispose);
            client.removeListener("messageReactionRemoveAll", this.empty);
            client.removeListener("messageDelete", this._handleMessageDeletion);
            client.removeListener("channelDelete", this._handleChannelDeletion);
            client.removeListener("guildDelete", this._handleGuildDeletion);
        });

        this.on("collect", (reaction, user) => {
            this.total++;
            this.users.set(user.id, user);
        });

        this.on("remove", (reaction, user) => {
            this.total--;
            if (!this.collected.some(r => r.users.cache.has(user.id))) this.users.delete(user.id);
        });
    }

    collect(message, emoji) {
        if (message.id !== this.message.id) return null;
        return ReactionCollector.key(emoji);
    }

 

    empty() {
        this.total = 0;
        this.collected.clear();
        this.users.clear();
        this.checkEnd();
    }

    endReason() {
        if (this.options.max && this.total >= this.options.max) return "limit";
        if (this.options.maxEmojis && this.collected.size >= this.options.maxEmojis) return "emojiLimit";
        if (this.options.maxUsers && this.users.size >= this.options.maxUsers) return "userLimit";
        return null;
    }

    _handleMessageDeletion(message) {
        if (message.id === this.message.id) {
            this.stop("messageDelete");
        }
    }

    _handleChannelDeletion(channel) {
        if (channel.id === this.message.channel.id) {
            this.stop("channelDelete");
        }
    }

    _handleGuildDeletion(guild) {
        if (this.message.guild && guild.id === this.message.guild.id) {
            this.stop("guildDelete");
        }
    }
    
    static key(emoji) {
        return emoji.id || emoji.name;
    }
}

module.exports = ReactionCollector;
