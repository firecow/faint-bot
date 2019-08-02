const fs = require('fs');
const Discord = require('discord.js');
const client = new Discord.Client();
const token = JSON.parse(fs.readFileSync('token.json', 'utf8')).token;

const emojiMap = {
    'warrior': '<:warrior:606738496551387137>',
    'rogue': '<:rogue:606741861322719232>',
    'warlock': '<:warlock:606741861356535829>',
    'mage': '<:mage:606741861234901023>',
    'hunter': '<:hunter:606741861360467978>',
    'druid': '<:druid:606741861268324352>',
    'priest': '<:priest:606741861322981386>',
    'shaman': '<:shaman:606741861826166794>',
};

const signupRegex = /(\d{1,2}) (September|August) (\d{4}).*\[(Raid)\]/;
let raidMessages = [];
let eventMessages = [];

function getRaidLogFilename(message) {
    const match = signupRegex.exec(message.content);
    if (!match || match[4].toLowerCase() !== 'raid') {
        throw new Error(`getRaidLogFilename received non raid message\n${message.content}`)
    }
    const day = match[1].toLowerCase();
    const month = match[2].toLowerCase();
    const year = match[3].toLowerCase();
    const type = match[4].toLowerCase();
    return `${year}_${month}_${day}_${type}`;
}

function memberName(user) {
    const guild = client.guilds.find(g => g.id === "605864258819063839" );
    const member = guild.members.find(m => m.user.id === user.id);
    return member.nickname || member.user.username;
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

async function cron() {
    let messages;
    let channel = client.channels.find(channel => channel.name.indexOf('signup-bot-test') > -1);
    messages = await channel.fetchMessages({limit: 20});

    channel = client.channels.find(channel => channel.name.indexOf('raid-signup') > -1);
    messages = messages.concat(await channel.fetchMessages({limit: 20}));

    raidMessages = filterMessages(messages, 'raid');
    eventMessages = filterMessages(messages, 'event');

    for (let i = 0; i < raidMessages.length; i++) {
        console.log('s');
        await removeInvalidRaidEmojis(raidMessages[i]);
        console.log('e');
    }
}

async function removeInvalidRaidEmojis(raidMessage) {
    const userReactions = new Map();
    for (let [key, reaction] of raidMessage.reactions) {
        const users = await reaction.fetchUsers();
        for (let [key, user] of users) {
            const name = memberName(user);
            userReactions.set(name, userReactions.get(name) || { primary: [], user: user});
            userReactions.get(name).primary.push(reaction);
        }
    }

    for (const [name, reactions] of userReactions) {
        if (reactions.primary.length === 1) {
            continue;
        }

        //TODO:  Remove reactions and send PM to the dude.
    }
}

// Update messages every 10 sec and on login.
setInterval(cron, 10000);

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    await cron();
});

process.on('unhandledRejection', up => { throw up });

return client.login(token);

// TODO: Detect posts in channel written by officer.

// (?<day>\d{1,2}) (?<month>September|Auguest) (?<year>\d{4}).*\[(?<type>Raid)\]
// NjA2NDU5MDI2NzgzMzM4NTI2.XUPSoQ._oTa4B9vfjQDv7JBSsxqlp9Bn1Y
// fs.appendFileSync("logs/filename.txt", "a log line\n");



