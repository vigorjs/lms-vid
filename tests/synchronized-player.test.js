// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SynchronizedPlayer } from "@/components/video/synchronized-player";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SynchronizedPlayer controls", () => {
  it("uses custom controls for synchronized and separate modes", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url) => ({
      ok: true,
      json: async () => ({ data: { url: `https://media.test/${String(url).split("/").at(-2)}.mp4` } }),
    })));

    const { container } = render(React.createElement(SynchronizedPlayer, {
      referenceAssetId: "teacher-asset",
      studentAssetId: "student-asset",
      courseId: "course-1",
    }));

    await waitFor(() => expect(container.querySelectorAll("video")).toHaveLength(2));
    expect(screen.getByLabelText("Timeline sinkron")).toBeTruthy();
    container.querySelectorAll("video").forEach((video) => expect(video.controls).toBe(false));

    fireEvent.click(screen.getByRole("button", { name: "Aktifkan kontrol terpisah" }));

    expect(screen.getByLabelText("Timeline Video teacher")).toBeTruthy();
    expect(screen.getByLabelText("Timeline Video student")).toBeTruthy();
    expect(screen.queryByLabelText("Timeline sinkron")).toBeNull();
    container.querySelectorAll("video").forEach((video) => expect(video.controls).toBe(false));
  });
});
