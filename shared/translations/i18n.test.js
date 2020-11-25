/* eslint-disable flowtype/require-valid-file-annotation */
import { initI18n, i18n } from "./i18n";
import de_DE from "./locales/de_DE.json";
import en_US from "./locales/en_US.json";
import pt_PT from "./locales/pt_PT.json";

describe("i18n process.env is unset", () => {
  beforeEach(() => {
    delete process.env.DEFAULT_LANGUAGE;
    initI18n()
      .addResources("en_US", "translation", en_US)
      .addResources("de_DE", "translation", de_DE)
      .addResources("pt_PT", "translation", pt_PT);
  });

  it("translation of key should match", () =>
    expect(i18n.t("Saving…")).toBe("Saving…"));

  it("translation if changed to de_DE", () => {
    i18n.changeLanguage("de_DE");
    expect(i18n.t("Saving…")).toBe("Am speichern…");
  });

  it("translation if changed to pt_PT", () => {
    i18n.changeLanguage("pt_PT");
    expect(i18n.t("Saving…")).toBe("A guardar…");
  });
});

describe("i18n process.env is en_US", () => {
  beforeEach(() => {
    process.env.DEFAULT_LANGUAGE = "en_US";
    initI18n()
      .addResources("en_US", "translation", en_US)
      .addResources("de_DE", "translation", de_DE)
      .addResources("pt_PT", "translation", pt_PT);
  });

  it("translation of key should match", () =>
    expect(i18n.t("Saving…")).toBe("Saving…"));

  it("translation if changed to de_DE", () => {
    i18n.changeLanguage("de_DE");
    expect(i18n.t("Saving…")).toBe("Am speichern…");
  });

  it("translation if changed to pt_PT", () => {
    i18n.changeLanguage("pt_PT");
    expect(i18n.t("Saving…")).toBe("A guardar…");
  });
});

describe("i18n process.env is de_DE", () => {
  beforeEach(() => {
    process.env.DEFAULT_LANGUAGE = "de_DE";
    initI18n()
      .addResources("en_US", "translation", en_US)
      .addResources("de_DE", "translation", de_DE)
      .addResources("pt_PT", "translation", pt_PT);
  });

  it("translation of key should match", () =>
    expect(i18n.t("Saving…")).toBe("Am speichern…"));

  it("translation if changed to en_US", () => {
    i18n.changeLanguage("en_US");
    expect(i18n.t("Saving…")).toBe("Saving…");
  });

  it("translation if changed to pt_PT", () => {
    i18n.changeLanguage("pt_PT");
    expect(i18n.t("Saving…")).toBe("A guardar…");
  });
});

describe("i18n process.env is pt_PT", () => {
  beforeEach(() => {
    process.env.DEFAULT_LANGUAGE = "pt_PT";
    initI18n()
      .addResources("en_US", "translation", en_US)
      .addResources("de_DE", "translation", de_DE)
      .addResources("pt_PT", "translation", pt_PT);
  });

  it("translation of key should match", () =>
    expect(i18n.t("Saving…")).toBe("A guardar…"));

  it("translation if changed to en_US", () => {
    i18n.changeLanguage("en_US");
    expect(i18n.t("Saving…")).toBe("Saving…");
  });

  it("translation if changed to de_DE", () => {
    i18n.changeLanguage("de_DE");
    expect(i18n.t("Saving…")).toBe("Am speichern…");
  });
});
