$proxy = "http://192.168.8.188:10808"
$timeout = 8

$direct = @()
$viaProxy = @()
$fail = @()

$items = @(
    @{n="18xxx";u="https://www.18xxx6.hair/cn/home/web/"},
    @{n="3q";u="https://qqqys.com"},
    @{n="51duan";u="https://51cg1.com/category/cbdj/"},
    @{n="55sp";u="https://www.55sp3.help/cn/home/web/"},
    @{n="91sp";u="https://yi.yirensp.fun/"},
    @{n="av01";u="https://av01.club/zh/"},
    @{n="fullhd";u="https://www.fullhd.xxx/zh/"},
    @{n="gdd5";u="https://www.gdd5.quest/cn/home/web/"},
    @{n="saoo";u="https://r-daqtu.saooo.cc/"},
    @{n="soav";u="https://777115.xyz/"},
    @{n="rtk";u="https://rtk.ygccdxz9.ink/cn/home/web/index.php/"},
    @{n="618014";u="https://618014.xyz/index.php/"},
    @{n="6181022";u="https://6181022.xyz/"},
    @{n="tpzp";u="https://www.tpzp7.buzz/cn/home/web/"},
    @{n="demo1";u="https://demo1.11133301.xyz/"},
    @{n="618137";u="https://618137.xyz/"},
    @{n="njav";u="https://njav.sbs/index.php/"},
    @{n="hsex";u="https://hsex.icu/"},
    @{n="xiaoyg";u="https://xn-dlzh1-01.xiaoyg2.buzz/"},
    @{n="cjsh";u="https://www.cjsh6.boats/cn/home/web"},
    @{n="avfolder";u="https://avfolder.com"},
    @{n="diyise";u="https://wfdgh23iu.diyise38.buzz/"},
    @{n="gdpjb";u="https://zvz.gdpjb8.work/cn/home/web/"},
    @{n="thl5";u="https://www.thl5.life/cn/home/web/"},
    @{n="yynz8";u="https://www.yynz8.skin/cn/home/web"},
    @{n="txcy";u="https://txcy-online.buzz/"},
    @{n="jdw3";u="https://www.jdw3.world/cn/home/web"},
    @{n="aiwucm";u="https://i45v7ky1.aiwucm-tco.buzz/vodtype/1"},
    @{n="ise8";u="https://s.ise8.xyz/"},
    @{n="wgd9999";u="https://xxx.wgd9999.vip/"},
    @{n="meiguitv";u="https://fbj1.meiguitv1.xyz/"},
    @{n="blnzx2";u="https://eijpkl.blnzx2.motorcycles/cn/home/web"},
    @{n="bxc7";u="https://kcd.bxc7.one/cn/home/web/"},
    @{n="cth8";u="https://www.cth8.hair/cn/home/web/"},
    @{n="xnavxx";u="https://l7xv.xnavxx.xyz/"},
    @{n="yachts";u="https://www.mrcx2.yachts/cn/home/web/"},
    @{n="dqb";u="https://dqb.tpzp7.buzz/cn/home/web/index.php/"},
    @{n="sedao1";u="https://www.sedao1.cc/"},
    @{n="znb3";u="https://www.znb3.skin/cn/home/web/"},
    @{n="flsp8";u="https://djtzph.flsp8.cyou/cn/"},
    @{n="gdwx01";u="https://www.gdwx01.top/"},
    @{n="91mdws";u="https://www.91md.ws"}
)

foreach ($item in $items) {
    $url = $item.u
    $name = $item.n
    try {
        $r = Invoke-WebRequest -Uri $url -Method Head -TimeoutSec $timeout -UseBasicParsing -ErrorAction SilentlyContinue
        if ($r.StatusCode -lt 500) {
            $direct += ([uri]$url).Host
            Write-Host "[OK] $url" -ForegroundColor Green
        } else { throw }
    } catch {
        try {
            $p = Invoke-WebRequest -Uri $url -Method Head -TimeoutSec $timeout -UseBasicParsing -Proxy $proxy -ProxyUseDefaultCredentials -ErrorAction SilentlyContinue
            if ($p.StatusCode -lt 500) {
                $viaProxy += ([uri]$url).Host
                Write-Host "[PX] $url" -ForegroundColor Yellow
            } else { throw }
        } catch {
            $fail += ([uri]$url).Host
            Write-Host "[XX] $url" -ForegroundColor Red
        }
    }
}

$out = @{
    direct_access = ($direct | Select-Object -Unique)
    proxy_access = ($viaProxy | Select-Object -Unique)
    unreachable = ($fail | Select-Object -Unique)
}

$outPath = "c:\Users\daixi\Documents\openwrt\Tvbox\PrivateTvbox\TV-BOX\纯福利\json_urls_result.json"
$out | ConvertTo-Json | Out-File -FilePath $outPath -Encoding UTF8

Write-Host ""
Write-Host "=== Results ===" -ForegroundColor Cyan
Write-Host "Direct: $($direct.Count) | Proxy: $($viaProxy.Count) | Fail: $($fail.Count)"