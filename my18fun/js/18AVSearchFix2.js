var rule = {
    title: '18AV',
    host: 'https://18av.mm-cg.com',
    homeUrl: '/zh/',
    url: '/zh/fyclass/all/fypage.html',
    searchUrl: '/zh/fc_search/all/**/1.html',
    search_encoding: 'utf-8',
    headers: {
        'User-Agent': 'okhttp/4.12.0',
        'Referer': 'https://18av.mm-cg.com/zh/'
    },
    timeout: 10000,
    class_name: '中文字幕&有碼AV&無碼破解&素人AV&無碼AV&H動畫',
    class_url: 'chinese_list&censored_list&reducing-mosaic_list&amateurjav_list&uncensored_list&animation_list',
    limit: 24,
    searchable: 1,
    quickSearch: 1,
    filterable: 0,
    play_parse: true,
    lazy: `js:
        let parts = input.split('@@');
        let detailUrl = parts[0];
        let prefer = parts[1] || '1080';
        let html = request(detailUrl);
        let encMatch = html.match(new RegExp("mvarr\\\\['" + (prefer === '720' ? '11_1' : '10_1') + "'\\\\]=\\\\[\\\\['[^']+','([^']+)'"));
        if (!encMatch) {
            encMatch = html.match(/mvarr\\['10_1'\\]=\\[\\['[^']+','([^']+)'/);
        }
        let enc = encMatch ? encMatch[1] : '';
        let xorMatch = html.match(/hadeedg252=(\\d+)/);
        let baseMatch = html.match(/hcdeedg252=(\\d+)/);
        let keyMatch = html.match(/argdeqweqweqwe\\s*=\\s*'([^']+)'/);
        let ivMatch = html.match(/hdddedg252\\s*=\\s*'([^']+)'/);
        let xorVal = xorMatch ? parseInt(xorMatch[1], 10) : 14;
        let baseVal = baseMatch ? parseInt(baseMatch[1], 10) : 9;
        let aesKey = keyMatch ? keyMatch[1] : '86958b3d056929c4';
        let aesIv = ivMatch ? ivMatch[1] : '1d5beb1e7d56b2f3';
        function decodeId(str, base, xorKey) {
            let sep = String.fromCharCode(base + 97);
            let out = [];
            let arr = (str || '').split(sep);
            for (let i = 0; i < arr.length; i++) {
                let num = parseInt(arr[i], base);
                if (!isNaN(num)) {
                    out.push(String.fromCharCode((num ^ xorKey)));
                }
            }
            return out.join('');
        }
        let cipherText = decodeId(enc, baseVal, xorVal);
        let key = CryptoJS.enc.Utf8.parse(aesKey);
        let iv = CryptoJS.enc.Utf8.parse(aesIv);
        let playId = CryptoJS.AES.decrypt(cipherText, key, {
            iv: iv,
            padding: CryptoJS.pad.Pkcs7
        }).toString(CryptoJS.enc.Utf8);
        let iframeUrl = HOST + '/js/player/play.php?numresolution=' + prefer + '&id=' + playId;
        let iframeHtml = request(iframeUrl);
        let sources = [];
        let reg = /\\{src:\\s*'([^']+\\.m3u8[^']*)',[^}]*size:\\s*(\\d+)/g;
        let m;
        while ((m = reg.exec(iframeHtml)) !== null) {
            sources.push({
                url: m[1],
                size: parseInt(m[2], 10) || 0
            });
        }
        if (sources.length === 0) {
            let reg2 = /src:\\s*'([^']+\\.m3u8[^']*)'/g;
            while ((m = reg2.exec(iframeHtml)) !== null) {
                sources.push({
                    url: m[1],
                    size: 0
                });
            }
        }
        let picked = '';
        if (sources.length > 0) {
            if (prefer === '720') {
                sources.sort((a, b) => {
                    let ax = Math.abs((a.size || 720) - 720);
                    let bx = Math.abs((b.size || 720) - 720);
                    return ax - bx;
                });
            } else {
                sources.sort((a, b) => (b.size || 0) - (a.size || 0));
            }
            picked = sources[0].url;
        }
        input = picked ? {
            jx: 0,
            parse: 0,
            url: picked,
            header: JSON.stringify({
                'user-agent': 'okhttp/4.12.0',
                'referer': HOST + '/',
                'origin': HOST
            })
        } : input;
    `,
    推荐: '.post.video_9s;h3 a&&Text;figure img&&src;.meta&&Text;h3 a&&href',
    一级: '.post.video_9s;h3 a&&Text;figure img&&src;.meta&&Text;h3 a&&href',
    二级: `js:
        let html = request(input);
        let title = pdfh(html, 'h1&&Text').replace(/\\s+/g, ' ').trim();
        let content = pdfh(html, 'meta[name=description]&&content').replace(/\\s+/g, ' ').trim();
        let pic = pdfh(html, '#player-wrap img&&src');
        if (!pic) {
            let picMatch = html.match(/"thumbnailUrl":"([^"]+)"/);
            pic = picMatch ? picMatch[1].replace(/\\\\\\//g, '/') : '';
        }
        let dateMatch = html.match(/"uploadDate":"([^"]+)"/);
        let remark = dateMatch ? dateMatch[1] : pdfh(html, '.meta&&Text').replace(/\\s+/g, ' ').trim();
        let plays = [];
        if (/jfun_show_vfcz_1080p/.test(html)) plays.push('1080P$' + input + '@@1080');
        if (/jfun_show_vfcz_720p/.test(html)) plays.push('720P$' + input + '@@720');
        if (plays.length === 0) plays.push('播放$' + input + '@@1080');
        VOD = {
            vod_name: title,
            vod_pic: pic,
            vod_remarks: remark || '18AV',
            vod_content: content,
            vod_play_from: '18AV',
            vod_play_url: plays.join('#')
        };
    `,
    搜索: `js:
        function parseCards(html) {
            let list = [];
            let reg = /<div class='post video_9s'>[\\s\\S]*?<a[^>]*href="([^"]+)"[^>]*><img src='([^']+)'[^>]*><video[\\s\\S]*?<h3[^>]*><a[^>]*>([\\s\\S]*?)<\\/a><\\/h3>[\\s\\S]*?<div class='meta'>([\\s\\S]*?)<\\/div>/g;
            let match;
            while ((match = reg.exec(html)) !== null) {
                let href = (match[1] || '').trim();
                let pic = (match[2] || '').trim();
                let title = (match[3] || '').replace(/<[^>]+>/g, '').replace(/\\s+/g, ' ').trim();
                let remark = (match[4] || '').replace(/<[^>]+>/g, '').replace(/\\s+/g, ' ').trim();
                if (href && title) {
                    list.push({
                        title: title,
                        pic_url: pic,
                        desc: remark || '18AV',
                        url: href
                    });
                }
            }
            return list;
        }
        let tries = [];
        let seen = {};
        function addTry(word) {
            word = (word || '').replace(/\\s+/g, ' ').trim();
            if (!word || seen[word]) return;
            seen[word] = 1;
            tries.push(word);
        }
        let key = (KEY || '').trim();
        addTry(key);
        let codeMatch = key.match(/[A-Za-z]{2,10}[-_\\s]?\\d{2,6}/);
        if (codeMatch) {
            let code = codeMatch[0].toUpperCase().replace(/[_\\s]+/g, '-');
            addTry(code);
            addTry(code.replace(/-/g, ' '));
        }
        let firstPart = key.split(/[。.!！?？]/)[0].trim();
        if (firstPart && firstPart !== key) addTry(firstPart);
        let bracketPart = key.replace(/^\\[[^\\]]+\\]\\s*/, '').trim();
        if (bracketPart && bracketPart !== key) addTry(bracketPart);
        let finalList = [];
        let merged = {};
        for (let i = 0; i < tries.length; i++) {
            let word = tries[i];
            let html = request(HOST + '/zh/fc_search/all/' + encodeURIComponent(word) + '/1.html');
            let list = parseCards(html);
            for (let j = 0; j < list.length; j++) {
                let item = list[j];
                if (!merged[item.url]) {
                    merged[item.url] = 1;
                    finalList.push(item);
                }
            }
            if (finalList.length > 0 && i > 0) break;
        }
        setResult(finalList);
    `
};
