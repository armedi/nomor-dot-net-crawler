import fs from "node:fs";
import path from "node:path";
import url from "node:url";

import { Dataset, PlaywrightCrawler } from "crawlee";
import * as R from "ramda";

const wilayahDataset = await Dataset.open("wilayah");

const crawler = new PlaywrightCrawler({
  requestHandler: async ({ request, enqueueLinks, page, log }) => {
    const title = await page.title();
    const url = request.loadedUrl;

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

const dataset = await wilayahDataset.reduce(
  (result, item) => result.concat(item.data),
  []
);

/**
 * @typedef {Object} DesaKelurahan
 * @property {string} kode_pos
 * @property {string} kode_wilayah
 * @property {string} desa_kelurahan
 * @property {string} kecamatan
 * @property {string} kabupaten_kota
 * @property {string} provinsi
 */
/** @typedef {Omit<DesaKelurahan, 'kode_pos' | 'desa_kelurahan'>} Kecamatan */
/** @typedef {Omit<Kecamatan, 'kecamatan'>} KabupatenKota */
/** @typedef {Omit<KabupatenKota, 'kabupaten_kota'>} Provinsi */

/** @type {DesaKelurahan[]} */
const desaKelurahan = R.sort(R.ascend(R.prop("kode_wilayah")))(dataset);

/** @type {Kecamatan[]} */
const kecamatan = R.pipe(
  R.uniqBy(R.prop("kecamatan")),
  R.map(
    R.pipe(
      (item) =>
        R.assoc(
          "kode_wilayah",
          item.kode_wilayah.replace(/\.\d{4}$/, ""),
          item
        ),
      R.omit(["kode_pos", "desa_kelurahan"])
    )
  )
)(desaKelurahan);

/** @type {KabupatenKota[]} */
const kabupatenKota = R.pipe(
  R.uniqBy(R.prop("kabupaten_kota")),
  R.map(
    R.pipe(
      (item) =>
        R.assoc(
          "kode_wilayah",
          item.kode_wilayah.replace(/\.\d{2}$/, ""),
          item
        ),
      R.omit(["kecamatan"])
    )
  )
)(kecamatan);

/** @type {Provinsi[]} */
const provinsi = R.pipe(
  R.uniqBy(R.prop("provinsi")),
  R.map(
    R.pipe(
      (item) =>
        R.assoc(
          "kode_wilayah",
          item.kode_wilayah.replace(/\.\d{2}$/, ""),
          item
        ),
      R.omit(["kabupaten_kota"])
    )
  )
)(kabupatenKota);

fs.writeFileSync(
  path.join(
    url.fileURLToPath(import.meta.url),
    "../../generated/desa-kelurahan.json"
  ),
  JSON.stringify(desaKelurahan, null, 2),
  "utf-8"
);

fs.writeFileSync(
  path.join(
    url.fileURLToPath(import.meta.url),
    "../../generated/kecamatan.json"
  ),
  JSON.stringify(kecamatan, null, 2),
  "utf-8"
);

fs.writeFileSync(
  path.join(
    url.fileURLToPath(import.meta.url),
    "../../generated/kabupaten-kota.json"
  ),
  JSON.stringify(kabupatenKota, null, 2),
  "utf-8"
);

fs.writeFileSync(
  path.join(
    url.fileURLToPath(import.meta.url),
    "../../generated/provinsi.json"
  ),
  JSON.stringify(provinsi, null, 2),
  "utf-8"
);
