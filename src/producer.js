import Redis from "ioredis"
import express from "express"
import dotenv from "dotenv"
import crypto from "crypto"


dotenv.config({path: './.env'})
const app = express()
const QUEUE_KEY = "task_queue"

const redis = new Redis({ maxRetriesPerRequest: 1,
                          host: process.env.REDIS_HOST || "127.0.0.1",
                          port: 6379,
                        })


redis.on("connect", () => console.log("✅ Redis connected!"));
redis.on("error", (err) => console.error("❌ Redis Error:", err.message));
                        
app.use(express.json())

app.get("/", (req, res) => res.send("Producer is UP"));

app.post("/job", async (req, res) => {

  console.log("1. Received request body:", req.body);
  try {
    const { task } = req.body
    if(!task) {
      return res.status(400).json({ error: "No task provided" });
    }
    console.log("2. Attempting to add job to Redis...");
    const job = {
      unique_id: crypto.randomUUID(),
      type: "FETCH_TITLE",
      task:task,
      createdAt: Date.now(),
      attempts: 0,
     
    }
    await redis.lpush(QUEUE_KEY, JSON.stringify(job));
    await redis.hset(`job:${job.unique_id}`, "status", "pending");
    await redis.expire(`job:${job.unique_id}`, 3600);
    console.log("3. Job added successfully!",job);
    res.status(202).json({ success: true,
                           message: "Job added",
                          jobId: job.unique_id})
  } catch (error) {
    console.error("❌ Route Error:", error.message);
    res.status(400).json({ success: false, error: error.message })
  }
})

app.listen(3000, "0.0.0.0", () => {
  console.log("🚀 Server is locked and loaded on http://0.0.0.0:3000");
});

