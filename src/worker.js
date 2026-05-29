import Redis from "ioredis";
import axios from "axios"
const redis = new Redis({ 
                          host: process.env.REDIS_HOST || "127.0.0.1", 
                          port: 6379,
                        })
const QUEUE_KEY = "task_queue"
const PROCESSING_QUEUE = "tasks_in_progress";
const DEAD_LETTER_QUEUE = "dead_letter_queue";

const taskHandlers = {
  "FETCH_TITLE": async (taskData) => {
    const { url } = taskData; // Accessing the URL
    console.log(` Scraping: ${url}`);
    
    const response = await axios.get(url, { timeout: 5000 });
    const match = response.data.match(/<title>(.*?)<\/title>/);
    const title = match ? match[1] : "No Title Found";
    
    console.log(` Result: ${title}`);
    return title;
  }
};


async function taskWorker() {
console.log("worker connected and waiting for jobs");
while (true) {
  let jobData = null
  let job = null
  try {
    job = await redis.blmove(QUEUE_KEY, PROCESSING_QUEUE,"RIGHT","LEFT", 0);
    jobData = job ? JSON.parse(job) : null;
    await redis.hset(`job:${jobData.unique_id}`, "status", "processing");
    console.log("received job:", jobData);

     const handler = taskHandlers[jobData.type];
      if (handler) {
          await handler(jobData.task);
      }

    await redis.lrem(PROCESSING_QUEUE, 1, job);
    await redis.hset(`job:${jobData.unique_id}`, "status", "completed");
    await redis.expire(`job:${jobData.unique_id}`, 3600);
    console.log("Job completed:", jobData);
  } catch (error) {
    
    if(jobData) {
      jobData.attempts += 1;
      if(jobData.attempts < 3) {
       await redis.rpush(QUEUE_KEY, JSON.stringify(jobData));
      } else {
       await redis.lpush(DEAD_LETTER_QUEUE, JSON.stringify(jobData));
       
       await redis.hset(`job:${jobData.unique_id}`, "status", "failed");
       console.log("Job failed after 3 attempts, moved to dead letter queue:", jobData);
    }
    await redis.lrem(PROCESSING_QUEUE, 1, job);
  }
    console.error("Worker error:", error.message);
  } 

}}

taskWorker();