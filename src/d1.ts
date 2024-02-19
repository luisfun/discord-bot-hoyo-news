import type { Game } from './utils'
import { games } from './utils'
import type { Article } from './web-scraping'

const isTableName = (name: string | undefined) => name === 'web_news_article_ids' || games.some(e => e === name)

export const setSubscribe = async (
  db: D1Database | undefined,
  game: string | undefined,
  guild_id: string | undefined,
  channel_id: string | undefined,
  locale: string | undefined,
  filter: string | undefined,
) => {
  if (!db || !game || !guild_id || !channel_id || !locale) return false
  const filter_words = filter || ''
  try {
    if (!isTableName(game)) throw new Error('Unauthorized access. Not a table name.')
    const info = await db
      .prepare(
        `REPLACE INTO ${game} (guild_id, channel_id, locale, filter_words, response_status) VALUES(?1, ?2, ?3, ?4, ?5)`,
      )
      .bind(guild_id, channel_id, locale, filter_words, 0)
      .run()
    if (!info.success) throw new Error('Database REPLACE INTO failed.')
    return true
  } catch (e) {
    console.warn(e)
    return false
  }
}

type GetSubscribe = {
  channel_id: string
  locale: string
  filter_words: string
}
export const getSubscribe = async (
  db: D1Database | undefined,
  game: string | undefined,
  guild_id: string | undefined,
) => {
  if (!db || !game || !guild_id) return undefined
  try {
    if (!isTableName(game)) throw new Error('Unauthorized access. Not a table name.')
    return (await db
      .prepare(`SELECT channel_id, locale, filter_words FROM ${game} WHERE guild_id = ?1`)
      .bind(guild_id)
      .first()) as GetSubscribe
  } catch (e) {
    console.warn(e)
    return undefined
  }
}

export const getGuildSubscribe = async (db: D1Database | undefined, guild_id: string | undefined) => {
  if (!db || !guild_id) return undefined
  try {
    const res = await db.batch(
      games.map(game =>
        db.prepare(`SELECT channel_id, locale, filter_words FROM ${game} WHERE guild_id = ?1`).bind(guild_id),
      ),
    )
    if (!res.every(e => e.success)) throw new Error('Database SELECT failed.')
    return res.map((e, i) => ({ ...(e.results[0] as GetSubscribe), title: games[i] })).filter(e => e.channel_id)
  } catch (e) {
    console.warn(e)
    return undefined
  }
}

export const deleteSubscribe = async (
  db: D1Database | undefined,
  game: string | undefined,
  guild_id: string | undefined,
) => {
  if (!db || !game || !guild_id) return false
  try {
    if (!isTableName(game)) throw new Error('Unauthorized access. Not a table name.')
    const info = await db.prepare(`DELETE FROM ${game} WHERE guild_id = ?1`).bind(guild_id).run()
    if (!info.success) throw new Error('Database DELETE failed.')
    return true
  } catch (e) {
    console.warn(e)
    return false
  }
}

type D1Article = {
  game: Game
  locale: string
  article_ids: string
}
export const getArticleIds = async (db: D1Database | undefined) => {
  try {
    if (!db) throw new Error('D1Database is nothing.')
    const res = await db.prepare('SELECT game, locale, article_ids FROM web_news_article_ids').all()
    if (!res.success) throw new Error('Database SELECT failed.')
    const results = res.results as D1Article[]
    return results.map(e => ({ ...e, article_ids: JSON.parse(e.article_ids) as string[] }))
  } catch (e) {
    console.warn(e)
    return undefined
  }
}

export type SaveData = {
  game: string
  locale: string
  article_ids: string[]
  latest_article_data: Article
}
export const setArticleIds = async (db: D1Database | undefined, data: SaveData[]) => {
  try {
    if (!db) throw new Error('D1Database is nothing.')
    const res = await db.batch(
      data.map(e =>
        db
          .prepare(
            'REPLACE INTO web_news_article_ids (game, locale, article_ids, latest_article_data) VALUES(?1, ?2, ?3, ?4)',
          )
          .bind(e.game, e.locale, JSON.stringify(e.article_ids), JSON.stringify(e.latest_article_data)),
      ),
    )
    if (!res.every(e => e.success)) throw new Error('Database REPLACE INTO failed.')
    return true
  } catch (e) {
    console.warn(e)
    return false
  }
}

export const getGameSubscribeAll = async (db: D1Database | undefined, game: string | undefined) => {
  try {
    if (!db) throw new Error('D1Database is nothing.')
    if (!isTableName(game)) throw new Error('Unauthorized access. Not a table name.')
    const res = await db.prepare(`SELECT channel_id, locale, filter_words FROM ${game}`).all()
    if (!res.success) throw new Error('Database SELECT failed.')
    return res.results as GetSubscribe[]
  } catch (e) {
    console.warn(e)
    return undefined
  }
}

export const updateOrDeleteChannel = async (
  db: D1Database | undefined,
  game: string | undefined,
  channel_id: string | undefined,
  status: number | undefined,
) => {
  try {
    if (!db) throw new Error('D1Database is nothing.')
    if (!isTableName(game)) throw new Error('Unauthorized access. Not a table name.')
    const info = (await db
      .prepare(`SELECT guild_id, response_status FROM ${game} WHERE channel_id = ?1`)
      .bind(channel_id)
      .first()) as { guild_id: string; response_status: number }
    if (info.response_status === 404 && status === 404) {
      const res = await db.prepare(`DELETE FROM ${game} WHERE guild_id = ?1`).bind(info.guild_id).run()
      if (!res.success) throw new Error('Database DELETE failed.')
    } else {
      const res = await db
        .prepare(`UPDATE ${game} SET response_status = ?1 WHERE guild_id = ?2`)
        .bind(status, info.guild_id)
        .run()
      if (!res.success) throw new Error('Database UPDATE failed.')
    }
    return true
  } catch (e) {
    console.warn(e)
    return false
  }
}

export const getTestArticleAndChannel = async (db: D1Database | undefined, guild_id: string | undefined) => {
  try {
    if (!db) throw new Error('D1Database is nothing.')
    if (!guild_id) throw new Error('guild_id is nothing.')
    // get latest article data
    const articleRes = await db.prepare(`SELECT game, locale, latest_article_data FROM web_news_article_ids`).all()
    if (!articleRes.success) throw new Error('Database SELECT failed.')
    const results = articleRes.results as { game: string; locale: string; latest_article_data: string }[]
    const articles = results.map(e => ({ ...e, latest_article_data: JSON.parse(e.latest_article_data) as Article }))
    // get guild info
    const guildRes = await db.batch(
      games.map(game => db.prepare(`SELECT channel_id, locale FROM ${game} WHERE guild_id = ?1`).bind(guild_id)),
    )
    if (!guildRes.every(e => e.success)) throw new Error('Database SELECT failed.')
    const guild = guildRes
      .map((e, i) => ({ ...(e.results[0] as Omit<GetSubscribe, 'filter_words'>), title: games[i] }))
      .filter(e => e.channel_id)
    return { articles, guild }
  } catch (e) {
    console.warn(e)
    return undefined
  }
}
