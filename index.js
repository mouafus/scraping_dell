const fs = require('fs'),
    loader = require("loader-in-console"),
    puppeteer = require('puppeteer'),
    request = require('request');

const download = (uri, filename, callback) => {
    request.head(uri, function (err, res, body) {
        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
}


async function scrape() {
    loader.Loader.startDotLine(1000, "Sois patient mon frère ");
    const browser = await puppeteer.launch({})
    const page = await browser.newPage();

    const URI = "https://www.dell.com/en-uk/shop/laptop-computers-2-in-1-pcs/latitude-9330-2-in-1-laptop/spd/latitude-13-9330-laptop/gctol933013emea_2in1_vp?redirectTo=SOC"
    await page.goto(
        URI,
        {waitUntil: 'domcontentloaded'}
    );


    const product_title = await page.waitForSelector(".cf-pg-title > span:nth-child(1)");
    const tmp = await page.evaluate(element => element.textContent, product_title);
    const product_name = tmp.replace(/\s/g, '');

    // download images
    const image_container = await page.$(".hero-dell-media",);
    const figures_tag = await image_container.$$(":scope > *");

    for (let i = 0; i < figures_tag.length; i++) {
        let image_name = "image_" + i + ".png";
        try {
            const image_url = await figures_tag[i].$eval(`img`, k => k.getAttribute('src'));
            download(`https:${image_url ?? ""}`, image_name, function () {
                if (!fs.existsSync(`./data/${product_name}`)) {
                    fs.mkdirSync(`./data/${product_name}`, {recursive: true});
                    fs.copyFileSync(`./${image_name}`, `./data/${product_name}/${image_name}`);

                } else {
                    fs.copyFileSync(`./${image_name}`, `./data/${product_name}/${image_name}`);
                }

                fs.unlinkSync(`./${image_name}`);
            });
        } catch (e) {

        }

    }

    //Get UX features
    const uxModulesWrap = await page.$$('.ux-cell-wrapper.ux-list-item-scroll.ux-basic-module');
    let uxModulesItems = [];
    for (const el of uxModulesWrap) {
        const elId = await page.evaluate(item => item.id, el)
        const title = await page.$eval(`#${elId}>.ux-module-title-wrap>h2`, elem => elem.textContent);
        let item = {
            title,
            options: []
        }

        const children_container = await page.$(`#${elId}>.ux-cell-options>.ux-options-wrap`);
        const children = await children_container.$$(':scope > *')

        for (const j of children) {
            const feature_title = await j.$eval('.ux-cell-title', k => k.textContent)
            const feature_price = await j.$eval('.ux-cell-delta-price', k => k.textContent)
            const option = {
                feature_title,
                feature_price: feature_price.replace('\n', '').trim()
            }
            item.options.push(option);
        }

        uxModulesItems.push(item);
    }

    //write ux-feature in file
    if (!fs.existsSync(`./data/${product_name}`)) {
        fs.mkdirSync(`./data/${product_name}`, {recursive: true});
    }
    fs.writeFileSync(`./data/${product_name}/ux_feature.json`, JSON.stringify(uxModulesItems, null, 4));

    //Get description html and write in file
    const page2 = await browser.newPage();
    await page2.goto(
        URI + '#features_section',
        {waitUntil: 'domcontentloaded'}
    );
    const description_temp = await page2.waitForSelector("#cwp_features_section", {timeout: 50000});
    const description = await page2.evaluate(element => element.outerHTML, description_temp);

    if (!fs.existsSync(`./data/${product_name}`)) {
        fs.mkdirSync(`./data/${product_name}`, {recursive: true});
    }
    fs.writeFileSync(`./data/${product_name}/description.html`, description);


    loader.Loader.stop()
    browser.close()
}

scrape()
