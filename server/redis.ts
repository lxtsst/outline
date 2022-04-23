import Redis from "ioredis";
import { defaults } from "lodash";
import Logger from "./logging/logger";

const defaultOptions = {
  maxRetriesPerRequest: 20,

  retryStrategy(times: number) {
    Logger.warn(`Retrying redis connection: attempt ${times}`);
    return Math.min(times * 100, 3000);
  },

  // support Heroku Redis, see:
  // https://devcenter.heroku.com/articles/heroku-redis#ioredis-module
  tls:
    process.env.REDIS_URL && process.env.REDIS_URL.startsWith("rediss://")
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
};

export default class RedisAdapter extends Redis {
  constructor(url: string | undefined) {
    if (!(url || "").startsWith("ioredis://")) {
      super(process.env.REDIS_URL, defaultOptions);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const decodedString = Buffer.from(url!.slice(10), "base64").toString();
      const customOptions = JSON.parse(decodedString);
      const mergedOptions = defaults(defaultOptions, customOptions);

      super(mergedOptions);
    }

    // More than the default of 10 listeners is expected for the amount of queues
    // we're running. Increase the max here to prevent a warning in the console:
    // https://github.com/OptimalBits/bull/issues/1192
    this.setMaxListeners(100);
  }

  private static _client: RedisAdapter;
  private static _subscriber: RedisAdapter;

  public static get Client(): RedisAdapter {
    return this._client || (this._client = new this(process.env.REDIS_URL));
  }

  public static get Subscriber(): RedisAdapter {
    return (
      this._subscriber || (this._subscriber = new this(process.env.REDIS_URL))
    );
  }
}
