#!/usr/bin/env python3
import argparse
import html
import json
import re
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, build_opener, HTTPCookieProcessor
from http.cookiejar import CookieJar


SCHOOL_ORIGIN = "https://school.gyo6.net"
SCHOOL_SYS_ID = "poongsanhs"
SCHOOL_SCHEDULE_MI = "167079"
SCHOOL_MAIN_URL = f"{SCHOOL_ORIGIN}/poongsanhs/main.do?sysId={SCHOOL_SYS_ID}"
SCHOOL_SCHEDULE_URL = f"{SCHOOL_ORIGIN}/poongsanhs/schl/sv/schdulView/schdulCalendarView.do"


def month_add(yyyymm: str, offset: int) -> str:
    year = int(yyyymm[:4])
    month = int(yyyymm[4:])
    month_index = year * 12 + (month - 1) + offset
    return f"{month_index // 12:04d}{month_index % 12 + 1:02d}"


def target_months(start: str, past: int, future: int) -> list[str]:
    return [month_add(start, offset) for offset in range(-past, future + 1)]


def month_range(start: str, end: str) -> list[str]:
    months = []
    current = start
    while current <= end:
        months.append(current)
        current = month_add(current, 1)
    return months


def request_headers(referer: str) -> dict[str, str]:
    return {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Referer": referer,
    }


def fetch_html(opener, url: str, *, data: bytes | None = None, referer: str = SCHOOL_MAIN_URL) -> str:
    headers = request_headers(referer)
    if data is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8"
        headers["Origin"] = SCHOOL_ORIGIN

    req = Request(url, data=data, headers=headers, method="POST" if data is not None else "GET")
    with opener.open(req, timeout=30) as res:
        raw = res.read()
        content_type = res.headers.get("Content-Type", "")
        charset_match = re.search(r"charset=([\w-]+)", content_type, re.I)
        charset = charset_match.group(1) if charset_match else "utf-8"
        return raw.decode(charset, errors="replace")


def fetch_schedule_html(opener, yyyymm: str) -> str:
    fetch_html(opener, SCHOOL_MAIN_URL, referer=f"{SCHOOL_ORIGIN}/poongsanhs/main.do")

    query = urlencode({
        "sysId": SCHOOL_SYS_ID,
        "mi": SCHOOL_SCHEDULE_MI,
        "selectType": "haksa",
        "selectYearMonth": yyyymm,
    })
    url = f"{SCHOOL_SCHEDULE_URL}?{query}"
    page = fetch_html(opener, url, referer=SCHOOL_MAIN_URL)
    if has_schedule_markup(page):
        return page

    body = urlencode({
        "sysId": SCHOOL_SYS_ID,
        "mi": SCHOOL_SCHEDULE_MI,
        "schdulSn": "",
        "selectType": "haksa",
        "selectYearMonth": yyyymm,
        "schdulType": "",
        "schdulSeq": "",
        "schdulDate": "",
    }).encode("utf-8")
    return fetch_html(
        opener,
        f"{SCHOOL_SCHEDULE_URL}?sysId={SCHOOL_SYS_ID}&mi={SCHOOL_SCHEDULE_MI}",
        data=body,
        referer=url,
    )


def has_schedule_markup(page: str) -> bool:
    return "monthcal" in page and "data-schdulTitle" in page


def attr(tag: str, name: str) -> str:
    match = re.search(rf"{re.escape(name)}\s*=\s*(['\"])(.*?)\1", tag, re.I | re.S)
    return html.unescape(match.group(2)).strip() if match else ""


def parse_schedule(page: str, yyyymm: str) -> dict[str, list[dict[str, str]]]:
    by_date: dict[str, list[dict[str, str]]] = {}
    cell_pattern = re.compile(
        r"<td\b[^>]*\bid=(['\"]?)(20\d{6})\1[^>]*>([\s\S]*?)(?=<td\b|</tr>|</tbody>|</table>)",
        re.I,
    )
    tag_pattern = re.compile(
        r"<p\b[^>]*\bclass=['\"][^'\"]*\bcalLink\b[^'\"]*\bbtnInfo\b[^'\"]*['\"][^>]*>",
        re.I,
    )

    for cell_match in cell_pattern.finditer(page):
        ymd = cell_match.group(2)
        if not ymd.startswith(yyyymm):
            continue

        items = []
        seen = set()
        for tag_match in tag_pattern.finditer(cell_match.group(3)):
            tag = tag_match.group(0)
            title = attr(tag, "data-schdulTitle")
            if not title:
                continue

            item = {
                "title": title,
                "seq": attr(tag, "data-seq"),
                "type": attr(tag, "data-clType"),
            }
            key = (item["title"], item["seq"], item["type"])
            if key in seen:
                continue
            seen.add(key)
            items.append(item)

        if items:
            by_date[f"{ymd[:4]}-{ymd[4:6]}-{ymd[6:]}"] = items

    return by_date


def sync_month(opener, out_dir: Path, yyyymm: str) -> int:
    page = fetch_schedule_html(opener, yyyymm)
    if not has_schedule_markup(page):
        sample = re.sub(r"\s+", " ", page)[:500]
        raise RuntimeError(f"{yyyymm}: schedule markup not found: {sample}")

    by_date = parse_schedule(page, yyyymm)
    count = sum(len(items) for items in by_date.values())
    payload = {
        "ok": True,
        "source": "school.gyo6.net",
        "ym": yyyymm,
        "count": count,
        "updatedAt": datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "byDate": by_date,
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / f"{yyyymm}.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return count


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="data/schedule")
    parser.add_argument("--start", default=datetime.now().strftime("%Y%m"))
    parser.add_argument("--past", type=int, default=2)
    parser.add_argument("--future", type=int, default=12)
    parser.add_argument("--from", dest="from_month")
    parser.add_argument("--to", dest="to_month")
    parser.add_argument("--sleep", type=float, default=0.35)
    args = parser.parse_args()

    opener = build_opener(HTTPCookieProcessor(CookieJar()))
    out_dir = Path(args.out)

    end_month = args.to_month or month_add(args.start, args.future)
    months = month_range(args.from_month, end_month) if args.from_month else target_months(args.start, args.past, args.future)

    for yyyymm in months:
        try:
            count = sync_month(opener, out_dir, yyyymm)
            print(f"{yyyymm}: {count} events")
        except (HTTPError, URLError, TimeoutError, RuntimeError) as exc:
            print(f"::warning::{yyyymm}: {exc}", file=sys.stderr)
        time.sleep(args.sleep)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
