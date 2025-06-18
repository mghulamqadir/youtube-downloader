import React from "react";
import axios from "axios";
import fileDownload from "js-file-download";

export default function Videos({ video, progress }) {
  const isDownloading = typeof progress === "number";

  const downloadVideo = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3000/api/downloads/${video._id}/downloadfile`,
        { responseType: "blob" }
      );
      fileDownload(response.data, `${video.title}.mp4`);
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  const removeVideo = async () => {
    try {
      await axios.delete(
        `http://localhost:3000/api/downloads/${video._id}`
      );
      window.location.reload();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  return (
    <div
      className="card m-2"
      style={{
        width: "18rem",
        opacity: isDownloading ? 0.6 : 1,
      }}
    >
      <img
        src={video.thumbnail || "/spinner-placeholder.png"}
        className="card-img-top"
        alt="thumbnail"
      />
      <div className="card-body">
        <h6 className="card-text text-truncate">{video.title}</h6>

        {isDownloading ? (
          <>
            <div className="progress mb-2">
              <div
                className="progress-bar progress-bar-striped progress-bar-animated"
                role="progressbar"
                style={{ width: `${progress}%` }}
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                {progress}%
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" disabled>
              Downloading…
            </button>
          </>
        ) : (
          <div className="d-flex justify-content-between">
            <button
              className="btn btn-success btn-sm"
              onClick={downloadVideo}
            >
              Download
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={removeVideo}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
