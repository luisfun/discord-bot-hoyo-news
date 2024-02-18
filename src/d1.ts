import type { Game } from './utils'
import { games } from './utils'

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
  article_ids: string
  latest_article_data: string
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
          .bind(e.game, e.locale, e.article_ids, e.latest_article_data),
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
