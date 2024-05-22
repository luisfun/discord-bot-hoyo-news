import type { APIEmbed } from 'discord-api-types/v10'
import { postMessage } from 'discord-hono'
import type { Article } from './web-scraping'
import text from './locale.json'

export type Game = keyof typeof text.game
export const games = Object.keys(text.game) as Game[]

export const t = (textJson: Record<string, string>, locale: string) => {
  const textLocales = Object.keys(textJson)
  const textLoc = localeFind(textLocales, locale) || 'en'
  if (textJson[textLoc]) return textJson[textLoc]
  return 'Failed to load text.'
}

const localeFind = (locales: string[], a: string) => locales.find(loc => localeMatch(loc, a))

export const localeMatch = (a: string, b: string) => {
  if (a === '' || b === '') return false
  const arrA = a.toLowerCase().split('-')
  const arrB = b.toLowerCase().split('-')
  for (let i = 0, len = Math.max(arrA.length, arrB.length); i < len; i++) {
    if (arrA[i] && arrB[i] && arrA[i] !== arrB[i]) return false
  }
  return true
}

export const titleFilter = (title: string, filter_words: string | undefined) => {
  if (!filter_words || filter_words === '') return true
  const words = filter_words.split(',').map(e => e.trim())
  for (const word of words) {
    if (title.includes(word)) return true
  }
  return false
}

export const embedColor = (title: string) => {
  if (title.includes('Web Event') || title.includes('Webイベント') || title === 'yellow') return 15918848
  if (
    title.includes('Special Program Preview') ||
    title.includes('Event Wishes Notice') ||
    title.includes('予告番組') ||
    title.includes('祈願予告') ||
    title.includes('イベント祈願') ||
    title.includes('開発チームQ&A') ||
    title === 'green'
  )
    return 45163
  if (title === 'red') return 16730880
  return 1667583 // blue
}

export const postArticles = async (
  token: string | undefined,
  game: Game,
  locale: string,
  articles: Article[],
  channel_id: string,
  filter_words?: string,
) => {
  return await postMessage(token, channel_id, {
    embeds: [
      ...articles
        .filter(e => titleFilter(e.title, filter_words))
        .map(
          e =>
            ({
              author: { name: t(text.game[game].title, locale), icon_url: text.game[game].icon },
              title: e.title,
              description: `[${t(text.cron.embed.description, locale)}](${e.articleUrl})`,
              image: { url: e.imageUrl },
              color: e.color,
            }) as APIEmbed,
        ),
    ],
  })
}

export const notSupportLocale = (locale: string) => {
  const supportLocales = Object.keys(text.help.embed.description)
  const match = localeFind(supportLocales, locale)
  if (match) return ''
  return '\n\nYour locale is not supported. Please specify your locale when you do `/set`.'
}
