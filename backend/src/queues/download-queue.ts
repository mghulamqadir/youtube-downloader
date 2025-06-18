import Bull from "bull";
import ytdl from "ytdl-core";
import fs from "fs";
import { Video } from "../models/video";
import { Events } from "../utils";
import { SocketInit } from "../socket.io";

interface DownloadJobData {
  youtubeUrl: string;
}

const downloadQueue = new Bull<DownloadJobData>("download queue", {
  redis: {
    host: process.env.REDIS_HOST!,
    port: parseInt(process.env.REDIS_PORT!, 10),
  },
});

downloadQueue.process((job, done) => {
  return new Promise(async (resolve, reject) => {
    const { youtubeUrl } = job.data;
    const socket = SocketInit.getInstance();

    try {
      const info = await ytdl.getBasicInfo(youtubeUrl);
      const thumbnail = info.videoDetails.thumbnails[0].url;
      const title = info.videoDetails.title;
      const outputPath = `${process.cwd()}/downloads/${title}.mp4`;
      const videoStream = ytdl.downloadFromInfo(info, { quality: "highest" });

      videoStream.on("progress", (_chunkLength, downloaded, total) => {
        const percent = Math.floor((downloaded / total) * 100);
        socket.publishEvent(Events.VIDEO_PROGRESS, { title, percent });
      });

      const fileStream = fs.createWriteStream(outputPath);
      videoStream.pipe(fileStream);

      videoStream.on("ready", () => {
        socket.publishEvent(Events.VIDEO_STARTED, title);
      });

      fileStream.on("finish", async () => {
        socket.publishEvent(Events.VIDEO_DOWNLOADED, title);
        console.log(`Download complete: ${title}`);

        const videoDoc = new Video({
          title,
          file: outputPath,
          thumbnail,
        });
        await videoDoc.save();

        done();
        resolve({ title });
      });

      videoStream.on("error", (err) => {
        console.error("Download error:", err);
        socket.publishEvent(Events.VIDEO_ERROR, err);
        done(err as any);
        reject(err);
      });

      fileStream.on("error", (err) => {
        console.error("File write error:", err);
        socket.publishEvent(Events.VIDEO_ERROR, err);
        done(err as any);
        reject(err);
      });
    } catch (error) {
      console.error("Queue processor error:", error);
      socket.publishEvent(Events.VIDEO_ERROR, error);
      done(error as any);
      reject(error);
    }
  });
});

export { downloadQueue };
