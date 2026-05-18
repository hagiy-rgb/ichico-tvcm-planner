import { describe, expect, it } from "vitest";
import { escapeDriveQueryValue, sanitizeDriveSegment } from "./gdrive-client";

describe("gdrive-client helpers", () => {
  it("escapes single quotes in drive queries", () => {
    expect(escapeDriveQueryValue("O'Brien")).toBe("O\\'Brien");
  });

  it("sanitizes invalid path characters", () => {
    expect(sanitizeDriveSegment('test:file/name?')).toBe("test_file_name_");
  });
});
