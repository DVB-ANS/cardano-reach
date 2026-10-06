// `yt-dlp ytsearchN: -j` : une ligne JSON par vidéo (`title`, `webpage_url`, `upload_date` YYYYMMDD, `channel`, `description`).
import { toIsoDate } from "../dates.ts";
import { runCommand } from "../run-command.ts";
import type { ChannelSearch, SearchHit } from "../types.ts";

const RESULTS_PER_QUERY = 5;

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

export function parseYoutubeOutput(output: string): SearchHit[] {
  const hits: SearchHit[] = [];
  for (const line of output.split("\n")) {
    if (!line.trim()) continue;
    const parsed: unknown = JSON.parse(line);
    if (typeof parsed !== "object" || parsed === null) continue;
    const video = parsed as Record<string, unknown>;
    const title = stringField(video, "title");
    const url = stringField(video, "webpage_url");
    if (!title || !url) continue;
    const channelName = stringField(video, "channel");
    const description = stringField(video, "description") ?? "";
    hits.push({
      channel: "youtube",
      title: channelName ? `${title} — ${channelName}` : title,
      url,
      snippet: description.replace(/\s+/g, " ").trim(),
      publishedAt: toIsoDate(stringField(video, "upload_date")),
      source: "youtube.com",
    });
  }
  return hits;
}

export const searchYoutube: ChannelSearch = async (query, { signal, timeoutMs }) => {
  const args = [`ytsearch${RESULTS_PER_QUERY}:${query.query}`, "-j", "--skip-download", "--no-warnings"];
  return parseYoutubeOutput(await runCommand("yt-dlp", args, { signal, timeoutMs }));
};
