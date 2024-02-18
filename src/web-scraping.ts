import puppeteer from '@cloudflare/puppeteer'
import type { Game } from './utils'
import text from './locale.json'

type Article = {
  title: string
  imageUrl: string
  articleUrl: string
  articleId: string
}
export type WebData = {
  game: Game
  locale: string
  articles: Article[]
}

export const webScraping = async (env: any) => {
  const browser = await puppeteer.launch(env.BROWSER)
  const data: WebData[] = []
  data.push(
    ...(await fetchGenshinArticles(browser)),
    ...(await fetchStarrailArticles(browser)),
    ...(await fetchZenlessArticles(browser)),
  )
  browser.close()
  return data
}

const option: puppeteer.WaitForOptions = { waitUntil: ['load'] }

const fetchGenshinArticles = async (browser: puppeteer.Browser) => {
  const game = 'genshin_impact'
  const siteUrl = text.game[game].siteUrl
  const locales = Object.keys(siteUrl) as (keyof typeof siteUrl)[]
  const data: WebData[] = []
  for (const locale of locales) {
    try {
      const page = await browser.newPage()
      await page.goto(siteUrl[locale], option)
      await page.waitForSelector('.news__item, .news__title, .news__title, .news__info')
      const list = await page.$$(`li.news__item`)
      const news = await Promise.all(
        list.map(async e => {
          const articleUrl: string = await e.$eval(`a.news__title`, a => a.href)
          const imageUrl: string = await e.$eval(`.news__title img`, img => img.src)
          const title: string = await e.$eval(`.news__info h3`, h3 => h3.innerText)
          const articleId = articleUrl.split(`/`).slice(-1)[0]
          return { articleUrl, imageUrl, title, articleId }
        }),
      )
      data.push({ game, locale, articles: news.filter(e => e.articleUrl.includes(locale)) })
      await page.close()
    } catch (e) {
      console.warn(game, locale, e)
    }
  }
  return data
}

const fetchStarrailArticles = async (browser: puppeteer.Browser) => {
  const game = 'honkai_star_rail'
  const siteUrl = text.game[game].siteUrl
  const locales = Object.keys(siteUrl) as (keyof typeof siteUrl)[]
  const data: WebData[] = []
  for (const locale of locales) {
    try {
      const page = await browser.newPage()
      await page.goto(siteUrl[locale], option)
      await page.waitForSelector('.list-wrap, .img, .news-title')
      const list = await page.$$(`.list-wrap > a`)
      const news = await Promise.all(
        list.map(async e => {
          const articleUrl: string = await (await e.getProperty(`href`)).jsonValue()
          const imageUrl = await e.$eval(`.img > img`, img => img.src)
          const title = await e.$eval(`.news-title`, div => div.innerText)
          const articleId = articleUrl.split(`/`).slice(-1)[0]
          return { articleUrl, imageUrl, title, articleId }
        }),
      )
      data.push({ game, locale, articles: news.filter(e => e.articleUrl.includes(locale)) })
      await page.close()
    } catch (e) {
      console.warn(game, locale, e)
    }
  }
  return data
}

const fetchZenlessArticles = async (browser: puppeteer.Browser) => {
  const game = 'zenless_zone_zero'
  const siteUrl = text.game[game].siteUrl
  const locales = Object.keys(siteUrl) as (keyof typeof siteUrl)[]
  const data: WebData[] = []
  for (const locale of locales) {
    try {
      const page = await browser.newPage()
      await page.goto(siteUrl[locale], option)
      await page.waitForSelector('.news-list__item, .news-list__item-banner, .news-list__item-title')
      const list = await page.$$(`.news-list__item`)
      const news = await Promise.all(
        list.map(async e => {
          const articleUrl = (await e.$eval(`a`, a => a.href)) as string
          const imageUrl = await e.$eval(`.news-list__item-banner img`, img => img.src)
          const title = await e.$eval(`.news-list__item-title`, div => div.innerText)
          const articleId = articleUrl.split(`/`).slice(-1)[0]
          return { articleUrl, imageUrl, title, articleId }
        }),
      )
      data.push({ game, locale, articles: news.filter(e => e.articleUrl.includes(locale)) })
      await page.close()
    } catch (e) {
      console.warn(game, locale, e)
    }
  }
  return data
}
