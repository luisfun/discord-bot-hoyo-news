CREATE TABLE IF NOT EXISTS web_news_article_ids (game TEXT, locale TEXT, article_ids TEXT, latest_article_data TEXT, PRIMARY KEY (game, locale));
CREATE TABLE IF NOT EXISTS genshin_impact (guild_id TEXT PRIMARY KEY, channel_id TEXT, locale TEXT, filter_words TEXT, response_status INTEGER);
CREATE TABLE IF NOT EXISTS honkai_star_rail (guild_id TEXT PRIMARY KEY, channel_id TEXT, locale TEXT, filter_words TEXT, response_status INTEGER);
CREATE TABLE IF NOT EXISTS zenless_zone_zero (guild_id TEXT PRIMARY KEY, channel_id TEXT, locale TEXT, filter_words TEXT, response_status INTEGER);
