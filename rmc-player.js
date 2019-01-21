#!/usr/bin/env node

const puppeteer = require('puppeteer');
const inquirer = require('inquirer');
const spawn = require('child_process').spawn;
const process = require('process');

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: process.env.RMC_CHROME_BIN_PATH || 'google-chrome' });
  const page = await browser.newPage();
  await page.goto("http://rmcdecouverte.bfmtv.com/mediaplayer-replay/");

  let replayLinks = []
  for (let replayLink of (await page.$$("[class*='image']"))) {
    if ((await replayLink.$("p")) == null) {
      continue;
    }

    replayLinks.push({
      name: (await (await (await replayLink.$("[class*='infos']")).getProperty("innerText")).jsonValue()).toString().replace(/(?:\r\n|\r|\n)+/g, ' : '),
      value: await (await replayLink.getProperty("href")).jsonValue()
    });
  }

  const answer = await inquirer.prompt([{
    type: 'list',
    name: 'link',
    message: "Choisis ton reportage de l'extrême",
    choices: replayLinks
  }])

  await page.setRequestInterception(true);

  const mediaUrlFetcher = new Promise((resolve) => {
    page.on('request', interceptedRequest => {
      if (interceptedRequest.url().match(/https:\/\/hlsbfmtoken-a.akamaihd.net/)) {
        resolve(interceptedRequest.url());
      }
      interceptedRequest.continue();
    });
  })
  await page.goto(answer['link']);

  mediaUrlFetcher.then(async (url) => {
    await browser.close();
    await new Promise((resolve) => {
      spawn(process.env.RMC_PLAYER_BIN_PATH || 'vlc', [url], {
        stdio: "inherit",
        stderr: "inherit"
      }).on('exit', resolve);
    })
  })
})();
