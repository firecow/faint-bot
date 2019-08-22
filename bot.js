const fs = require('fs');
const capitalize = require('capitalize');
const chance = require('chance')();
const timeago = require('timeago.js');
const Discord = require('discord.js');
const client = new Discord.Client();
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const customEmojis = require("./customemojis");

const localeFunc = (number, index, total_sec) => {
    return [
        ['now', 'right now'],
        ['%ss', 'in %s seconds'],
        ['1m', 'in 1 minute'],
        ['%sm', 'in %s minutes'],
        ['1h', 'in 1 hour'],
        ['%sh', 'in %s hours'],
        ['1d', 'in 1 day'],
        ['%sd', 'in %s days'],
        ['1w', 'in 1 week'],
        ['%sw', 'in %s weeks'],
        ['1m', 'in 1 month'],
        ['%sm', 'in %s months'],
        ['1y', 'in 1 year'],
        ['%sy', 'in %s years']
    ][index];
};
// register your locale with timeago
timeago.register('my-locale', localeFunc);
const ago = (s) => timeago.format(s, 'my-locale');



const signupRegex = /(\d{1,2}) (January|Feburary|March|April|May|June|July|August|September|October|November|December) (\d{4}).*\[(Raid)\]/;

function getGuild() {
    return client.guilds.find(g => g.id === "605864258819063839" );
}

function getMessageFilename(message) {
    return `${message.id}.jsonl`;
}

function memberName(user) {
    const guild = getGuild();
    const member = guild.members.find(m => m.user.id === user.id);
    return member ? member.nickname || member.user.username : `${user.username} (Not in guild)`;
}

function filterMessages(messages, type) {
    const raidMessages = [];
    messages.forEach((message) => {
        const match = signupRegex.exec(message.content);
        if (match && match[4].toLowerCase() === type) {
            raidMessages.push(message);
        }
    });
    return raidMessages;
}

function isRaidMessage(message) {
    return filterMessages([message], 'raid').length > 0;
}

async function cron() {
    let messages = [];

    for (const channelName of config.channels) {
        let channel = client.channels.find(channel => channel.name === channelName);
        const fetchedMessage = await channel.fetchMessages({limit: 50});
        fetchedMessage.forEach(m => messages.push(m));
    }

    await removeInvalidEmojisFromMessages(messages);

    // Checkup on roles
    const guild = getGuild();
    guild.members.forEach(d => {
        const roles = d.roles.sort((a, b) => a.position - b.position).filter(d => d.name.indexOf("@everyone") === -1 );
        if (roles.find(d => d.name === "Guild" && roles.find(d => d.name === "Friend"))) {
            console.log(`Weird roles ${memberName(d.user)}, ${roles.map(d => d.name)}`);
        }
        if (roles.array().length === 0) {
            console.log('No roles', memberName(d.user), roles.map(d => d.name));
        }
    });
}

async function removeInvalidEmojisFromMessages(messages) {
    const raidMessages = filterMessages(messages, 'raid');
    const eventMessages = filterMessages(messages, 'event');

    for (let i = 0; i < raidMessages.length; i++) {
        await removeInvalidRaidEmojis(raidMessages[i]);
    }
}

async function removeInvalidRaidEmojis(raidMessage) {
    const userReactions = new Map();
    for (const [key, reaction] of raidMessage.reactions) {
        const users = await reaction.fetchUsers();

        for (let [key, user] of users) {
            if (!customEmojis.isValidEmoji(`${reaction.emoji}`)) {
                await reaction.remove(user);
                const dm = await user.createDM();
                dm.send(`You are high, I have removed ${reaction.emoji}`);
            }

            const name = memberName(user);
            userReactions.set(name, userReactions.get(name) || { primary: [], user: user});
            if (customEmojis.isPrimaryEmoji(`${reaction.emoji}`)) {
                userReactions.get(name).primary.push(reaction);
            }
        }
    }

    for (const [name, userReaction] of userReactions) {
        const primaryReactions = userReaction.primary;
        const user = userReaction.user;
        if (primaryReactions.length <= 1) {
            continue;
        }

        const emojiStrings = [];
        for (let i = 0; i < primaryReactions.length; i++) {
            emojiStrings.push(`${primaryReactions[i].emoji}`);
        }

        const removed = [];
        for (let i = 1; i < primaryReactions.length; i++) {
            await primaryReactions[i].remove(user);
            removed.push(`${primaryReactions[i].emoji}`);
        }

        const dm = await user.createDM();
        dm.send(`Impossible combination ${emojiStrings.join(' ')}, I have removed ${removed.join(' ')}`);
    }
}

async function sendGuildInfo(user) {
    const classes = [
        "Rogue", "Warrior", "Priest", "Priest",
        "Warlock", "Mage", "Druid", "Shaman", "Hunter"
    ];
    const rolesToInclude = ["Guild", "Class Leader", "Officer"];
    const guild = getGuild();
    const guildies = [];
    guild.members.forEach((m) => {
       if (m.roles.filter(r => rolesToInclude.includes(r.name)).array().length > 0) {
           guildies.push(m);
       }
    });
    const dm = await user.createDM();
    let txt = `**Guild Details**\n`;

    txt += `Guildies: **${guildies.length}**\n\n`;

    classes.forEach((clazz) => {
        const length = guildies.filter(m => m.roles.filter(r => r.name === clazz).array().length).length;
        txt += `${clazz} **${length}**\n`;
    });

    dm.send(txt);
}

