import mongoose from "mongoose";
import { env } from "../src/app/config/env.js";
import { seedJobs } from "./seedJobs.js";
import { seedResources } from "./seedResources.js";
async function runSeed() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(env.MONGODB_URI);
        console.log("MongoDB connected successfully");
        console.log("\nSeeding jobs...");
        const jobCount = await seedJobs();
        console.log(`Inserted ${jobCount} jobs`);
        console.log("\nSeeding resources...");
        const resourceCount = await seedResources();
        console.log(`Inserted ${resourceCount} resources`);
        console.log("\nSeeding complete!");
    }
    catch (error) {
        console.error("Seeding failed:", error);
        process.exitCode = 1;
    }
    finally {
        console.log("Disconnecting from MongoDB...");
        await mongoose.disconnect();
        console.log("Done.");
    }
}
runSeed();
//# sourceMappingURL=runSeed.js.map