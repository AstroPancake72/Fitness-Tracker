const mongoose = require("mongoose");

const BUCKET_NAME = "profileImages";

let bucket = null;

function getBucket() {
  if (bucket) return bucket;

  const conn = mongoose.connection;
  if (!conn || conn.readyState !== 1 || !conn.db) {
    throw new Error("MongoDB connection is not ready for GridFS");
  }

  bucket = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: BUCKET_NAME,
  });
  return bucket;
}

module.exports = { getBucket, BUCKET_NAME };
