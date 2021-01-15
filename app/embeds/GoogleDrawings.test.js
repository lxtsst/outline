/* eslint-disable flowtype/require-valid-file-annotation */
import GoogleDrawings from "./GoogleDrawings";

describe("GoogleSheets", () => {
  const match = GoogleDrawings.ENABLED[0];
  test("to be enabled on share link", () => {
    expect(
      "https://docs.google.com/drawings/d/1zDLtJ4HSCnjGCGSoCgqGe3F8p6o7R8Vjk8MDR6dKf-U/edit".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://docs.google.com/drawings".match(match)).toBe(null);
    expect("https://docs.google.com".match(match)).toBe(null);
    expect("https://www.google.com".match(match)).toBe(null);
  });
});
