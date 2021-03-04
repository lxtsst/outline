// @flow
import Router from "koa-router";
import passport from "passport";
import { Strategy as SlackStrategy } from "passport-slack";
import accountProvisioner from "../commands/accountProvisioner";
import env from "../env";
import auth from "../middlewares/authentication";
import passportMiddleware from "../middlewares/passport";
import { Authentication, Collection, Integration, Team } from "../models";
import * as Slack from "../slack";

const router = new Router();
const providerName = "slack";

const scopes = [
  "identity.email",
  "identity.basic",
  "identity.avatar",
  "identity.team",
];

passport.use(
  new SlackStrategy(
    {
      clientID: process.env.SLACK_KEY,
      clientSecret: process.env.SLACK_SECRET,
      callbackURL: `${env.URL}/auth/slack.callback`,
      passReqToCallback: true,
      scope: scopes,
    },
    async function (req, accessToken, refreshToken, profile, done) {
      try {
        const result = await accountProvisioner({
          ip: req.ip,
          team: {
            name: profile.team.name,
            subdomain: profile.team.domain,
            avatarUrl: profile.team.image_230,
          },
          user: {
            name: profile.user.name,
            email: profile.user.email,
            avatarUrl: profile.user.image_192,
          },
          authenticationProvider: {
            name: providerName,
            providerId: profile.team.id,
          },
          authentication: {
            providerId: profile.user.id,
            accessToken,
            refreshToken,
            scopes,
          },
        });
        return done(null, result.user, result);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

router.get("slack", passport.authenticate(providerName));

router.get(
  "slack.callback",
  auth({ required: false }),
  passportMiddleware(providerName)
);

router.get("slack.commands", auth({ required: false }), async (ctx) => {
  const { code, state, error } = ctx.request.query;
  const user = ctx.state.user;
  ctx.assertPresent(code || error, "code is required");

  if (error) {
    ctx.redirect(`/settings/integrations/slack?error=${error}`);
    return;
  }

  // this code block accounts for the root domain being unable to
  // access authentication for subdomains. We must forward to the appropriate
  // subdomain to complete the oauth flow
  if (!user) {
    if (state) {
      try {
        const team = await Team.findByPk(state);
        return ctx.redirect(
          `${team.url}/auth${ctx.request.path}?${ctx.request.querystring}`
        );
      } catch (err) {
        return ctx.redirect(
          `/settings/integrations/slack?error=unauthenticated`
        );
      }
    } else {
      return ctx.redirect(`/settings/integrations/slack?error=unauthenticated`);
    }
  }

  const endpoint = `${process.env.URL || ""}/auth/slack.commands`;
  const data = await Slack.oauthAccess(code, endpoint);

  const authentication = await Authentication.create({
    service: "slack",
    userId: user.id,
    teamId: user.teamId,
    token: data.access_token,
    scopes: data.scope.split(","),
  });

  await Integration.create({
    service: "slack",
    type: "command",
    userId: user.id,
    teamId: user.teamId,
    authenticationId: authentication.id,
    settings: {
      serviceTeamId: data.team_id,
    },
  });

  ctx.redirect("/settings/integrations/slack");
});

router.get("slack.post", auth({ required: false }), async (ctx) => {
  const { code, error, state } = ctx.request.query;
  const user = ctx.state.user;
  ctx.assertPresent(code || error, "code is required");

  const collectionId = state;
  ctx.assertUuid(collectionId, "collectionId must be an uuid");

  if (error) {
    ctx.redirect(`/settings/integrations/slack?error=${error}`);
    return;
  }

  // this code block accounts for the root domain being unable to
  // access authentcation for subdomains. We must forward to the
  // appropriate subdomain to complete the oauth flow
  if (!user) {
    try {
      const collection = await Collection.findByPk(state);
      const team = await Team.findByPk(collection.teamId);
      return ctx.redirect(
        `${team.url}/auth${ctx.request.path}?${ctx.request.querystring}`
      );
    } catch (err) {
      return ctx.redirect(`/settings/integrations/slack?error=unauthenticated`);
    }
  }

  const endpoint = `${process.env.URL || ""}/auth/slack.post`;
  const data = await Slack.oauthAccess(code, endpoint);

  const authentication = await Authentication.create({
    service: "slack",
    userId: user.id,
    teamId: user.teamId,
    token: data.access_token,
    scopes: data.scope.split(","),
  });

  await Integration.create({
    service: "slack",
    type: "post",
    userId: user.id,
    teamId: user.teamId,
    authenticationId: authentication.id,
    collectionId,
    events: [],
    settings: {
      url: data.incoming_webhook.url,
      channel: data.incoming_webhook.channel,
      channelId: data.incoming_webhook.channel_id,
    },
  });

  ctx.redirect("/settings/integrations/slack");
});

export default router;
