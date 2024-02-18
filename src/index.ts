import type { APIEmbed } from 'discord-api-types/v10'
import {
  DiscordHono,
  Components,
  Button,
  LinkButton,
  CommandHandlers,
  ComponentHandlers,
  CronHandlers,
} from 'discord-hono'
import { commands } from './commands.js'
import * as d1 from './d1.js'
import type { WebData } from './web-scraping.js'
import { webScraping } from './web-scraping.js'
import type { Game } from './utils.js'
import { t, titleFilter, apiWait } from './utils.js'
import text from './locale.json'

export type Env = {
  Bindings: {
    DB: D1Database
    BROWSER: Fetcher
  }
}

const commandHandlers = new CommandHandlers<Env>()
  .on('set', async c => {
    const game = c.valuesMap.game as string | undefined
    const guild_id = c.interaction.guild_id as string | undefined
    const channel = c.valuesMap.channel as string | undefined
    const locale = (c.valuesMap.locale as string | undefined) || c.interaction.locale
    const filter_words = c.valuesMap.filter as string | undefined
    const success = await d1.setSubscribe(c.env.DB, game, guild_id, channel, locale, filter_words)
    const info = success ? await d1.getSubscribe(c.env.DB, game, guild_id) : undefined
    // success
    if (info) {
      const title = t(text.game[game as Game].title, locale)
      const filter = info.filter_words !== '' ? `\n${info.filter_words}` : ''
      return c.resEmbeds({
        title: t(text.set.success.embed.title, locale),
        description: `${title} <#${info.channel_id}>${filter}`,
      })
    }
    // set: success, get: error
    else if (success) return c.resEmbeds({ title: t(text.set.success.embed.title, locale) })
    // error
    else return c.resEphemeral({ content: t(text.set.error.content, locale) })
  })
  .on('info', async c => {
    const guild_id = c.interaction.guild_id
    const locale = c.interaction.locale
    const info = await d1.getGuildSubscribe(c.env.DB, guild_id)
    // success
    if (info?.[0]) {
      const description = info
        .map(e => {
          const emoji = text.game[e.title].emoji
          const title = t(text.game[e.title].title, e.locale)
          const filter = e.filter_words !== '' ? `\n${e.filter_words}` : ''
          return `${emoji} ${title} <#${e.channel_id}>${filter}`
        })
        .join('\n\n')
      return c.res({
        embeds: [{ title: t(text.info.success.embed.title, locale), description }],
        components: new Components()
          .row(
            ...info.map(e =>
              new Button('delete', t(text.info.success.components.delete, locale), 'Secondary')
                .custom_id(e.title)
                .emoji({
                  name: text.game[e.title].emoji,
                }),
            ),
          )
          .row(
            new Button('message-delete', t(text.info.success.components.messageDelete, locale), 'Secondary').emoji({
              name: '🗑️',
            }),
            new Button('test', t(text.info.success.components.test, locale)),
          ),
      })
    }
    // success: not set
    else if (info) return c.resEphemeral({ content: t(text.info.notSet.content, locale) })
    // error
    else return c.resEphemeral({ content: t(text.info.error.content, locale) })
  })
  .on('help', c =>
    c.resEphemeral({
      content: 'まだ作ってない\n↓の開発者サーバーで質問投げてください',
      components: new Components().row(new LinkButton('https://discord.gg/5bKYuCcmfu', 'Developer Discord')),
    }),
  )

const componentHandlers = new ComponentHandlers<Env>()
  .on('delete', async c => {
    const game = c.interaction.data?.custom_id
    const guild_id = c.interaction.guild_id
    const locale = c.interaction.locale
    const success = await d1.deleteSubscribe(c.env.DB, game, guild_id)
    // success
    if (success) {
      c.executionCtx.waitUntil(c.delete())
      return c.resEmbeds({
        title: t(text.delete.success.embed.title, locale),
        description: t(text.game[game as Game].title, locale),
      })
    }
    // error
    else return c.resUpdate({ content: t(text.delete.error.content, locale) })
  })
  .on('message-delete', async c => c.resUpdateDelete())
  .on('test', async c => {
    const locale = c.interaction.locale
    return c.resUpdate({ content: t(text.test.success.content, locale) })
  })

const cronHandlers = new CronHandlers().on('', async c => {
  const webData = await webScraping(c.env)
  const dbArticle = await d1.getArticleIds(c.env.db)
  if (!dbArticle) throw new Error('Web Scraping Error')
  const saveBatch: d1.SaveData[] = []
  const deff = webData
    .map(data => {
      const oldIds = dbArticle.find(e => e.game === data.game && e.locale === data.locale)?.article_ids || []
      const newIds = data.articles.map(e => e.articleId)
      const diffIds = newIds.filter(e => oldIds.indexOf(e) === -1)
      if (diffIds[0]) {
        const saveIds = [...new Set([...newIds, ...oldIds])]
        if (saveIds.length > 20) saveIds.length = 20
        const saveLatestData = data.articles[0]
        saveBatch.push({
          game: data.game,
          locale: data.locale,
          article_ids: JSON.stringify(saveIds),
          latest_article_data: JSON.stringify(saveLatestData),
        })
        return {
          game: data.game,
          locale: data.locale,
          articles: data.articles.filter(e => diffIds.some(e2 => e2 === e.articleId)),
        }
      }
      return undefined
    })
    .filter((e): e is WebData => e !== undefined)
  // data save
  if (saveBatch[0]) {
    const success = d1.setArticleIds(c.env.DB, saveBatch)
    if (!success) throw new Error('Database REPLACE INTO failed.')
  }
  // send message
  if (deff[0]) {
    let apiRes = undefined
    for (const data of deff) {
      const subscribe = await d1.getGameSubscribeAll(c.env.DB, data.game)
      if (!subscribe) {
        console.warn('Database SELECT failed.')
        continue
      }
      for (const guild of subscribe) {
        if (data.locale === guild.locale) {
          for (let i = 0; i < 3; i++) {
            await apiWait(apiRes)
            apiRes = await c.postEmbeds(
              guild.channel_id,
              ...data.articles
                .filter(e => titleFilter(e.title, guild.filter_words))
                .map(
                  e =>
                    ({
                      title: e.title,
                      description: `[${t(text.cron.embed.description, data.locale)}](${e.articleUrl})`,
                      image: { url: e.imageUrl },
                    }) as APIEmbed,
                ),
            )
            if (apiRes.res.ok) break
            if (apiRes.res.status !== 429) break
          }
        }
      }
    }
  }
})

const app = new DiscordHono()
app.commands(commands)
app.handlers(commandHandlers)
app.handlers(componentHandlers)
app.handlers(cronHandlers)
export default app
