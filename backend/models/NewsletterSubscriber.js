import mongoose from "mongoose";

const NewsletterSubscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true }
);

// Prevent model overwrite in dev/hot reload
const NewsletterSubscriber =
  mongoose.models.NewsletterSubscriber ||
  mongoose.model("NewsletterSubscriber", NewsletterSubscriberSchema);

export default NewsletterSubscriber;
