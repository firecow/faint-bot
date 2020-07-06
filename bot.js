const fs = require('fs');
const capitalize = require('capitalize');
const Discord = require('discord.js');
const client = new Discord.Client();
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const customEmojis = require("./customemojis");

const signupRegex = /(\d{1,2}) (January|Jan|February|Feb|March|Mar|April|Apr|May|June|Jun|July|Jul|August|Aug|September|Sep|October|Oct|November|Nov|December|Dec) (\d{4}) (\d{2}):(\d{2}).*\[(Raid)\]/;

function getGuild() {
    return client.guilds.cache.array().find(g => g.id === "605864258819063839");
}

function memberName(user) {
    const guild = getGuild();
    const member = guild.members.cache.array().find(m => m.user.id === user.id);
    return member ? member.nickname || member.user.username : `${user.username} (Not in guild)`;
}

function filterMessages(messages, type) {
    const raidMessages = [];
    messages.forEach((message) => {
        const match = signupRegex.exec(message.content);
        if (match && match[6].toLowerCase() === type) {
            raidMessages.push(message);
        }
    });
    return raidMessages;
}

function isRaidMessage(message) {
    return filterMessages([message], 'raid').length > 0;
}

async function sendRaidInfo(message, user) {
    let content = `${message.content.split('\n')[0]}\n\n`;

    const rdy = new Map();
    const cant = new Map();

    // Traverse reactions
    for (const reaction of message.reactions.cache.array()) {
        const users = await reaction.users.fetch();
        const emoji = `${reaction.emoji}`;

        for (let user of users.values()) {
            const name = memberName(user);
            if (`${emoji}` === customEmojis.getEmojiByName('cantcome')) {
                cant.set(name, {name: name, emoji: emoji});
                rdy.delete(name);
            } else if (!cant.has(name)){
                rdy.set(name, {name: name, emoji: emoji});
            }
        }
    }

    // Get all guild member names
    const guild = getGuild();
    const memberNames = [];
    guild.members.cache.array().forEach(d => {
        if (d.roles.cache.array().map(d => d.name).includes("Guild")) {
            memberNames.push(memberName(d.user));
        }
    });

    const map = new Map();
    Array.from(rdy.values()).forEach((item) => {
        const collection = map.get(item.emoji);
        if (!collection) {
            map.set(item.emoji, [item]);
        } else {
            collection.push(item);
        }
    });

    const emojis = Array.from(map.keys());
    emojis.sort((a, b) => a.localeCompare(b));
    for (const emoji of emojis) {
        const emojiName = customEmojis.getNameByEmoji(emoji)
        content += `${emoji} **${capitalize(emojiName)}**\n`;
        map.get(emoji).forEach((x, i, arr) => {
            content += `${x.name}`;
            if (arr.length - 1 !== i) {
                content += `, `;
            }
        });
        content += `\n\n`;
    }

    // Print cants
    content += `**<:cant:608719517337780244> Can't**\n`;
    Array.from(cant.values()).forEach((x, i, arr) => {
        content += `${x.name}`;
        if (arr.length - 1 !== i) {
            content += `, `;
        }
    });
    content += `\n\n`;

    // Print didn't react
    const reactors = Array.from(cant.keys()).concat(Array.from(rdy.keys()));
    let noReactors = memberNames.filter(x => !reactors.includes(x)).map((name) => {
        return {name: name};
    })

    content += `**Didn't react**\n`;
    noReactors.forEach((x, i, arr) => {
        content += `${x.name}`;
        if (arr.length - 1 !== i) {
            content += `, `;
        }
    });

    const dm = await user.createDM();
    await dm.send(content);
}

client.on('ready', async () => {
    const chans = await client.channels.cache.array().filter((c) => c['name'].indexOf("signup") > -1);
    chans.forEach((c) => {
        console.log(`Fetching 10 latest from ${c.name}`);
        c.messages.fetch({limit: 10});
    });

});
client.on('messageReactionAdd', async (reaction, user) => {
    const emoji = `${reaction.emoji}`;

    if (!isRaidMessage(reaction.message)) {
        return;
    }

    if ([customEmojis.getEmojiByName('info')].includes(emoji)) {
        await reaction.users.remove(user);
        await sendRaidInfo(reaction.message, user);
    }

});

process.on('unhandledRejection', up => {
    throw up
});
return client.login(config.token);
