// @flow
import { UserAuthentication } from "../models";
import { buildUser, buildTeam } from "../test/factories";
import { flushdb } from "../test/support";
import accountProvisioner from "./accountProvisioner";

jest.mock("aws-sdk", () => {
  const mS3 = { putObject: jest.fn().mockReturnThis(), promise: jest.fn() };
  return {
    S3: jest.fn(() => mS3),
    Endpoint: jest.fn(),
  };
});

beforeEach(() => flushdb());

describe("accountProvisioner", () => {
  const ip = "127.0.0.1";

  it("should create a new user and team", async () => {
    const { user, team, isFirstUser, isFirstSignin } = await accountProvisioner(
      {
        ip,
        user: {
          name: "Jenny Tester",
          email: "jenny@example.com",
          avatarUrl: "https://example.com/avatar.png",
        },
        team: {
          name: "New team",
          avatarUrl: "https://example.com/avatar.png",
          subdomain: "example",
        },
        authenticationProvider: {
          name: "google",
          providerId: "example.com",
        },
        authentication: {
          providerId: "123456789",
          accessToken: "123",
          scopes: ["read"],
        },
      }
    );

    const authentications = await user.getAuthentications();
    const auth = authentications[0];

    expect(auth.accessToken).toEqual("123");
    expect(auth.scopes.length).toEqual(1);
    expect(auth.scopes[0]).toEqual("read");
    expect(team.name).toEqual("New team");
    expect(user.email).toEqual("jenny@example.com");
    expect(isFirstSignin).toEqual(true);
    expect(isFirstUser).toEqual(true);
  });

  it("should update exising user and authentication", async () => {
    const existingTeam = await buildTeam();
    const providers = await existingTeam.getAuthenticationProviders();
    const authenticationProvider = providers[0];
    const existing = await buildUser({ teamId: existingTeam.id });
    const authentications = await existing.getAuthentications();
    const authentication = authentications[0];
    const newEmail = "test@example.com";

    const { user } = await accountProvisioner({
      ip,
      user: {
        name: existing.name,
        email: newEmail,
        avatarUrl: existing.avatarUrl,
      },
      team: {
        name: existingTeam.name,
        avatarUrl: existingTeam.avatarUrl,
        subdomain: "example",
      },
      authenticationProvider: {
        name: authenticationProvider.name,
        providerId: authenticationProvider.providerId,
      },
      authentication: {
        providerId: authentication.providerId,
        accessToken: "123",
        scopes: ["read"],
      },
    });

    const auth = await UserAuthentication.findByPk(authentication.id);
    expect(auth.accessToken).toEqual("123");
    expect(auth.scopes.length).toEqual(1);
    expect(auth.scopes[0]).toEqual("read");
    expect(user.email).toEqual(newEmail);
  });

  it("should create a new user in an existing team", async () => {
    const team = await buildTeam();
    const authenticationProviders = await team.getAuthenticationProviders();
    const authenticationProvider = authenticationProviders[0];

    const { user, isFirstSignin } = await accountProvisioner({
      ip,
      user: {
        name: "Jenny Tester",
        email: "jenny@example.com",
        avatarUrl: "https://example.com/avatar.png",
      },
      team: {
        name: team.name,
        avatarUrl: team.avatarUrl,
        subdomain: "example",
      },
      authenticationProvider: {
        name: authenticationProvider.name,
        providerId: authenticationProvider.providerId,
      },
      authentication: {
        providerId: "123456789",
        accessToken: "123",
        scopes: ["read"],
      },
    });

    const authentications = await user.getAuthentications();
    const auth = authentications[0];

    expect(auth.accessToken).toEqual("123");
    expect(auth.scopes.length).toEqual(1);
    expect(auth.scopes[0]).toEqual("read");
    expect(user.email).toEqual("jenny@example.com");
    expect(isFirstSignin).toEqual(true);
  });
});
