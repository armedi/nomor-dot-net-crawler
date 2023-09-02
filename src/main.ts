import fs from "node:fs";
import { Dataset, PlaywrightCrawler } from "crawlee";

const wilayahDataset = await Dataset.open("wilayah");

const crawler = new PlaywrightCrawler({
  requestHandler: async ({ request, enqueueLinks, page, log }) => {
    const url = request.loadedUrl!;

    log.info(`${await page.title()}`, { url });

    await page.waitForSelector("tbody.header_mentok");

    const searchParams = new URLSearchParams(url.split("?")[1]);
    const isRoot = searchParams.get("_i") === "provinsi-kodepos";

    if (isRoot) {
      const rows = await page.$$(
        "tbody.header_mentok ~ tbody > tr:not(:last-of-type)"
      );

      await enqueueLinks({
        urls: await Promise.all(
          rows.map((row) =>
            row
              .$("td:nth-child(2) > a")
              .then((e) => e?.getAttribute("href"))
              .then((url) => {
                return (
                  encodeURI(url!)
                    .replace("kota-kodepos", "desa-kodepos")
                    .replace("&sby=000000", "") + "&urut=8&perhal=1000"
                );
              })
          )
        ),
      });
    } else {
      await page.waitForSelector("tbody.header_mentok");

      const rows = await page.$$("tbody.header_mentok + tbody > tr");

      await Promise.all([
        wilayahDataset.pushData({
          url: request.loadedUrl,
          title: await page.title(),
          daftar_desa_kelurahan: await Promise.all(
            rows.map(async (row) => {
              const kode_pos = row
                .$("td:nth-child(2)")
                .then((e) => e?.innerText());
              const kode_wilayah = row
                .$("td:nth-child(4)")
                .then((e) => e?.innerText());
              const desa_kelurahan = row
                .$("td:nth-child(3)")
                .then((e) => e?.innerText());
              const kecamatan = row
                .$("td:nth-child(5)")
                .then((e) => e?.innerText());
              const kabupaten_kota = row
                .$("td:nth-child(7)")
                .then((e) => e?.innerText());
              const provinsi = row
                .$("td:nth-child(8)")
                .then((e) => e?.innerText());

              return {
                kode_pos: await kode_pos,
                kode_wilayah: await kode_wilayah,
                desa_kelurahan: await desa_kelurahan,
                kecamatan: await kecamatan,
                kabupaten_kota: await kabupaten_kota,
                provinsi: await provinsi,
              };
            })
          ),
        }),

        enqueueLinks({
          globs: ["https://www.nomor.net/**"],
          selector: 'b + a.tpage[href*="daerah=Provinsi"]',
          forefront: true,
        }),
      ]);
    }
  },
  headless: false,
  maxRequestsPerCrawl: 120,
  maxRequestRetries: 3,
  maxConcurrency: 1,
  requestHandlerTimeoutSecs: 600,
});

await crawler.run([
  "https://www.nomor.net/_kodepos.php?_i=provinsi-kodepos&urut=11",
]);

const all = await wilayahDataset.reduce((result, item) => {
  result.push(...item.daftar_desa_kelurahan);
  return result;
}, [] as any[]);

fs.writeFileSync(
  "./generated/wilayah.json",
  JSON.stringify(all),
  "utf-8"
);
