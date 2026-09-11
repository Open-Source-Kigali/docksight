import { spawn } from "node:child_process";

const commands = ["test", "test:go"].map((script) =>
  spawn("npm", ["run", script], { shell: true }),
);

commands.forEach((command) => {
  command.stdout.on("data", (data) => process.stdout.write(data));
  command.stderr.on("data", (data) => process.stderr.write(data));
  command.on("error", (err) => {
    console.error("There was an error running the command:", err.message);
    process.exitCode = 1;
  });

  command.on("close", (code) => {
    if (code !== 0) {
      console.error(`Test command failed with exit code ${code}.`);
      process.exitCode = code ?? 1;
    }
  });
});
