import dotenv from 'dotenv'
import process from 'node:process'
import { Command, Option, ChannelOption, register } from 'discord-hono'

dotenv.config({ path: '.dev.vars' })

const commands = [
  new Command('set', 'Subscribe to News').options(
    new Option('game', 'Select a game')
      .required()
      .choices(
        { name: 'Genshin Impact', value: 'genshin_impact' },
        { name: 'Honkai: Star Rail', value: 'honkai_star_rail' },
        { name: 'Zenless Zone Zero', value: 'zenless_zone_zero' },
      ),
    new ChannelOption('channel', 'Select a channel to deliver news').channel_types([0]).required(),
    new Option('locale', 'Select a locale').choices({ name: 'English', value: 'en' }, { name: '日本語', value: 'ja' }),
    new Option('filter', 'Filter words in news titles'),
  ),
  new Command('info', 'Subscription Information'),
  new Command('help', 'Help'),
  new Command('invite', '').type(2),
]

// prettier-ignore
await register(
  commands,
  process.env.DISCORD_APPLICATION_ID,
  process.env.DISCORD_TOKEN,
  //process.env.DISCORD_TEST_GUILD_ID
)
