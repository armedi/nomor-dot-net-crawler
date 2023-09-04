import fs from "node:fs";
import { Dataset, PlaywrightCrawler } from "crawlee";

type DataItem = {
  kode_pos: string;
  kode_wilayah: string;
  desa_kelurahan: string;
  kecamatan: string;
  kabupaten_kota: string;
  provinsi: string;
};

const wilayahDataset = await Dataset.open("wilayah");

const crawler = new PlaywrightCrawler({
  requestHandler: async ({ request, enqueueLinks, page, log }) => {
    const title = await page.title();
    const url = request.loadedUrl!;

    log.info(title, { url });

    await page.waitForSelector("tbody.header_mentok");

    const rows = await page.$$("tbody.header_mentok + tbody > tr");

    let data = [];

    for (const row of rows) {
      const kode_pos = row.$("td:nth-child(2)").then((e) => e?.innerText());
      const kode_wilayah = row.$("td:nth-child(4)").then((e) => e?.innerText());
      const desa_kelurahan = row
        .$("td:nth-child(3)")
        .then((e) => e?.innerText());
      const kecamatan = row.$("td:nth-child(5)").then((e) => e?.innerText());
      const kabupaten_kota = row
        .$("td:nth-child(7)")
        .then((e) => e?.innerText());
      const provinsi = row.$("td:nth-child(8)").then((e) => e?.innerText());

      data.push({
        kode_pos: await kode_pos,
        kode_wilayah: await kode_wilayah,
        desa_kelurahan: await desa_kelurahan,
        kecamatan: await kecamatan,
        kabupaten_kota: await kabupaten_kota,
        provinsi: await provinsi,
      });
    }

    await wilayahDataset.pushData({ url, title, data });

    await enqueueLinks({
      globs: ["https://www.nomor.net/**"],
      selector:
        'b + a.tpage[href*="_i=desa-kodepos"], b + br + a.tpage[href*="_i=desa-kodepos"]',
    });
  },
  headless: false,
  maxRequestsPerCrawl: 100,
  maxRequestRetries: 3,
  requestHandlerTimeoutSecs: 600,
});

await crawler.run([
  "https://www.nomor.net/_kodepos.php?_i=desa-kodepos&perhal=1000&urut=8",
]);

const all = await wilayahDataset.reduce(
  (result, item) => result.concat(item.data),
  [] as DataItem[]
);

all.sort((a, b) => (a.kode_wilayah < b.kode_wilayah ? -1 : 1));

fs.writeFileSync(
  "./generated/wilayah.json",
  JSON.stringify(all, null, 2),
  "utf-8"
);
