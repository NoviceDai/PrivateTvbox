var rule = {
    title: 'Jable',
    host: 'https://jable.tv',
    homeUrl: '/latest-updates/',
    url: '/fyclass/fypage/',
    searchUrl: '/search/**/',
    search_encoding: 'utf-8',
    searchable: 1,
    quickSearch: 1,
    filterable: 0,
    headers: {
        'User-Agent': 'okhttp/4.12.0',
        'Referer': 'https://jable.tv/'
    },
    timeout: 5000,
    class_name: '最近更新&熱門&中文字幕',
    class_url: 'latest-updates&hot&categories/chinese-subtitle',
    play_parse: true,
    lazy: `js:
        input = {
            jx: 0,
            url: input,
            parse: 0,
            header: JSON.stringify({
                'user-agent': 'okhttp/4.12.0',
                'referer': HOST + '/'
            })
        };
    `,
    limit: 24,
    推荐: 'div.video-img-box;h6.title a&&Text;img&&data-src;span.label&&Text;h6.title a&&href',
    一级: 'div.video-img-box;h6.title a&&Text;img&&data-src;span.label&&Text;h6.title a&&href',
    二级: `js:
        let html = request(input);
        let title = pdfh(html, 'div.header-left h4&&Text').replace(/\\s+/g, ' ').trim();
        let remark = pdfh(html, 'div.header-right .label&&Text').replace(/\\s+/g, ' ').trim();
        if (!remark) {
            let info = pdfh(html, 'div.info-header&&Text').replace(/\\s+/g, ' ').trim();
            let m = info.match(/●\\s*([^\\s]+)/);
            remark = m ? m[1] : 'Jable';
        }
        let content = pdfh(html, 'meta[name=description]&&content').replace(/\\s+/g, ' ').trim();
        let poster = '';
        let posterMatch = html.match(/<video poster="(.*?)"/);
        if (posterMatch) {
            poster = posterMatch[1];
        }
        let playUrl = '';
        let playMatch = html.match(/var hlsUrl = '(.*?)';/);
        if (playMatch) {
            playUrl = playMatch[1];
        }
        VOD = {
            vod_name: title,
            vod_pic: poster,
            vod_remarks: remark || 'Jable',
            vod_content: content,
            vod_play_from: 'Jable',
            vod_play_url: (remark || title || '播放') + '$' + playUrl
        };
    `,
    搜索: `js:
        function parseCards(html) {
            let list = [];
            let reg = /<div class="video-img-box[^>]*>[\\s\\S]*?<a href="([^"]+)"[\\s\\S]*?<img[^>]*data-src="([^"]+)"[\\s\\S]*?<span class="label">([\\s\\S]*?)<\\/span>[\\s\\S]*?<h6 class="title"><a[^>]*>([\\s\\S]*?)<\\/a><\\/h6>/g;
            let match;
            while ((match = reg.exec(html)) !== null) {
                let href = (match[1] || '').trim();
                let pic = (match[2] || '').trim();
                let remark = (match[3] || '').replace(/<[^>]+>/g, '').replace(/\\s+/g, ' ').trim();
                let title = (match[4] || '').replace(/<[^>]+>/g, '').replace(/\\s+/g, ' ').trim();
                if (href && title) {
                    list.push({
                        title: title,
                        pic_url: pic,
                        desc: remark || 'Jable',
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
        function toSimple(word) {
            let map = {
                '護': '护', '醫': '医', '師': '师', '兩': '两', '與': '与', '後': '后',
                '潔': '洁', '亂': '乱', '傳': '传', '當': '当', '個': '个', '說': '说',
                '亞': '亚', '姊': '姐', '處': '处', '網': '网', '視': '视', '頻': '频',
                '畫': '画', '質': '质', '點': '点', '擊': '击', '臺': '台', '萬': '万',
                '內': '内', '對': '对', '從': '从', '來': '来', '為': '为', '開': '开',
                '關': '关', '愛': '爱', '氣': '气', '實': '实', '頭': '头', '貓': '猫',
                '雙': '双', '邊': '边', '歡': '欢', '樂': '乐', '變': '变', '還': '还',
                '這': '这', '種': '种', '貝': '贝'
            };
            return (word || '').split('').map(ch => map[ch] || ch).join('');
        }
        function addChineseSlices(word) {
            word = (word || '').replace(/\\s+/g, '');
            let segs = word.match(/[\\u3400-\\u9fff]{4,}/g) || [];
            for (let i = 0; i < segs.length; i++) {
                let seg = segs[i];
                addTry(seg);
                addTry(seg.slice(0, 3));
                addTry(seg.slice(0, 4));
                addTry(seg.slice(-3));
                addTry(seg.slice(-4));
                for (let n = Math.min(6, seg.length); n >= 3; n--) {
                    for (let j = 0; j + n <= seg.length; j++) {
                        addTry(seg.slice(j, j + n));
                    }
                }
            }
        }
        let key = (KEY || '').trim();
        addTry(key);
        let noSpace = key.replace(/\\s+/g, '');
        if (noSpace !== key) addTry(noSpace);
        let simpleKey = toSimple(key);
        if (simpleKey !== key) {
            addTry(simpleKey);
            let simpleNoSpace = simpleKey.replace(/\\s+/g, '');
            if (simpleNoSpace !== simpleKey) addTry(simpleNoSpace);
        }
        let codeMatch = key.match(/[A-Za-z]{2,10}[-_\\s]?\\d{2,6}/);
        if (codeMatch) {
            let code = codeMatch[0].toUpperCase().replace(/[_\\s]+/g, '-');
            addTry(code);
            addTry(code.replace(/-/g, ' '));
            addTry(code.replace(/-/g, ''));
        }
        let firstPart = key.split(/[。.!！?？]/)[0].trim();
        if (firstPart && firstPart !== key) addTry(firstPart);
        let simpleFirstPart = toSimple(firstPart);
        if (simpleFirstPart && simpleFirstPart !== firstPart) addTry(simpleFirstPart);
        let actorMatch = key.match(/[\\u3400-\\u9fff]{2,6}$/);
        if (actorMatch) addTry(actorMatch[0]);
        addChineseSlices(key);
        addChineseSlices(simpleKey);
        addChineseSlices(firstPart);
        addChineseSlices(simpleFirstPart);
        let finalList = [];
        let merged = {};
        for (let i = 0; i < tries.length; i++) {
            let word = tries[i];
            let html = request(HOST + '/search/' + encodeURIComponent(word) + '/');
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
