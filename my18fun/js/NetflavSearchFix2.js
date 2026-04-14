var rule = {
    title: 'Netflav',
    host: 'https://www.netflav.com',
    homeUrl: '/censored',
    url: '/fyclass?page=fypage',
    searchUrl: '/search?type=title&keyword=**',
    headers: {
        'User-Agent': 'okhttp/4.12.0',
        'Referer': 'https://www.netflav.com/'
    },
    timeout: 10000,
    class_name: '有碼&無修正&中文字幕',
    class_url: 'censored&uncensored&chinese-sub',
    limit: 20,
    searchable: 1,
    quickSearch: 1,
    filterable: 0,
    play_parse: true,
    lazy: `js:
        function parseState(html) {
            let match = html.match(/<script id="__NEXT_DATA__" type="application\\/json">(.*?)<\\/script>/);
            let data = match ? JSON.parse(match[1]) : {};
            return ((data || {}).props || {}).initialState || {};
        }
        function uniq(arr) {
            let out = [];
            let seen = {};
            arr.forEach(function (it) {
                let s = (it || '').trim();
                if (s && !seen[s]) {
                    seen[s] = 1;
                    out.push(s);
                }
            });
            return out;
        }
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
        function collectUrls(vod) {
            let urls = [];
            urls = urls.concat(vod.previewVideo ? [vod.previewVideo] : []);
            urls = urls.concat(vod.src ? [vod.src] : []);
            urls = urls.concat(vod.uSrc || []);
            urls = urls.concat(vod.srcs || []);
            urls = urls.concat(vod.otherSrcs || []);
            urls = urls.concat(buildDmmCandidates(vod.preview || ''));
            return uniq(urls.filter(function (u) {
                return /^https?:\\/\\//.test(u || '');
            }));
        }
        function direct(url) {
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
        let url = input || '';
        if (/ninjastream\\.to/.test(url)) {
            input = {
                jx: 1,
                parse: 1,
                url: url
            };
        } else if (/\\.m3u8(\\?|$)|\\.mp4(\\?|$)/.test(url)) {
            direct(url);
        } else if (/\\/video\\?id=/.test(url) || /netflav\\.com\\/.+video\\?id=/.test(url)) {
            let html = request(url);
            let state = parseState(html);
            let vod = ((state.video || {}).data || {});
            let urls = collectUrls(vod);
            let ninja = urls.find(function (u) { return /ninjastream\\.to/.test(u); });
            let media = urls.find(function (u) { return /\\.m3u8(\\?|$)|\\.mp4(\\?|$)/.test(u); });
            if (media) {
                direct(media);
            } else if (ninja) {
                input = {
                    jx: 1,
                    parse: 1,
                    url: ninja
                };
            } else if (urls.length > 0) {
                direct(urls[0]);
            } else {
                input = {
                    jx: 1,
                    parse: 1,
                    url: url
                };
            }
        } else {
            direct(url);
        }
    `,
    推荐: `js:
        function parseState(html) {
            let match = html.match(/<script id="__NEXT_DATA__" type="application\\/json">(.*?)<\\/script>/);
            let data = match ? JSON.parse(match[1]) : {};
            return ((data || {}).props || {}).initialState || {};
        }
        function toVod(it) {
            let title = (it.title || it.code || '').replace(/\\s+/g, ' ').trim();
            let pic = it.preview_hp || it.preview || '';
            let remark = it.code || ((it.sourceDate || '').slice(0, 10));
            return {
                vod_id: '/video?id=' + it.videoId,
                vod_name: title,
                vod_pic: pic,
                vod_remarks: remark
            };
        }
        let html = request(HOST + '/censored');
        let state = parseState(html);
        let docs = ((state.censored || {}).docs || []).slice(0, 20);
        VODS = docs.map(toVod);
    `,
    一级: `js:
        function parseState(html) {
            let match = html.match(/<script id="__NEXT_DATA__" type="application\\/json">(.*?)<\\/script>/);
            let data = match ? JSON.parse(match[1]) : {};
            return ((data || {}).props || {}).initialState || {};
        }
        function toVod(it) {
            let title = (it.title || it.code || '').replace(/\\s+/g, ' ').trim();
            let pic = it.preview_hp || it.preview || '';
            let remark = it.code || ((it.sourceDate || '').slice(0, 10));
            return {
                vod_id: '/video?id=' + it.videoId,
                vod_name: title,
                vod_pic: pic,
                vod_remarks: remark
            };
        }
        let html = request(input);
        let state = parseState(html);
        let key = 'censored';
        if (input.indexOf('/uncensored') > -1) {
            key = 'uncensored';
        } else if (input.indexOf('/chinese-sub') > -1) {
            key = 'chinese';
        }
        let docs = (state[key] || {}).docs || [];
        VODS = docs.map(toVod);
    `,
    二级: `js:
        function uniq(arr) {
            let out = [];
            let seen = {};
            arr.forEach(function (it) {
                let s = (it || '').trim();
                if (s && !seen[s]) {
                    seen[s] = 1;
                    out.push(s);
                }
            });
            return out;
        }
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
        function appendGroup(playFrom, playUrls, name, urls) {
            urls = uniq((urls || []).filter(function (u) { return /^https?:\\/\\//.test(u || ''); }));
            if (urls.length > 0) {
                playFrom.push(name);
                playUrls.push(urls.map(function (u, i) {
                    return name + (i + 1) + '$' + u;
                }).join('#'));
            }
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
        if (actors) content += (content ? '\\n' : '') + '演员: ' + actors;
        if (vod.studio) content += (content ? '\\n' : '') + '片商: ' + vod.studio;
        if (tags) content += (content ? '\\n' : '') + '标签: ' + tags;
        let playFrom = [];
        let playUrls = [];
        appendGroup(playFrom, playUrls, '预览', [vod.previewVideo, vod.src].concat(buildDmmCandidates(vod.preview || '')));
        appendGroup(playFrom, playUrls, '直链', [].concat(vod.srcs || [], vod.otherSrcs || []));
        appendGroup(playFrom, playUrls, 'NinjaStream', vod.uSrc || []);
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
        function parseState(html) {
            let match = html.match(/<script id="__NEXT_DATA__" type="application\\/json">(.*?)<\\/script>/);
            let data = match ? JSON.parse(match[1]) : {};
            return ((data || {}).props || {}).initialState || {};
        }
        function toVod(it) {
            let title = (it.title || it.code || '').replace(/\\s+/g, ' ').trim();
            let pic = it.preview_hp || it.preview || '';
            let remark = it.code || ((it.sourceDate || '').slice(0, 10));
            return {
                vod_id: '/video?id=' + it.videoId,
                vod_name: title,
                vod_pic: pic,
                vod_remarks: remark
            };
        }
        function uniq(arr) {
            let out = [];
            let seen = {};
            arr.forEach(function (it) {
                let s = (it || '').trim();
                if (s && !seen[s]) {
                    seen[s] = 1;
                    out.push(s);
                }
            });
            return out;
        }
        function cnSlices(str) {
            let chars = (str.match(/[\\u4e00-\\u9fa5]/g) || []).join('');
            let out = [];
            if (chars.length <= 3) return out;
            let lens = [3, 4, 5, 6];
            lens.forEach(function (len) {
                if (chars.length >= len) {
                    out.push(chars.slice(0, len));
                    out.push(chars.slice(chars.length - len));
                    for (let i = 1; i + len <= chars.length - 1; i++) {
                        out.push(chars.slice(i, i + len));
                    }
                }
            });
            return out;
        }
        function extractCode(str) {
            let m = str.toUpperCase().match(/[A-Z]{2,10}[\\-_ ]?\\d{2,6}/);
            return m ? m[0].replace(/\\s+/g, '-') : '';
        }
        function buildQueries(str) {
            let raw = (str || '').trim();
            let compact = raw.replace(/\\s+/g, '');
            let code = extractCode(raw);
            let codeAlt = code ? code.replace(/-/g, ' ') : '';
            let noDash = code ? code.replace(/-/g, '') : '';
            let shortTitle = raw.replace(/^[^A-Z\\u4e00-\\u9fa5]+/i, '').replace(/[|｜].*$/, '').trim();
            return uniq([raw, compact, code, codeAlt, noDash, shortTitle].concat(cnSlices(raw)));
        }
        function fetchByQuery(q) {
            let url = HOST + '/search?type=title&keyword=' + encodeURIComponent(q);
            let html = request(url);
            let state = parseState(html);
            let docs = ((state.search || {}).docs || []);
            return docs || [];
        }
        let queries = buildQueries(KEY);
        let results = [];
        let seen = {};
        for (let i = 0; i < queries.length; i++) {
            let docs = fetchByQuery(queries[i]);
            for (let j = 0; j < docs.length; j++) {
                let it = docs[j];
                let id = it.videoId || it.code || it.title;
                if (!seen[id]) {
                    seen[id] = 1;
                    results.push(toVod(it));
                }
            }
            if (results.length > 0 && i >= 1) break;
        }
        VODS = results;
    `
};
