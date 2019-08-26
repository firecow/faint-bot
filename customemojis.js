module.exports = {
    primaries: [
        {name: 'cantcome', short: 'cant', emoji: '<:cant:608719517337780244>'}
    ],
    clazz: [
        {name: 'warrior', short: 'warr', emoji: '<:warrior:608719517098442763>'},
        {name: 'rogue', short: 'rog', emoji: '<:rogue:608719517400432647>'},
        {name: 'warlock', short: 'lock', emoji: '<:warlock:608719517379461130>'},
        {name: 'mage', short: 'mag', emoji: '<:mage:608719517480386560>'},
        {name: 'hunter', short: 'hun', emoji: '<:hunter:608719517484449810>'},
        {name: 'druid', short: 'dru', emoji: '<:druid:608719517383917568>'},
        {name: 'priest', short: 'pri', emoji: '<:priest:608719516968419341>'},
        {name: 'shaman', short: 'sha', emoji: '<:shaman:608719517023076370>'},
    ],
    additionals: [
        {name: 'tank', short: 'T', emoji: '<:tank:608719517392044044>'},
        {name: 'little_late', short: 'LL', emoji: '<:little_late:608723791425568787>'},
        {name: 'very_late', short: 'VL', emoji: '<:very_late:608723791463448586>'},
        {name: 'info', short: 'I', emoji: '<:info:608724535591698442>'}
    ],
    isValidEmoji: function(emoji) {
        return this.lists().find(d => d.emoji === emoji) != null;
    },
    isClassEmoji: function (emoji) {
        return this.clazz.find(d => d.emoji === emoji) != null;
    },
    isPrimaryEmoji: function (emoji) {
        return this.primaries.concat(this.clazz).find(d => d.emoji === emoji) != null;
    },
    getShortByEmoji: function(emoji) {
        const custom = this.lists().find(d => d.emoji === emoji);
        return custom ? custom.short : null;
    },
    getNameByEmoji: function(emoji) {
        const custom = this.lists().find(d => d.emoji === emoji);
        return custom ? custom.name : null;
    },
    getEmojiByName: function(name) {
        const custom = this.lists().find(d => d.name === name);
        return custom ? custom.emoji : null;
    },
    lists: function() {
        return this.primaries.concat(this.additionals).concat(this.clazz);
    }
};