async function sendRaidInfo(message, user) {
    const filename = `logs/${getMessageFilename(message)}`;

    const logs = fs.existsSync(filename) ? fs.readFileSync(filename, 'utf8') : "";
    let content = `${message.content.split('\n')[0]}\n`;

    const classes = ['warrior', 'rogue', 'warlock', 'mage', 'hunter', 'druid', 'priest', 'shaman'];
    const rdyLogs = new Map();
    const cantLogs = new Map();
    const lastDel = new Map();

    const rdy = new Map();
    const cant = new Set();
    const additions = [];

    if (logs !== "") {
        // Travers logs and find latest.
        logs.split('\n').forEach((line) => {
            if (line === '') {
                return;
            }
            const data = JSON.parse(line);
            const name = data.name;
            if (data.type === 'add') {
                const clazz = customEmojis.getPrimaryNameByEmoji(data.emoji);
                if (clazz) {
                    data.class = clazz;
                    rdyLogs.set(name, data);
                } else if (data.emoji === customEmojis.getEmojiByName('cantcome')) {
                    cantLogs.set(name, data);
                }
            } else if (data.type === 'del') {
                lastDel.set(name, data);
            }
        });
    }

    // Traverse reactions
    for (const [key, reaction] of message.reactions) {
        const users = await reaction.fetchUsers();
        const emoji = `${reaction.emoji}`;

        for (let [key, user] of users) {
            const name = memberName(user);
            const clazz = customEmojis.getPrimaryNameByEmoji(emoji);
            if (clazz !== null) {
                rdy.set(name, {name: name, class: clazz});
            } else if (emoji === customEmojis.getEmojiByName('cantcome')) {
                cant.add(name);
            } else {
                additions.push({name: name, reaction: reaction});
            }
        }
    }

    // Compare cants rdys with all guild members
    const guild = getGuild();
    const memberNames = [];
    guild.members.forEach(d => {
        if (d.roles.map(d => d.name).includes("Guild")) {
            memberNames.push(memberName(d.user));
        }
    });

    // Print classes
    classes.forEach((clazz) => {
        let signups = Array.from(rdy.values()).filter((d) => d.class === clazz);
        signups = signups.map((s) => {
            const log = rdyLogs.get(s.name);
            s.time = log ? log.time : null;
            return s;
        });
        signups.sort((a, b) => a.time - b.time);
        content += `\n**${capitalize(clazz)}** (${signups.length})`;
        signups.forEach((s) => {
            const additionsShorts = additions.filter(d => s.name === d.name).map(d => customEmojis.getShortByEmoji(`${d.reaction.emoji}`));
            const log = rdyLogs.get(s.name);
            content += `\n${s.name}`;
            if (additionsShorts.length > 0) content += ` (${additionsShorts.join( )})`;
            if (log) content += ` [${ago(log.time)}]`;
        });
        content += `\n`;
    });

    // Print cants
    content += `\n**Can't** (${Array.from(cant.keys()).length})`;
    cant.forEach((name) => {
        content += `\n${name}`;
        const log = cantLogs.get(name);
        if (log) content += ` [${ago(log.time)}]`;
    });
    content += `\n`;

    // Print didn't react
    const reactors = Array.from(cant.keys()).concat(Array.from(rdy.keys()));
    let noReactors = memberNames.filter(x => !reactors.includes(x)).map((name) => {
        const log = lastDel.get(name);
        return {name: name, time: log ? log.time : null};
    }).sort((a, b) => {
        return b.time - a.time;
    });

    content += `\n**Didn't react** (${noReactors.length})\n`;
    noReactors.forEach((x) => {
        content += `${x.name}`;
        if (x.time) content += ` [${ago(x.time)}]`;
        content += `, `;
    });


    const dm = await user.createDM();
    dm.send(content);
}

function addToLog(filename, data) {
    fs.appendFileSync(`logs/${filename}`, `${JSON.stringify(data)}\n`);
}
// Update messages every 10 sec and on login.
setInterval(cron, 10000);

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    await cron();
});
client.on('messageReactionAdd', async (reaction, user) => {
    const emoji = `${reaction.emoji}`;
    const name = memberName(user);

    if (!isRaidMessage(reaction.message)) {
        return;
    }

    if ([customEmojis.getEmojiByName('info')].includes(emoji)) {
        await reaction.remove(user);
        await sendRaidInfo(reaction.message, user);
    } else {
        const filename = getMessageFilename(reaction.message);
        addToLog(filename, {name: name, emoji: emoji, type: 'add', time: Date.now()});
    }
    await removeInvalidEmojisFromMessages([reaction.message]);
});
client.on('messageReactionRemove', async (reaction, user) => {
    const emoji = `${reaction.emoji}`;
    const name = memberName(user);

    if (!isRaidMessage(reaction.message)) {
        return;
    }

    if ([customEmojis.getEmojiByName('info')].includes(emoji)) {
        return null;
    } else {
        const filename = getMessageFilename(reaction.message);
        addToLog(filename, {name: name, emoji: emoji, type: 'del', time: Date.now()});
    }
    await removeInvalidEmojisFromMessages([reaction.message]);
});

client.on('message', async (message) => {
    if (message.author.bot) {
        return;
    }

    const content = message.content;
    if (message.channel.type === 'dm') {
        switch (content) {
            case '!guilddetails':
                await sendGuildInfo(message.author);
                break;

            default:
                let reply = `'${message.content}' makes no sense, and I have a brain the size of a planet.\n\n`;
                reply += `**Commands**\n`;
                reply += `\`!guilddetails\``;
                await message.reply(reply);
                break;
        }
    }
});

function getQuote() {
    const quotes = [
        '“Marvin is humming ironically because he hates humans so much.”',
        '“Why should I want to make anything up? Life\'s bad enough as it is without wanting to invent any more of it.”'
    ];
    return chance.pickone(quotes);
}

process.on('unhandledRejection', up => { throw up });
return client.login(config.token);
