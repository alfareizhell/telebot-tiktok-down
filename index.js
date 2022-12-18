"throw err";

// Instalation Using Yarn
// yarn add axios@0.27.0 cheerio express node-fetch@2.0 telebot

const TeleBot = require("telebot")
const fs = require('fs')
const fetch = require('node-fetch')
const tiktok = require('./lib/tiktok')

var antiSpam = []
var parseMode = 'html'

const bot = new TeleBot({
    token: "YOUR:BOT-TOKEN",
    usePlugins: ['floodProtection'],
    pluginConfig: {
        floodProtection: {
            interval: 2,
            message: 'Santai bang jangan diSpam'
        }
    }
});

var functions = {
    getBuffer: async function(url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            return buffer;
        } catch (error) {
            return {
                error
            };
        }
    },

    urlButton: function(title, url) {
        let replyMarkup = bot.inlineKeyboard([
            [bot.inlineButton(title, {
                url
            })]
        ]);
        return replyMarkup
    },

    cekUrl: function(entit) {
        return entit ? entit.some(i => i.type == 'url') : false
    }
}

bot.on('/start', msg => msg.reply.text("Selamat datang di <b>TikTok Downloader Bot</b>, silahkan mengirim link tiktok anda dan kami akan mengirim video / audio kepada anda", {
    parseMode,
    reply: msg.message_id
}))

bot.on('text', async (msg) => {
    let urlList = msg.text.split(/ +/).filter(x => /^https?:\/\//.test(x)).filter(y => y.includes('tiktok'))[0] || null
    let replyMarkup = bot.inlineKeyboard([
        [bot.inlineButton("🎥No Watermark", {
                callback: "nowm"
            }),
            bot.inlineButton("🎥Watermarked", {
                callback: "wm"
            })
        ],
        [bot.inlineButton("🎧Audio Only", {
                callback: "audio"
            }),
            bot.inlineButton("🎧Used Sound", {
                callback: "sound"
            })
        ],
        [bot.inlineButton("Cancel This Process", {
            callback: "cancel"
        })]
    ]);
    if (functions.cekUrl(msg.entities) && urlList.includes('tiktok')) {
        bot.sendAction(msg.chat.id, 'upload_document').catch(console.log)
        res = await tiktok(urlList)
        if (res.error) return bot.sendMessage(msg.chat.id, "Error", {
            reply: msg.message_id
        })
        if (res.novalid) {
            if (res.used_sound == null) return
            bot.sendAudio(msg.chat.id, await functions.getBuffer(res.used_sound), {
                reply: msg.message_id,
                caption: "Video yang anda kirim belum dapat kami validasi, maka bot hanya bisa mengirim Sound yang digunakan"
            })
        } else {
            if (res.sound) {
                caption = `<i><b>TikTok Sound Detected</b></i>\n________\n\n<tg-spoiler><b>Judul: </b>${res.title}\n<b>Pembuat: </b>${res.author}</tg-spoiler>`
                bot.sendAudio(msg.chat.id, await functions.getBuffer(res.url), {
                    reply: msg.message_id,
                    duration: res.duration,
                    title: res.title,
                    performer: res.author,
                    caption,
                    parseMode
                })
            } else {
                caption = `<b>Berhasil Menerima Video:</b>\n<i>${res.title}</i>\n___<a href='${urlList}'>_</a>___\n\nSilahkan memilih format file`
                bot.sendPhoto(msg.chat.id, res.thumbnail, {
                    reply: msg.message_id,
                    caption,
                    parseMode,
                    replyMarkup
                })
            }
        }
    } else if (msg.entities == undefined) {
        msg.reply.text("Halo kak, izinkan saya buat jelasin cara pakai botnya. nah kakaknya tinggal kirim aja link dari TikTok-nya nanti kita bakal kirim video/soundnya buat kakak", {
            reply: msg.message_id
        })
    }
});

bot.on('callbackQuery', async (msg) => {

    new Promise(resolve => {
        if (antiSpam.find(x => x.id == msg.message.chat.id) != undefined) return antiSpam.find(x => x.id == msg.message.chat.id).jum++
        antiSpam.push({
            id: msg.message.chat.id,
            jum: 0
        })
    })

    if (antiSpam.find(x => x.id == msg.message.chat.id).jum > 0) return bot.answerCallbackQuery(msg.id, {
        text: 'Jangan diSpam!!'
    }).catch(console.log)

    res = await tiktok(msg.message.caption_entities.filter(x => x.url)[0].url)

    new Promise(async (resolve) => {
        chatId = msg.message.chat.id
        messageId = msg.message.message_id
        bot.answerCallbackQuery(msg.id, {
            text: msg.data == 'cancel' ? "Berhasil Membatalkan Proses" : 'Sedang Diproses Silahkan Tunggu'
        }).then(() => {
            bot.deleteMessage(chatId, messageId)
        }).catch(console.log)
    })

    if (msg.data == 'cancel') antiSpam = antiSpam.filter(x => x.id != chatId)
    if (msg.data == 'nowm') {
        let caption = `<i>${res.title}</i>\n________\n\n<tg-spoiler>Uploaded By ${res.author}</tg-spoiler>`
        bot.sendVideo(chatId, await functions.getBuffer(res.nowm), {
            reply: msg.message.reply_to_message.message_id,
            caption,
            parseMode,
            replyMarkup: functions.urlButton("VideoNowm Url", res.nowm)
        }).then(() => {
            antiSpam = antiSpam.filter(x => x.id != chatId)
        }).catch(console.log)
    }
    if (msg.data == 'wm') {
        let caption = `<i>${res.title}</i>\n________\n\n<tg-spoiler>Uploaded By ${res.author}</tg-spoiler>`
        bot.sendVideo(chatId, await functions.getBuffer(res.wm), {
            reply: msg.message.reply_to_message.message_id,
            caption,
            parseMode,
            replyMarkup: functions.urlButton("VideoWm Url", res.wm)
        }).then(() => {
            antiSpam = antiSpam.filter(x => x.id != chatId)
        }).catch(console.log)
    }
    if (msg.data == 'audio') {
        let caption = `<i>${res.title}</i>\n________\n\n<tg-spoiler>Uploaded By ${res.author}</tg-spoiler>`
        bot.sendAudio(chatId, await functions.getBuffer(res.wm), {
            reply: msg.message.reply_to_message.message_id,
            title: res.title,
            performer: res.author,
            caption,
            parseMode,
            replyMarkup: functions.urlButton("Audio Url", res.audio)
        }).then(() => {
            antiSpam = antiSpam.filter(x => x.id != chatId)
        }).catch(console.log)
    }
    if (msg.data == 'sound') {
        let caption = `<i>${res.title}</i>\n________\n\n<tg-spoiler>Uploaded By ${res.author}</tg-spoiler>`
        bot.sendAudio(chatId, await functions.getBuffer(res.audio), {
            reply: msg.message.reply_to_message.message_id,
            title: res.title,
            performer: res.author,
            caption,
            parseMode,
            replyMarkup: functions.urlButton("Sound Url", res.audio)
        }).then(() => {
            antiSpam = antiSpam.filter(x => x.id != chatId)
        }).catch(console.log)
    }
})

bot.start()
