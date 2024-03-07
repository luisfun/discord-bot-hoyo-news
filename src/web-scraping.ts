import puppeteer from '@cloudflare/puppeteer'
import type { Game } from './utils'
import { embedColor } from './utils'
import text from './locale.json'

export type Article = {
  title: string
  imageUrl: string
  articleUrl: string
  articleId: string
  color: number
}
export type WebData = {
  game: Game
  locale: string
  articles: Article[]
}

export type NewsApiResponse = {
  retcode: number
  message: string
  data: {
    iTotal: number
    list: Array<{
      sChanId: Array<string>
      sTitle: string
      sIntro: string
      sUrl: string
      sAuthor: string
      sContent: string
      sExt: string
      dtStartTime: string
      dtEndTime: string
      dtCreateTime: string
      iInfoId: number
      sTagName: Array<any>
      sCategoryName: string
    }>
  }
}

const apiRequestLocale = {
  en: 'en-us',
  ja: 'ja-jp',
}

export const webScraping = async (env: any) => {
  const browser = await puppeteer.launch(env.BROWSER)
  const data = (
    await Promise.all([fetchGenshinArticles(), fetchStarrailArticles(browser), fetchZenlessArticles()])
  ).flatMap(e => e)
  browser.close()
  return data
}

const option: puppeteer.WaitForOptions = { waitUntil: ['load'] }

const fetchGenshinArticles = async () => {
  const game = 'genshin_impact'
  const siteUrl = text.game[game].siteUrl
  const locales = Object.keys(siteUrl) as (keyof typeof siteUrl)[]
  const data: WebData[] = []
  for (const locale of locales) {
    try {
      const params = {
        iAppId: '32',
        iChanId: '395',
        iPageSize: '5',
        iPage: '1',
        sLangKey: apiRequestLocale[locale],
      }
      const query = new URLSearchParams(params)
      const response = await fetch(`${text.game[game].apiUrl}?${query}`, {
        headers: {
          authority: 'api-os-takumi-static.hoyoverse.com',
          accept: 'application/json, text/plain, */*',
          'accept-language': 'ja,en-US;q=0.9,en;q=0.8',
          origin: 'https://genshin.hoyoverse.com',
          referer: 'https://genshin.hoyoverse.com/',
          'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-site',
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      }).then(x => x.json() as Promise<NewsApiResponse>)
      if (response.retcode !== 0) {
        return []
      }
      const newsList = response['data']['list']
      const news = newsList.map(news => {
        const articleUrl: string = `${text.game[game].siteUrl[locale]}/detail/${news.iInfoId}`
        const imageUrl: string = JSON.parse(news.sExt).banner[0].url
        const title: string = news.sTitle
        const articleId = news.iInfoId.toString()
        const color = embedColor(title)
        return { articleUrl, imageUrl, title, articleId, color }
      })
      data.push({ game, locale, articles: news })
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
          const color = embedColor(title)
          return { articleUrl, imageUrl, title, articleId, color }
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

const fetchZenlessArticles = async () => {
  const game = 'zenless_zone_zero'
  const siteUrl = text.game[game].siteUrl
  const locales = Object.keys(siteUrl) as (keyof typeof siteUrl)[]
  const data: WebData[] = []
  for (const locale of locales) {
    try {
      const params = {
        iPageSize: '6',
        iPage: '1',
        iChanId: '288',
        sLangKey: locale,
      }
      const query = new URLSearchParams(params)
      const response = await fetch(`${text.game[game].apiUrl}?${query}`, {
        headers: {
          authority: 'api-os-takumi-static.hoyoverse.com',
          accept: 'application/json, text/plain, */*',
          'accept-language': 'ja,en-US;q=0.9,en;q=0.8',
          origin: 'https://zenless.hoyoverse.com',
          referer: 'https://zenless.hoyoverse.com/',
          'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-site',
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      }).then(x => x.json() as Promise<NewsApiResponse>)
      if (response.retcode !== 0) {
        return []
      }
      const newsList = response['data']['list']
      const news = newsList.map(news => {
        const articleUrl: string = `${text.game[game].siteUrl[locale]}/${news.iInfoId}`
        const imageUrl: string = JSON.parse(news.sExt)['news-banner'][0].url
        const title: string = news.sTitle
        const articleId = news.iInfoId.toString()
        const color = embedColor(title)
        return { articleUrl, imageUrl, title, articleId, color }
      })
      data.push({ game, locale, articles: news })
    } catch (e) {
      console.warn(game, locale, e)
    }
  }
  return data
}
