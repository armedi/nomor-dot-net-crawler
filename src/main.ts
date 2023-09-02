import { PlaywrightCrawler } from "crawlee";

import { router } from "./routes.js";

const crawler = new PlaywrightCrawler({
  requestHandler: router,
  headless: false,
  maxRequestsPerCrawl: 2,
  maxRequestRetries: 0,
  maxConcurrency: 1,
});

await crawler.addRequests([
  {
    url: "https://www.nomor.net/_kodepos.php?_i=provinsi-kodepos&urut=11",
    label: "nasional",
  },
]);

await crawler.run();
