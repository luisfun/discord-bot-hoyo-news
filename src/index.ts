import { DiscordHono, Components, Button, LinkButton, ApiRateLimitController } from 'discord-hono'
import * as d1 from './d1'
import type { WebData } from './web-scraping'
import { webScraping } from './web-scraping'
import type { Game } from './utils'
import { t, localeMatch, postArticles, embedColor, notSupportLocale } from './utils'
import text from './locale.json'

export type Env = {
  Bindings: {
    DB: D1Database
    BROWSER: Fetcher
    DISCORD_APPLICATION_ID: string
    DISCORD_TOKEN: string
  }
}

const app = new DiscordHono<Env>()
  .command('set', async c => {
    const game = c.values.game as Game
    const guild_id = c.interaction.guild_id as string | undefined
    const channel = c.values.channel as string | undefined
    const locale = (c.values.locale as string | undefined) || c.interaction.locale
    const filter_words = c.values.filter as string | undefined
    const success = await d1.setSubscribe(c.env.DB, game, guild_id, channel, locale, filter_words)
    const info = success ? await d1.getSubscribe(c.env.DB, game, guild_id) : undefined
    // success
    if (info) {
      const title = t(text.game[game].title, locale)
      const emoji = text.game[game].emoji
      const filter = info.filter_words !== '' ? `\n\`${info.filter_words}\`` : ''
      return c.res({
        embeds: [
          {
            title: t(text.set.success.embed.title, locale),
            description: `${emoji} ${title} <#${info.channel_id}>${filter}`,
            color: embedColor('green'),
          },
        ],
      })
    }
    // set: success, get: error
    else if (success)
      return c.res({ embeds: [{ title: t(text.set.success.embed.title, locale), color: embedColor('green') }] })
    // error
    else return c.resEphemeral({ content: t(text.set.error.content, locale) })
  })
  .command('info', async c => {
    const guild_id = c.interaction.guild_id
    const locale = c.interaction.locale
    const info = await d1.getGuildSubscribe(c.env.DB, guild_id)
    // success
    if (info?.[0]) {
      const description = info
        .map(e => {
          const emoji = text.game[e.title].emoji
          const title = t(text.game[e.title].title, e.locale)
          const filter = e.filter_words !== '' ? `\n\`${e.filter_words}\`` : ''
          return `${emoji} ${title} <#${e.channel_id}>${filter}`
        })
        .join('\n\n')
      return c.resEphemeral({
        embeds: [{ title: t(text.info.success.embed.title, locale), description, color: embedColor('blue') }],
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
          .row(new Button('test', t(text.info.success.components.test, locale))),
      })
    }
    // success: not set
    else if (info) return c.resEphemeral({ content: t(text.info.notSet.content, locale) })
    // error
    else return c.resEphemeral({ content: t(text.info.error.content, locale) })
  })
  .command('help', c =>
    c.resEphemeral({
      embeds: [
        {
          description: t(text.help.embed.description, c.interaction.locale) + notSupportLocale(c.interaction.locale),
          color: embedColor('blue'),
        },
      ],
      components: new Components().row(new LinkButton('https://discord.gg/5bKYuCcmfu', 'Developer Discord')),
    }),
  )
  .command('invite', c =>
    c.resEphemeral({
      content: `https://discord.com/api/oauth2/authorize?client_id=${c.env.DISCORD_APPLICATION_ID}&permissions=0&scope=bot`,
    }),
  )

  .component('delete', async c => {
    const game = c.interaction.data?.custom_id
    const guild_id = c.interaction.guild_id
    const locale = c.interaction.locale
    const success = await d1.deleteSubscribe(c.env.DB, game, guild_id)
    // success
    if (success) {
      return c.resRepost({
        embeds: [
          {
            title: t(text.delete.success.embed.title, locale),
            description: t(text.game[game as Game].title, locale),
            color: embedColor('red'),
          },
        ],
      })
    }
    // error
    else return c.resUpdate({ content: t(text.delete.error.content, locale) })
  })
  .component('test', async c => {
    const guild_id = c.interaction.guild_id
    const locale = c.interaction.locale
    let updateText: string = ''
    try {
      const info = await d1.getTestArticleAndChannel(c.env.DB, guild_id)
      if (!info) throw new Error('Database SELECT failed.')
      for (const channel of info.guild) {
        for (const article of info.articles) {
          if (channel.title === article.game && localeMatch(channel.locale, article.locale)) {
            const res = await postArticles(
              c.env.DISCORD_TOKEN,
              article.game,
              article.locale,
              [article.latest_article_data],
              channel.channel_id,
            )
            if (!res) throw new Error('Send error.')
          }
        }
      }
      updateText = t(text.test.success.content, locale)
    } catch (e) {
      updateText = `${t(text.test.error.content, locale)}\n${e}`
    }
    return c.resUpdate({ content: updateText })
  })

  .cron('', async c => {
    const webData = await webScraping(c.env)
    const dbArticle = await d1.getArticleIds(c.env.DB)
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
            article_ids: saveIds,
            latest_article_data: saveLatestData,
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
      const controller = new ApiRateLimitController()
      const notFoundList: { game: string; channel_id: string; status: number }[] = []
      for (const data of deff) {
        const subscribe = await d1.getGameSubscribeAll(c.env.DB, data.game)
        if (!subscribe) continue
        for (const guild of subscribe) {
          if (localeMatch(data.locale, guild.locale)) {
            for (let i = 0; i < 3; i++) {
              await controller.wait()
              controller.res = await postArticles(
                c.env.DISCORD_TOKEN,
                data.game,
                data.locale,
                data.articles,
                guild.channel_id,
                guild.filter_words,
              )
              if (controller.res?.ok) break
              if (controller.res?.status === 404)
                notFoundList.push({ game: data.game, channel_id: guild.channel_id, status: controller.res.status })
              if (controller.res?.status !== 429) break
            }
          }
        }
      }
      if (notFoundList[0]) {
        for (const notFound of notFoundList) {
          await d1.updateOrDeleteChannel(c.env.DB, notFound.game, notFound.channel_id, notFound.status)
        }
      }
    }
  })

export default app

// test
/*
export default {
  async fetch(request: Request, env: Env['Bindings'], ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const { pathname } = url
    if (pathname === `/`) {
      ctx.waitUntil(test(env))
    }
    return new Response('Hello World!')
  },
  async scheduled(event: any, env: Env['Bindings'], ctx: ExecutionContext) {
    ctx.waitUntil(test(env))
  },
}
const test = async (env: Env['Bindings']) => {
}
*/
