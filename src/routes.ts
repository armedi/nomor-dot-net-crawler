import { createPlaywrightRouter, Dataset } from "crawlee";

export const router = createPlaywrightRouter();

const wilayahDataset = await Dataset.open("wilayah");

router.addHandler("nasional", async ({ request, crawler, page, log }) => {
  log.info(`${await page.title()}`, { url: request.loadedUrl });

  await page.waitForSelector("tbody.header_mentok");

  const rows = await page.$$(
    "tbody.header_mentok ~ tbody > tr:not(:last-of-type)"
  );

  for (const row of rows) {
    await crawler.requestQueue?.addRequest({
      url: await row
        .$("td:nth-child(2) > a")
        .then((e) => e?.getAttribute("href"))
        .then((url) => {
          return (
            encodeURI(url!)
              .replace("kota-kodepos", "desa-kodepos")
              .replace("&sby=000000", "") + "&urut=8&perhal=1000"
          );
        }),
      label: "provinsi",
    });
  }
});

router.addHandler("provinsi", async ({ request, enqueueLinks, page, log }) => {
  log.info(`${await page.title()}`, { url: request.loadedUrl });

  await page.waitForSelector("tbody.header_mentok");

  const rows = await page.$$(
    "tbody.header_mentok ~ tbody > tr"
  );

  let daftar_desa_kelurahan = [];

  for (const row of rows) {
    daftar_desa_kelurahan.push({
      nama: await row.$("td:nth-child(3)").then((e) => e?.innerText()),
      kode_pos: await row.$("td:nth-child(2)").then((e) => e?.innerText()),
      kode_wilayah: await row.$("td:nth-child(4)").then((e) => e?.innerText()),
      kecamatan: await row.$("td:nth-child(5)").then((e) => e?.innerText()),
      kabko: await row.$("td:nth-child(7)").then((e) => e?.innerText()),
      provinsi: await row.$("td:nth-child(8)").then((e) => e?.innerText()),
    });
  }

  await wilayahDataset.pushData({
    url: request.loadedUrl,
    title: await page.title(),
    daftar_desa_kelurahan,
  });

  await enqueueLinks({
    globs: ["https://www.nomor.net/**"],
    label: "provinsi",
    selector: 'b ~ a.tpage[href*="daerah=Provinsi"]',
  });
});
