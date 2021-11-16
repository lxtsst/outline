// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module '@out... Remove this comment to see the full error message
import passport from "@outlinewiki/koa-passport";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module '@out... Remove this comment to see the full error message
import { Strategy as AzureStrategy } from "@outlinewiki/passport-azure-ad-oauth2";
import jwt from "jsonwebtoken";
import Router from "koa-router";
import accountProvisioner from "../../../commands/accountProvisioner";
import env from "../../../env";
import { MicrosoftGraphError } from "../../../errors";
import passportMiddleware from "../../../middlewares/passport";
import { StateStore, request } from "../../../utils/passport";

const router = new Router();
const providerName = "azure";
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const AZURE_RESOURCE_APP_ID = process.env.AZURE_RESOURCE_APP_ID;
// @ts-expect-error ts-migrate(7034) FIXME: Variable 'scopes' implicitly has type 'any[]' in s... Remove this comment to see the full error message
const scopes = [];

export const config = {
  name: "Microsoft",
  enabled: !!AZURE_CLIENT_ID,
};

if (AZURE_CLIENT_ID) {
  const strategy = new AzureStrategy(
    {
      clientID: AZURE_CLIENT_ID,
      clientSecret: AZURE_CLIENT_SECRET,
      callbackURL: `${env.URL}/auth/azure.callback`,
      useCommonEndpoint: true,
      passReqToCallback: true,
      resource: AZURE_RESOURCE_APP_ID,
      store: new StateStore(),
      // @ts-expect-error ts-migrate(7005) FIXME: Variable 'scopes' implicitly has an 'any[]' type.
      scope: scopes,
    },
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'req' implicitly has an 'any' type.
    async function (req, accessToken, refreshToken, params, _, done) {
      try {
        // see docs for what the fields in profile represent here:
        // https://docs.microsoft.com/en-us/azure/active-directory/develop/access-tokens
        const profile = jwt.decode(params.id_token);
        // Load the users profile from the Microsoft Graph API
        // https://docs.microsoft.com/en-us/graph/api/resources/users?view=graph-rest-1.0
        const profileResponse = await request(
          `https://graph.microsoft.com/v1.0/me`,
          accessToken
        );

        if (!profileResponse) {
          // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
          throw new MicrosoftGraphError(
            "Unable to load user profile from Microsoft Graph API"
          );
        }

        // Load the organization profile from the Microsoft Graph API
        // https://docs.microsoft.com/en-us/graph/api/organization-get?view=graph-rest-1.0
        const organizationResponse = await request(
          `https://graph.microsoft.com/v1.0/organization`,
          accessToken
        );

        if (!organizationResponse) {
          // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
          throw new MicrosoftGraphError(
            "Unable to load organization info from Microsoft Graph API"
          );
        }

        const organization = organizationResponse.value[0];
        // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
        const email = profile.email || profileResponse.mail;

        if (!email) {
          // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
          throw new MicrosoftGraphError(
            "'email' property is required but could not be found in user profile."
          );
        }

        const domain = email.split("@")[1];
        const subdomain = domain.split(".")[0];
        const teamName = organization.displayName;
        const result = await accountProvisioner({
          ip: req.ip,
          team: {
            name: teamName,
            domain,
            subdomain,
          },
          user: {
            // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
            name: profile.name,
            email,
            // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
            avatarUrl: profile.picture,
          },
          authenticationProvider: {
            name: providerName,
            // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
            providerId: profile.tid,
          },
          authentication: {
            // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
            providerId: profile.oid,
            accessToken,
            refreshToken,
            // @ts-expect-error ts-migrate(7005) FIXME: Variable 'scopes' implicitly has an 'any[]' type.
            scopes,
          },
        });
        return done(null, result.user, result);
      } catch (err) {
        return done(err, null);
      }
    }
  );
  passport.use(strategy);

  router.get("azure", passport.authenticate(providerName));

  router.get("azure.callback", passportMiddleware(providerName));
}

export default router;
