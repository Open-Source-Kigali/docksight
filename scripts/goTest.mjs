import { resolve } from "node:path";
import { spawn } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const agentDirectory = resolve(root, "apps/agent");

const goTestResults = spawn("go", ["test", "-v", "./..."], {
  cwd: agentDirectory,
});

goTestResults.stdout.on("data", (data) => {
  process.stdout.write(data);
});

goTestResults.stderr.on("data", (data) => {
  process.stderr.write(data);
});

goTestResults.on("error", (err) => {
  console.error("Unable to start Go tests:", err.message);
  process.exitCode = 1;
});

goTestResults.on("close", (code) => {
  if (code !== 0) {
    console.error(`Go tests failed with exit code ${code}.`);
    process.exitCode = code ?? 1;
  }
});
