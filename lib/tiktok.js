const axios = require("axios");
const cheerio = require("cheerio");

module.exports = async function(query) {
    let response = await axios("https://lovetik.com/api/ajax/search", {
        method: "POST",
        data: new URLSearchParams(Object.entries({
            query
        })),
    });

    result = {};

    if (response.data.mess?.length > 0) {
        result.error = true
    } else {
        if (response.data?.p == "music") {
            result.title = response.data.music.title;
            result.author = response.data.music.authorName;
            result.duration = response.data.music.duration;
            result.url = response.data.music.playUrl;
            result.cover = response.data.music.cover;
            result.sound = true;
            return result
        } else {
            if (response.data.links.find(x => x.s.includes('NO watermark')) == undefined || response.data.links.find(x => x.s.includes('Watermarked')) == undefined) {
                result.novalid = true
                result.used_sound = response.data.links.filter(x => x.t.includes("MP3 Audio"))[0].a || null
                return result
            } else {
                result.audio = response.data.links.filter(x => x.t.includes("MP3 Audio"))[0].a
                result.nowm = response.data.links.filter(x => x.s.includes("NO watermark"))[0].a
                result.wm = response.data.links.filter(x => x.s.includes("Watermarked"))[0].a
            }
            result.title = response.data.desc.length < 1 ? "Tanpa Caption" : response.data.desc
            result.author = response.data.author
            result.thumbnail = response.data.cover
        }
    }
    return result;
}.bind();