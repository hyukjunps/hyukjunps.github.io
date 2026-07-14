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
        "updatedAt": datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00",-��h��춻�q�^u
        "seq": "1818874",
        "type": ""
      }
    ],
    "2027-01-03": [
      {
        "title": "귀교일",
        "seq": "1818877",
        "type": ""
      },
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      }
    ],
    "2027-01-04": [
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      },
      {
        "title": "동계방학 프로그램 운영",
        "seq": "1818875",
        "type": ""
      }
    ],
    "2027-01-05": [
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      }
    ],
    "2027-01-06": [
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      }
    ],
    "2027-01-07": [
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      }
    ],
    "2027-01-08": [
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      },
      {
        "title": "졸업식",
        "seq": "1818876",
        "type": ""
      }
    ],
    "2027-01-09": [
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      }
    ],
    "2027-01-10": [
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      }
    ],
    "2027-01-11": [
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      }
    ],
    "2027-01-12": [
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      }
    ],
    "2027-01-13": [
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      }
    ],
    "2027-01-14": [
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      }
    ],
    "2027-01-15": [
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      }
    ],
    "2027-01-16": [
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      },
      {
        "title": "선택 귀가",
        "seq": "1818878",
        "type": ""
      }
    ],
    "2027-01-17": [
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      }
    ],
    "2027-01-18": [
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      }
    ],
    "2027-01-19": [
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      }
    ],
    "2027-01-20": [
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      }
    ],
    "2027-01-21": [
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      }
    ],
    "2027-01-22": [
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      }
    ],
    "2027-01-23": [
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      }
    ],
    "2027-01-24": [
      {
        "title": "2027학년도 신입생 오리엔테이션",
        "seq": "1818879",
        "type": ""
      },
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      }
    ],
    "2027-01-25": [
      {
        "title": "2027학년도 신입생 오리엔테이션",
        "seq": "1818879",
        "type": ""
      },
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      }
    ],
    "2027-01-26": [
      {
        "title": "2027학년도 신입생 오리엔테이션",
        "seq": "1818879",
        "type": ""
      },
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      }
    ],
    "2027-01-27": [
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      }
    ],
    "2027-01-28": [
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      }
    ],
    "2027-01-29": [
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      }
    ],
    "2027-01-30": [
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      }
    ],
    "2027-01-31": [
      {
        "title": "겨울 방학",
        "seq": "1818874",
        "type": ""
      }
    ]
  }
}
