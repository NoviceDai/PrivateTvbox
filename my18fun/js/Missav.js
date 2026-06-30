var rule = {
    title: 'Missav',
    host: 'https://missav.app',
    homeUrl: '/vodtype/20/',
    searchUrl: '/vodsearch/**----------fypage---.html',
    url: '/vodtype/fyclass/fypage/',
    headers: {
        'User-Agent': 'okhttp/4.12.0'
    },
    timeout: 10000,
    class_name: '国产精品&人妻素人&无码专区&欧美精品&动漫精品&综合三级',
    class_url: '20&21&22&23&24&25',
    limit: 24,
    play_parse: true,
    lazy: `js:
        let html = request(input);
        let match = html.match(/player_aaaa=(.*?)<\\/script>/);
        let player = match ? JSON.parse(match[1]) : {};
        let url = (player.url || '').replace(/\\\\\\//g, '/');
        input = url ? {
            jx: 0,
            parse: 0,
            url: url,
            header: JSON.stringify({
                'user-agent': 'okhttp/4.12.0',
                'referer': HOST + '/'
            })
        } : input;
    `,
    推荐: 'div.thumbnail;div.my-2 a&&Text;img.lozad&&data-src;span.absolute.bottom-1.right-1&&Text;div.my-2 a&&href',
    一级: 'div.thumbnail;div.my-2 a&&Text;img.lozad&&data-src;span.absolute.bottom-1.right-1&&Text;div.my-2 a&&href',
    二级: `js:
        let html = request(input);
        let title = pdfh(html, 'h1&&Text').replace(/\\s+/g, ' ').trim();
        let desc = pdfh(html, 'meta[name=description]&&content').replace(/\\s+/g, ' ').trim();
        let poster = '';
        let posterMatch = html.match(/data-src="(https?:\\/\\/[^"]+\\.(?:jpg|jpeg|png|webp))"/);
        if (!posterMatch) {
            posterMatch = html.match(/src="(https?:\\/\\/[^"]+\\.(?:jpg|jpeg|png|webp))"/);
        }
        if (posterMatch) {
            poster = posterMatch[1].replace(/\\\\\\//g, '/');
        }
        let playMatch = html.match(/player_aaaa=(.*?)<\\/script>/);
        let playData = playMatch ? JSON.parse(playMatch[1]) : {};
        let playUrl = (playData.url || '').replace(/\\\\\\//g, '/');
        VOD = {
            vod_name: title,
            vod_pic: poster,
            vod_remarks: 'MissAV',
            vod_content: desc,
            vod_play_from: 'MissAV',
            vod_play_url: (title || '播放') + '$' + playUrl
        };
    `,
    搜索: 'div.thumbnail;div.my-2 a&&Text;img.lozad&&data-src;span.absolute.bottom-1.right-1&&Text;div.my-2 a&&href',
    searchable: 2,
    quickSearch: 1,
    filterable: 0,
};
