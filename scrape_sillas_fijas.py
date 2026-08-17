import os
import re
import sys
import time
import unicodedata
import urllib.request

BASE_URL = "https://www.ocenter.com.ar/57-sillas-fijas"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sillas_ocenter", "fijas")
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
}


def fetch(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def slugify(name):
    name = unicodedata.normalize("NFKD", name)
    name = "".join(c for c in name if not unicodedata.combining(c))
    name = re.sub(r"[^a-zA-Z0-9]+", "-", name)
    return name.strip("-").lower()


def extract_products(html):
    products = []
    pattern = re.compile(
        r'<div class="product-miniature.*?</div>\s*</div>\s*</div>',
        re.DOTALL,
    )
    for block in pattern.finditer(html):
        block_html = block.group(0)
        name_m = re.search(r'itemprop="name">([^<]+)</span>', block_html)
        img_m = re.search(r'data-src="(https://www\.ocenter\.com\.ar/[^"]+)"', block_html)
        if name_m and img_m:
            products.append((name_m.group(1).strip(), img_m.group(1)))
    return products


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    all_products = []
    page = 1
    while True:
        url = BASE_URL if page == 1 else f"{BASE_URL}?page={page}"
        print(f"Obteniendo {url} ...")
        html = fetch(url)
        found = extract_products(html)
        if not found:
            break
        all_products.extend(found)
        if "pagination" not in html or f"page={page + 1}" not in html:
            break
        page += 1
        time.sleep(0.5)

    print(f"Encontrados {len(all_products)} productos")
    downloaded = 0
    for i, (name, img_url) in enumerate(all_products, start=1):
        filename = f"{i:02d}_{slugify(name)}.jpg"
        dest = os.path.join(OUTPUT_DIR, filename)
        if os.path.exists(dest):
            print(f"  [skip] {filename}")
            continue
        print(f"  [ok]   {filename}  <-  {img_url}")
        req = urllib.request.Request(img_url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=30) as resp, open(dest, "wb") as f:
            f.write(resp.read())
        downloaded += 1
        time.sleep(0.3)

    print(f"Descargadas {downloaded} imagenes nuevas en {OUTPUT_DIR}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)