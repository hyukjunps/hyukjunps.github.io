#!/usr/bin/env python3
import argparse
import html
import json
import re
import sys
import time
from datetime import UTC, datetime
from http.cookiejar import CookieJar
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPCookieProcessor, Request, build_opener

ORIGIN = "https://school.gyo6.net"
MAIN_URL = f"{ORIGIN}/poongsanhs/main.do?sysId=poongsanhs"
SCHEDULE_URL = f"{ORIGIN}/poongsanhs/schl/sv/schdulView/schdulCalendarView.do"


def month_add(yyyymm, offset):
    index = int(yyyymm[:4]) * 12 + int(yyyymm[4:]) - 1 + offset
    return f"{index // 12:04d}{index % 12 + 1:02d}"


def decode_page(raw):
    candidates = []
    for encoding in ("utf-8", "euc-kr", "cp949"):
        try:
            text = raw.decode(encoding)
        except UnicodeDecodeError:
            continue
        hangul = len(re.findall(r"[가-힣]", text))
        mojibake = text.count("�") + text.count("?숂") + text.count("?쇱")
        candidates.append((hangul - mojibake * 100, text))
    if not candidates:
        return raw.decode("utf-8", errors="replace")
    return max(candidates, key=lambda item: item[0])[1]


def fetch(opener, url, data=None, referer=MAIN_URL):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.7",
        "Referer": referer,
        "Cache-Control": "no-cache",
    }
    if data is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8"
        headers["Origin"] = ORIGIN
    request = Request(url, data=data, headers=headers, method="POST" if data else "GET")
    with opener.open(request, timeout=30) as response:
        return decode_page(response.read())


def fetch_month(opener, yyyymm):
    fetch(opener, MAIN_URL, referer=f"{ORIGIN}/poongsanhs/main.do")
    query = urlencode({
        "sysId": "poongsanhs",
        "mi": "167079",
        "selectType": "haksa",
        "selectYearMonth": yyyymm,
    })
    url = f"{SCHEDULE_URL}?{query}"
    page = fetch(opener, url)
    if "data-schdulTitle" in page and "monthcal" in page:
        return page

    body = urlencode({
        "sysId": "poongsanhs", "mi": "167079", "schdulSn": "",
        "selectType": "haksa", "selectYearMonth": yyyymm,
        "schdulType": "", "schdulSeq": "", "schdulDate": "",
    }).encode()
    return fetch(opener, f"{SCHEDULE_URL}?sysId=poongsanhs&mi=167079", body, url)


def attribute(tag, name):
    match = re.search(rf"{re.escape(name)}\s*=\s*(['\"])(.*?)\1", tag, re.I | re.S)
    return html.unescape(match.group(2)).strip() if match else ""


def parse_schedule(page, yyyymm):
    by_date = {}
    cells = re.compile(
        r"<td\b[^>]*\bid=(['\"]?)(20\d{6})\1[^>]*>([\s\S]*?)(?=<td\b|</tr>|</tbody>|</table>)",
        re.I,
    )
    tags = re.compile(
        r"<p\b[^>]*\bclass=['\"][^'\"]*\bcalLink\b[^'\"]*\bbtnInfo\b[^'\"]*['\"][^>]*>",
        re.I,
    )
    for cell in cells.finditer(page):
        ymd = cell.group(2)
        if not ymd.startswith(yyyymm):
            continue
        items, seen = [], set()
        for found in tags.finditer(cell.group(3)):
            tag = found.group(0)
            item = {
                "title": attribute(tag, "data-schdulTitle"),
                "seq": attribute(tag, "data-seq"),
                "type": attribute(tag, "data-clType"),
            }
            key = (item["title"], item["seq"], item["type"])
            if not item["title"] or key in seen:
                continue
            seen.add(key)
            items.append(item)
        if items:
            by_date[f"{ymd[:4]}-{ymd[4:6]}-{ymd[6:]}"] = items
    return by_date


def sync_month(opener, out_dir, yyyymm):
    page = fetch_month(opener, yyyymm)
    if "data-schdulTitle" not in page or "monthcal" not in page:
        sample = re.sub(r"\s+", " ", page)[:300]
        raise RuntimeError(f"normal schedule markup not found: {sample}")
    by_date = parse_schedule(page, yyyymm)
    payload = {
        "ok": True,
        "source": "풍산고등학교 공식 홈페이지",
        "sourceUrl": SCHEDULE_URL,
        "ym": yyyymm,
        "count": sum(map(len, by_date.values())),
        "updatedAt": datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "byDate": by_date,
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / f"{yyyymm}.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return payload["count"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="data/schedule")
    parser.add_argument("--start", default=datetime.now().strftime("%Y%m"))
    parser.add_argument("--past", type=int, default=2)
    parser.add_argument("--future", type=int, default=12)
    args = parser.parse_args()

    opener = build_opener(HTTPCookieProcessor(CookieJar()))
    out_dir = Path(args.out)
    successes = 0
    current_ok = False
    offsets = [0] + list(range(-args.past, 0)) + list(range(1, args.future + 1))
    for offset in offsets:
        yyyymm = month_add(args.start, offset)
        try:
            count = sync_month(opener, out_dir, yyyymm)
            print(f"{yyyymm}: {count} events")
            successes += 1
            current_ok = current_ok or offset == 0
        except (HTTPError, URLError, TimeoutError, RuntimeError) as error:
            print(f"::warning::{yyyymm}: {error}", file=sys.stderr)
            if offset == 0:
                print("::error::Current-month schedule sync failed.", file=sys.stderr)
                return 1
        time.sleep(0.4)

    if not successes or not current_ok:
        print("::error::Current-month schedule sync failed.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
