import { connectRedis, disconnectRedis, isRedisConnected } from "../src/app/config/redis.js";
import { getCache, setCache, deleteCache } from "../src/app/helpers/cache.js";
import { SkillExtractionServices } from "../src/app/modules/aiApi/skillExtraction.service.js";
import { CvAssistServices } from "../src/app/modules/aiApi/cvAssist.service.js";
import mongoose from "mongoose";
import { env } from "../src/app/config/env.js";
import { User } from "../src/app/modules/user/user.model.js";
import { aiRateLimiter } from "../src/app/middlewares/rateLimiter.middleware.js";
import type { Request, Response } from "express";

const testRateLimiter = async (): Promise<void> => {
  console.log("\n--- Test: rate limiter ---");
  console.log("Redis connected at test time:", isRedisConnected());
  let blocked = 0;
  for (let i = 1; i <= 12; i++) {
    const req = { ip: "10.99.99.99", socket: { remoteAddress: "10.99.99.99" } } as unknown as Request;
    let statusCode = 200;
    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json() {
        return this;
      },
    } as unknown as Response;

    await aiRateLimiter(req, res, () => {
      void 0;
    });
    if (statusCode === 429) blocked++;
  }
  console.log(`Sent 12 requests — blocked (429) count: ${blocked}`);
};

const testText =
  "I am a frontend developer with 1 year experience. I know JavaScript, React, Next.js, Tailwind CSS, Git, and familiar with Node.js. Interested in data analysis with Python and Pandas.";

async function run(): Promise<void> {
  console.log("--- Test: Redis ---");
  await connectRedis();
  console.log("Redis connected:", isRedisConnected());

  console.log("\n--- Test: cache set/get/delete ---");
  await setCache("test:hello", { hello: "world" }, 60);
  const cached = await getCache<{ hello: string }>("test:hello");
  console.log("Cache get:", JSON.stringify(cached));
  await deleteCache("test:hello");
  const afterDelete = await getCache<{ hello: string }>("test:hello");
  console.log("Cache after delete:", afterDelete);

  console.log("\n--- Test: extract from text twice (cache) ---");
  const first = await SkillExtractionServices.extractSkillsFromText(testText);
  console.log("First call provider:", first.provider, "fromCache:", first.fromCache);
  console.log("Skills:", first.data.skills.join(", "));
  console.log("Tools:", first.data.tools.join(", "));
  console.log("Roles:", first.data.roles.join(", "));

  const second = await SkillExtractionServices.extractFromUser.toString; // noop
  const secondCall = await SkillExtractionServices.extractSkillsFromText(testText);
  console.log("Second call provider:", secondCall.provider, "fromCache:", secondCall.fromCache);
  console.log("Second skills identical:", JSON.stringify(first.data) === JSON.stringify(secondCall.data));

  console.log("\n--- Test: extractFromUser (needs Mongo) ---");
  await mongoose.connect(env.MONGODB_URI);
  const user = await User.findOne({});
  if (user) {
    const userResult = await SkillExtractionServices.extractFromUser(user._id.toString());
    console.log("User extraction provider:", userResult.provider, "fromCache:", userResult.fromCache);
    const refreshed = await User.findById(user._id);
    console.log("Persisted extractedSkills:", refreshed?.extractedSkills?.slice(0, 3));
    console.log("Persisted extractedRoles:", refreshed?.extractedRoles);
  } else {
    console.log("No user in DB — skipped extractFromUser");
  }

  console.log("\n--- Test: CV assist fallback/Gemini ---");
  if (user) {
    const summary = await CvAssistServices.generateSummary(user._id.toString());
    console.log("Summary provider:", summary.provider, "fromCache:", summary.fromCache);
    console.log("Summary:", summary.data.summary?.slice(0, 120));

    const bullets = await CvAssistServices.generateBulletPoints(user._id.toString());
    console.log("Bullets provider:", bullets.provider, "count:", bullets.data.bulletPoints.length);

    const tips = await CvAssistServices.generateTips(user._id.toString());
    console.log("Tips provider:", tips.provider, "count:", tips.data.tips.length);
  }

  await testRateLimiter();
  await mongoose.disconnect();
  await disconnectRedis();
  console.log("\n--- All tests done ---");
}

run().catch((error) => {
  console.error("Test crashed:", error);
  process.exit(1);
});