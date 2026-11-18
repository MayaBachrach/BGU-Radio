import json, pathlib, urllib.request, urllib.parse, concurrent.futures, html, re
import xml.etree.ElementTree as ET

def read(url):
    request = urllib.request.Request(url, headers={'User-Agent':'BGURadioCatalog/1.0'})
    with urllib.request.urlopen(request, timeout=12) as response:
        return response.read()

def record(title, url, provider, publisher, **values):
    return dict(title=title, source=url, platform=provider, publisher=publisher,
                **(dict(kind='episode', series=None, date=None, description=None,
                       artwork=None, audio=None, embed=None, production=None, host=None, editor=None) | values))

def credits(description):
    result = {}
    for key, label in [('production','הפקה'),('host','הגשה'),('editor','עריכה')]:
        match = re.search(r'(?:^|[\n|•])\s*'+label+r'\s*:\s*([^\n|•]{2,160})(?:$|[\n|•])', description or '')
        if match: result[key] = match[1].strip()
    return result

def collect(channel):
    rows = []
    if channel.startswith('mix:'):
        user = channel[4:]
        url = 'https://api.mixcloud.com/'+user+'/cloudcasts/?limit=100'
        while url:
            data=json.loads(read(url))
            for t in data['data']:
                rows.append(record(t['name'],t['url'],'Mixcloud',t['user']['name'],date=t.get('created_time'),artwork=t.get('pictures',{}).get('large'),embed='https://www.mixcloud.com/widget/iframe/?feed='+urllib.parse.quote(t['key'],safe='')))
            url=data.get('paging',{}).get('next')
    elif channel=='hearthis':
        for page in range(1,1000):
            items=json.loads(read(f'https://api-v2.hearthis.at/bgu-radio/?type=tracks&count=50&page={page}'))
            for t in items:
                d=t.get('description') or ''
                rows.append(record(t['title'],t['permalink_url'],'hearthis.at','BGU Radio',audio=t.get('stream_url') or t['permalink_url'].rstrip('/')+'/listen.mp3',artwork=t.get('artwork_url'),date=t.get('created_at'),description=d,**credits(d)))
            if len(items)<50: break
    elif channel=='original':
        items=json.loads(read('https://bgu-radio.base44.app/api/apps/695cb8cdaf769d5c88acb1d9/entities/ArchiveEpisode?sort=order&limit=1000'))
        for t in items:
            rows.append(record(t['title'],t['source_url'],t['source'],'רדיו בן־גוריון (ארכיון האתר)',date=t.get('published_date'),audio=t.get('audio_url'),embed=t.get('embed_url'),artwork=t.get('image_url')))
    else:
        feed=ET.fromstring(read(channel)).find('channel')
        for t in feed.findall('item'):
            media=t.find('enclosure')
            if media is None: continue
            url=media.get('url')
            d=html.unescape(re.sub('<[^>]+>','\n',t.findtext('description','')))
            rows.append(record(t.findtext('title'),t.findtext('link') or url,'RSS',feed.findtext('{http://www.itunes.com/dtds/podcast-1.0.dtd}author'),series=feed.findtext('title'),date=t.findtext('pubDate'),description=d,audio=url,**credits(d)))
    return rows

channels=['original','hearthis','mix:sbradio101','mix:Boozie_Raviv','https://pinecast.com/feed/made-in-bgu','https://anchor.fm/s/d8da22c/podcast/rss','https://anchor.fm/s/36933808/podcast/rss']
folder=pathlib.Path('catalog');folder.mkdir(exist_ok=True)
existing={}
target=folder/'library.json'
if target.exists(): existing={x['source'].rstrip('/'):x for x in json.loads(target.read_text())}
with concurrent.futures.ThreadPoolExecutor() as pool:
    jobs={ch:pool.submit(collect,ch) for ch in channels}
    for ch,job in jobs.items():
        try:
            rows=job.result()
            for x in rows: existing[x['source'].rstrip('/')]=x
            print(ch,len(rows))
        except Exception as e: print(ch,str(e))
for title,id in [["שלייקעס","6W9fB2m8aEYXE6iFvvtNPY"],["יוצרים את העתיד · نخلق المستقبل","6Rfu8H4bAb6IYsoNHyRGGJ"],["ליניארית To go","0Gc2fS7W8eNKuFiJeF0ijy"],["התכנית שלי להפוך לרופא","4sVDhGjDI8OK5Aq5FCzUT5"],["הזקן והיום","3J6wPbHkRb6QsP3as9jXNq"],["בחברה טובה","0fL5yqOpSdpeycyu48F5Zx"]]:
    url='https://open.spotify.com/show/'+id
    existing[url]=record(title,url,'Spotify',None,kind='series',series=title,embed='https://open.spotify.com/embed/show/'+id)
target.write_text(json.dumps(list(existing.values()),ensure_ascii=False),encoding='utf-8')
