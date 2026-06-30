var rule = {
    title: 'Netflav',
    host: 'https://netflav.com',
    homeUrl: '/censored',
    url: '/fyclass?page=fypage',
    searchUrl: '/search?type=title&keyword=**',
    headers: {
        'User-Agent': 'okhttp/4.12.0'
    },
    timeout: 10000,
    class_name: '有碼&無修正&中文字幕',
    class_url: 'censored&uncensored&chinese-sub',
    limit: 20,
    searchable: 2,
    quickSearch: 1,
    filterable: 0,
    play_parse: true,
    lazy: `js:
        let url = input || '';
        if (/ninjastream\\.to/.test(url)) {
            input = {
                jx: 1,
                parse: 1,
                url: url
            };
        } else {
            input = {
                jx: 0,
                parse: 0,
                url: url,
                header: JSON.stringify({
                    'user-agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36',
                    'referer': HOST + '/',
                    'origin': HOST,
                    'accept': '*/*'
                })
            };
        }
    `,
    推荐: `js:
        let html = request(HOST + '/censored');
        let match = html.match(/<script id="__NEXT_DATA__" type="application\\/json">(.*?)<\\/script>/);
        let data = match ? JSON.parse(match[1]) : {};
        let docs = (((data || {}).props || {}).initialState || {}).censored || {};
        docs = docs.docs || [];
        VODS = docs.map(function (it) {
            let title = (it.title || it.code || '').replace(/\\s+/g, ' ').trim();
            let pic = it.preview_hp || it.preview || '';
            let remark = it.code || ((it.sourceDate || '').slice(0, 10));
            return {
                vod_id: '/video?id=' + it.videoId,
                vod_name: title,
                vod_pic: pic,
                vod_remarks: remark
            };
        });
    `,
    一级: `js:
        let html = request(input);
        let match = html.match(/<script id="__NEXT_DATA__" type="application\\/json">(.*?)<\\/script>/);
        let data = match ? JSON.parse(match[1]) : {};
        let state = (((data || {}).props || {}).initialState || {});
        let key = 'censored';
        if (input.indexOf('/uncensored') > -1) {
            key = 'uncensored';
        } else if (input.indexOf('/chinese-sub') > -1) {
            key = 'chinese';
        }
        let docs = (state[key] || {}).docs || [];
        VODS = docs.map(function (it) {
            let title = (it.title || it.code || '').replace(/\\s+/g, ' ').trim();
            let pic = it.preview_hp || it.preview || '';
            let remark = it.code || ((it.sourceDate || '').slice(0, 10));
            return {
                vod_id: '/video?id=' + it.videoId,
                vod_name: title,
                vod_pic: pic,
                vod_remarks: remark
            };
        });
    `,
    二级: `js:
        function buildDmmCandidates(pic) {
            let urls = [];
            if (!pic) return urls;
            let m = pic.match(/pics\\.dmm\\.co\\.jp\\/digital\\/video\\/(\\w+)\\/(\\w+)pl\\.jpg/);
            if (!m) return urls;
            let code = m[1];
            let parts = code.match(/(\\w)(\\w{2})(\\w{3})(\\w+)/);
            if (!parts) return urls;
            urls.push('https://cc3001.dmm.co.jp/hlsvideo/freepv/' + parts[1] + '/' + parts[1] + parts[2] + '/' + code + '/' + code + '_dmb_w.m3u8');
            let trimmed = code.replace('00', '');
            urls.push('https://cc3001.dmm.co.jp/hlsvideo/freepv/' + parts[1] + '/' + parts[1] + parts[2] + '/' + trimmed + '/' + trimmed + '_dmb_w.m3u8');
            urls.push('https://cc3001.dmm.co.jp/hlsvideo/freepv/' + parts[1] + '/' + parts[1] + parts[2] + '/' + trimmed + '/' + trimmed + 'mmb.m3u8');
            return urls;
        }
        let html = request(input);
        let match = html.match(/<script id="__NEXT_DATA__" type="application\\/json">(.*?)<\\/script>/);
        let data = match ? JSON.parse(match[1]) : {};
        let vod = ((((data || {}).props || {}).initialState || {}).video || {}).data || {};
        let title = (vod.title || vod.code || '').replace(/\\s+/g, ' ').trim();
        let actors = (vod.actors || []).filter(function (it) {
            return it.indexOf('jp:') !== 0 && it.indexOf('zh:') !== 0 && it.indexOf('en:') !== 0;
        }).slice(0, 5).join(' / ');
        let tags = (vod.tags || []).filter(function (it) {
            return it.indexOf('jp:') !== 0 && it.indexOf('zh:') !== 0 && it.indexOf('en:') !== 0;
        }).slice(0, 6).join(' / ');
        let content = (vod.description || '').replace(/\\s+/g, ' ').trim();
        if (actors) {
            content = (content ? content + '\\n' : '') + '演员: ' + actors;
        }
        if (vod.studio) {
            content = (content ? content + '\\n' : '') + '片商: ' + vod.studio;
        }
        if (tags) {
            content = (content ? content + '\\n' : '') + '标签: ' + tags;
        }
        let playFrom = [];
        let playUrls = [];
        if (vod.previewVideo) {
            playFrom.push('DMM预览');
            playUrls.push('预览$' + vod.previewVideo);
        }
        let dmmCandidates = buildDmmCandidates(vod.preview || '');
        if (!vod.previewVideo && dmmCandidates.length > 0) {
            playFrom.push('DMM候选');
            playUrls.push(dmmCandidates.map(function (u, i) {
                return '候选' + (i + 1) + '$' + u;
            }).join('#'));
        }
        if ((vod.uSrc || []).length > 0) {
            playFrom.push('NinjaStream');
            playUrls.push('外链$' + vod.uSrc[0]);
        }
        if (playFrom.length === 0) {
            playFrom.push('Netflav');
            playUrls.push('详情$' + input);
        }
        VOD = {
            vod_name: title,
            vod_pic: vod.preview || vod.preview_hp || '',
            vod_remarks: vod.code || 'Netflav',
            vod_content: content,
            vod_play_from: playFrom.join('$$$'),
            vod_play_url: playUrls.join('$$$')
        };
    `,
    搜索: `js:
        let html = request(input);
        let match = html.match(/<script id="__NEXT_DATA__" type="application\\/json">(.*?)<\\/script>/);
        let data = match ? JSON.parse(match[1]) : {};
        let docs = ((((data || {}).props || {}).initialState || {}).search || {}).docs || [];
        VODS = docs.map(function (it) {
            let title = (it.title || it.code || '').replace(/\\s+/g, ' ').trim();
            let pic = it.preview_hp || it.preview || '';
            let remark = it.code || ((it.sourceDate || '').slice(0, 10));
            return {
                vod_id: '/video?id=' + it.videoId,
                vod_name: title,
                vod_pic: pic,
                vod_remarks: remark
            };
        });
    `
};
