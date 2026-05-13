#!/usr/bin/env python3
"""Import MFDS cosmetic ingredient registry CSV into cosmetic_ingredient_registry."""

from __future__ import annotations

import csv
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

DEFAULT_CSV = Path('rise-intel/화장품원료성분정보조회_20250918.csv')
BATCH_SIZE = 500


def load_env(path: Path = Path('.env.local')) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.exists():
        return env
    for raw in path.read_text(encoding='utf-8').splitlines():
        match = re.match(r'^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$', raw)
        if not match:
            continue
        value = match.group(2).strip()
        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]
        env[match.group(1)] = value
    return env


def clean(value: str | None) -> str | None:
    if value is None:
        return None
    text = re.sub(r'\s+', ' ', value).strip()
    return text or None


def normalize(value: str | None) -> str | None:
    text = clean(value)
    return text.lower() if text else None


def int_or_none(value: str | None) -> int | None:
    text = clean(value)
    if not text:
        return None
    try:
        return int(text)
    except ValueError:
        return None


def read_rows(csv_path: Path) -> list[dict[str, object]]:
    with csv_path.open('r', encoding='cp949', newline='') as f:
        reader = csv.DictReader(f)
        rows: list[dict[str, object]] = []
        for row in reader:
            source_no = int_or_none(row.get('No'))
            kor = clean(row.get('표준명 [INGR_KOR_NAME] '))
            if source_no is None or not kor:
                continue
            eng = clean(row.get('영문명 [INGR_ENG_NAME] '))
            rows.append({
                'source_no': source_no,
                'ingr_kor_name': kor,
                'ingr_eng_name': eng,
                'cas_no': clean(row.get('CASNO [CAS_NO] ')),
                'origin_major_kor_name': clean(row.get('기원및정의 [ORIGIN_MAJOR_KOR_NAME] ')),
                'ingr_synonym': clean(row.get('이명 [INGR_SYNONYM] ')),
                'source_rownum': int_or_none(row.get('rownum')),
                'normalized_kor_name': normalize(kor),
                'normalized_eng_name': normalize(eng),
                'source_file': csv_path.name,
            })
    return rows


def post_json(url: str, key: str, rows: list[dict[str, object]]) -> None:
    body = json.dumps(rows, ensure_ascii=False).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=body,
        method='POST',
        headers={
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json; charset=utf-8',
            'Prefer': 'resolution=merge-duplicates,return=minimal',
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            if response.status not in (200, 201, 204):
                raise RuntimeError(f'Unexpected status: {response.status}')
    except urllib.error.HTTPError as error:
        detail = error.read().decode('utf-8', errors='replace')
        raise RuntimeError(f'HTTP {error.code}: {detail}') from error


def main() -> None:
    csv_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CSV
    if not csv_path.exists():
        raise SystemExit(f'CSV not found: {csv_path}')

    env = load_env()
    supabase_url = env.get('NEXT_PUBLIC_SUPABASE_URL')
    key = env.get('SUPABASE_SERVICE_ROLE_KEY') or env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    if not supabase_url or not key:
        raise SystemExit('Missing Supabase URL/key in .env.local')

    rows = read_rows(csv_path)
    print(f'CSV rows parsed: {len(rows)}')
    if not rows:
        return

    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/cosmetic_ingredient_registry?on_conflict=source_no"
    for index in range(0, len(rows), BATCH_SIZE):
        batch = rows[index:index + BATCH_SIZE]
        post_json(endpoint, key, batch)
        print(f'Uploaded {min(index + BATCH_SIZE, len(rows))}/{len(rows)}')

    print('✅ Import complete')


if __name__ == '__main__':
    main()
