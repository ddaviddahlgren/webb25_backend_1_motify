import { Router } from "express";
import Playlist from "../models/Playlist.js";
import { requireAuth } from "../middleware/auth.js";
import {
  isPlaylistOwner,
  isPlaylistSharedWithUser,
} from "../middleware/ownership.js";
import User from "../models/User.js";

const router = Router();

router.get("/latest", async (req, res) => {
  try {
    const playlists = await Playlist.find({ user: null })
      .sort({ _id: -1 })
      .limit(5)
      .populate("songs", "title");
    res.json(playlists);
  } catch (err) {
    console.error("Latest playlists failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/my", requireAuth, async (req, res) => {
  try {
    const playlists = await Playlist.find({ user: req.user._id })
      .populate("songs", "title artist durationSeconds")
      .populate("user", "email");
    res.json(playlists);
  } catch (err) {
    console.error("My playlists failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/shared-with-me", requireAuth, async (req, res) => {
  try {
    const playlists = await Playlist.find({ sharedWith: req.user._id })
      .populate("songs", "title artist durationSeconds")
      .populate("user", "email")
      .populate("sharedWith", "email");
    res.json(playlists);
  } catch (err) {
    console.error("Failed to get shared playlists:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get(
  "/shared/:id",
  requireAuth,
  isPlaylistSharedWithUser,
  async (req, res) => {
    try {
      const playlist = await Playlist.findOne({
        _id: req.params.id,
        sharedWith: req.user._id,
      })
        .populate("songs", "title artist durationSeconds")
        .populate("user", "email")
        .populate("sharedWith", "email");
      res.json(playlists);
    } catch (err) {
      console.error("Failed to get shakred playlist:", err.message);
      res.status(500).json({ error: err.message });
    }
  },
);

router.get("/", async (req, res) => {
  try {
    const playlists = await Playlist.find({ user: null })
      .populate("songs", "title artist durationSeconds")
      .populate("user", "email");
    res.json(playlists);
  } catch (err) {
    console.error("Playlists list failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/my", requireAuth, async (req, res) => {
  try {
    const body = {
      name: req.body.name,
      description: req.body.description,
      songs: req.body.songs || [],
      user: req.body.user ?? req.user._id,
    };
    const playlist = await Playlist.create(body);
    await playlist.populate("songs", "title artist durationSeconds");
    await playlist.populate("user", "email");
    res.status(201).json(playlist);
  } catch (err) {
    console.error("Create playlist failed:", err.message);
    res.status(400).json({ error: err.message });
  }
});

router.put("/my/:id", requireAuth, isPlaylistOwner, async (req, res) => {
  try {
    const playlist = await Playlist.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("songs", "title artist durationSeconds")
      .populate("user", "email");
    if (!playlist) {
      console.error("Update playlist: Playlist not found");
      return res.status(404).json({ error: "Playlist not found" });
    }
    res.json(playlist);
  } catch (err) {
    console.error("Update playlist failed:", err.message);
    res.status(400).json({ error: err.message });
  }
});

router.delete("/my/:id", requireAuth, isPlaylistOwner, async (req, res) => {
  try {
    const playlist = await Playlist.findByIdAndDelete(req.params.id);
    if (!playlist) {
      console.error("Delete playlist: Playlist not found");
      return res.status(404).json({ error: "Playlist not found" });
    }
    res.status(204).send();
  } catch (err) {
    console.error("Delete playlist failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/my/:id/share", requireAuth, isPlaylistOwner, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    const target = await User.findOne({ email });
    if (!target) {
      return res.status(404).json({ error: "Target user not found" });
    }

    const playlist = await Playlist.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { sharedWith: target._id } },
      { new: true },
    )
      .populate("songs", "title artist durationSeconds")
      .populate("user", "email")
      .populate("sharedWith", "email");

    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found" });
    }

    res.json(playlist);
  } catch (err) {
    console.error("Failed to share playlist:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const playlist = await Playlist.findOne({
      _id: req.params.id,
      user: null,
    }).populate({
      path: "songs",
      populate: { path: "artist", select: "name" },
    });
    if (!playlist) {
      console.error("Playlist by ID: Playlist not found");
      return res.status(404).json({ error: "Playlist not found" });
    }
    res.json(playlist);
  } catch (err) {
    console.error("Playlist by ID failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
