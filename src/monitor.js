import Redis from "ioredis";

const redis = new Redis({ 
                          host: process.env.REDIS_HOST || "127.0.0.1",
                          port: 6379,
                        })

const QUEUE_KEY = "task_queue"
const PROCESSING_QUEUE = "tasks_in_progress";
const DEAD_LETTER_QUEUE = "dead_letter_queue";

let lastState = ""; 

async function monitor() {
  // console.log("Monitor connected and watching queues...");
  
    try {
        const pending = await redis.llen(QUEUE_KEY);
        const processing = await redis.llen(PROCESSING_QUEUE);
        const deadLetter = await redis.llen(DEAD_LETTER_QUEUE);

        const currentState = `${pending}-${processing}-${deadLetter}`;

        if (currentState === lastState) return;
        lastState = currentState;

        console.log("============================================");
        console.log(" 🚀 DISTRIBUTED TASK ORCHESTRATOR MONITOR ");
        console.log(` Status: ACTIVE | Update Rate: 1s`);
        console.log(` Time: ${new Date().toLocaleTimeString()}`);
        console.log("============================================");
        console.log("");
        

        console.log(`${"PENDING TASKS".padEnd(25)}: ${pending}`);
        console.log(`${"ACTIVE WORKERS (BUSY)".padEnd(25)}: ${processing}`);
        console.log(`${"DEAD LETTER TASKS".padEnd(25)}: ${deadLetter}`);
        console.log("");
        console.log("--------------------------------------------");
        
        // visual representation
        const total = pending + processing + deadLetter;
        console.log(`TOTAL JOBS IN SYSTEM     : ${total}`);
        
        console.log("============================================");
        console.log(" Press Ctrl+C to exit monitor");
    } catch (error) {
      console.error("Monitor error:", error.message);
    }
  
}

setInterval(monitor, 1000);