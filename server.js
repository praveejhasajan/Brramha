const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Node 18+ has fetch built-in. If your Node is older, install node-fetch and import it.
const fetchFn = global.fetch;

function safeText(v) {
  return (v || "").toString().trim();
}

app.get("/api/youtube", async (req, res) => {
  try {
    const q = safeText(req.query.q || "trending shorts");
    const max = Math.min(parseInt(req.query.max || "10", 10), 25);
    const pageToken = safeText(req.query.pageToken || "");

    let url =
      `https://www.googleapis.com/youtube/v3/search` +
      `?part=snippet&type=video&maxResults=${max}` +
      `&q=${encodeURIComponent(q)}` +
      `&key=${process.env.YOUTUBE_API_KEY}`;

    if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;

    const r = await fetchFn(url);
    const data = await r.json();

    if (data.error) return res.status(400).json(data);

    const items = (data.items || []).map((x) => ({
      title: x.snippet?.title || "YouTube Video",
      platform: "YouTube",
      category: "youtube",
      videoId: x.id?.videoId,
      thumb: x.snippet?.thumbnails?.high?.url || "",
      link: `https://www.youtube.com/shorts/${x.id?.videoId}`
    }));

    res.json({
      items,
      nextPageToken: data.nextPageToken || null
    });
  } catch (e) {
    res.status(500).json({ error: "YouTube fetch failed", details: e.message });
  }
});

/**
 * 2) Pexels Videos API
 */
app.get("/api/pexels", async (req, res) => {
  try {
    const q = safeText(req.query.q || "nature");
    const perPage = Math.min(parseInt(req.query.perPage || "10", 10), 20);

    const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(
      q
    )}&per_page=${perPage}`;

    const r = await fetchFn(url, {
      headers: {
        Authorization: process.env.PEXELS_API_KEY
      }
    });

    const data = await r.json();

    const items = (data.videos || []).map((v) => {
      const bestFile =
        (v.video_files || []).find((f) => f.quality === "sd") ||
        (v.video_files || [])[0];

      return {
        title: v.user?.name ? `${q} by ${v.user.name}` : `${q} video`,
        platform: "Pexels",
        category: "pexels",
        videoUrl: bestFile?.link || "",
        thumb: v.image || "",
        link: v.url
      };
    });

    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: "Pexels fetch failed", details: e.message });
  }
});

/**
 * 3) Pixabay Videos API
 */
app.get("/api/pixabay", async (req, res) => {
  try {
    const q = safeText(req.query.q || "travel");
    const perPage = Math.min(parseInt(req.query.perPage || "10", 10), 20);

    const url =
      `https://pixabay.com/api/videos/?key=${process.env.PIXABAY_API_KEY}` +
      `&q=${encodeURIComponent(q)}&per_page=${perPage}`;

    const r = await fetchFn(url);
    const data = await r.json();

    const items = (data.hits || []).map((h) => {
      // choose medium or small mp4
      const video =
        h.videos?.medium || h.videos?.small || h.videos?.tiny || null;

      return {
        title: `Pixabay: ${q}`,
        platform: "Pixabay",
        category: "pixabay",
        videoUrl: video?.url || "",
        thumb: h.userImageURL || "",
        link: h.pageURL
      };
    });

    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: "Pixabay fetch failed", details: e.message });
  }
});

/**
 * 4) Reddit videos (no API key) - simple public JSON
 * We fetch top posts from a subreddit.
 */
app.get("/api/reddit", async (req, res) => {
  try {
    const subreddit = safeText(req.query.subreddit || "videos");
    const limit = Math.min(parseInt(req.query.limit || "10", 10), 25);

    const url = `https://www.reddit.com/r/${encodeURIComponent(
      subreddit
    )}/hot.json?limit=${limit}`;

    const r = await fetchFn(url, {
      headers: { "User-Agent": "ReelSwipe/1.0" }
    });

    const data = await r.json();

    const items = (data.data?.children || [])
      .map((c) => c.data)
      .filter(Boolean)
      .map((p) => {
        const isRedditVideo = !!p.is_video;
        const redditVideoUrl = p.media?.reddit_video?.fallback_url || "";

        return {
          title: p.title || "Reddit Video",
          platform: "Reddit",
          category: "reddit",
          videoUrl: isRedditVideo ? redditVideoUrl : "",
          thumb: p.thumbnail && p.thumbnail.startsWith("http") ? p.thumbnail : "",
          link: `https://www.reddit.com${p.permalink}`
        };
      })
      .filter((x) => x.videoUrl); // keep only real videos

    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: "Reddit fetch failed", details: e.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, app: "ReelSwipe v2" });
});

app.listen(process.env.PORT || 5000, () => {
  console.log("ReelSwipe running on port", process.env.PORT || 5000);
});
