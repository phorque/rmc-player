const puppeteer = require('puppeteer');
const inquirer = require('inquirer');
const exec = require('child_process').exec;
const shellescape = require('shell-escape');
const process = require('process');

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: process.env.RMC_CHROME_BIN_PATH || '/usr/bin/google-chrome' });
  const page = await browser.newPage();
  await page.goto("http://rmcdecouverte.bfmtv.com/mediaplayer-replay/");

  let replayLinks = []
  for (let replayLink of (await page.$$(".bloc-rub-video article.art-c .art-body a"))) {
    replayLinks.push({
      name: await (await (await replayLink.$("h2")).getProperty("innerText")).jsonValue(),
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
      if (interceptedRequest.url().match(/http:\/\/hlsbfmtoken-a.akamaihd.net/)) {
        resolve(interceptedRequest.url());
      }
      interceptedRequest.continue();
    });
  })
  await page.goto(answer['link']);

  mediaUrlFetcher.then(async (url) => {
    await browser.close();
    await new Promise((resolve) => {
      exec(`${shellescape([process.env.RMC_PLAYER_BIN_PATH || 'mplayer', url])} &>/dev/null`, resolve)
    })
  })
})();
