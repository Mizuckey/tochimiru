import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const sourceArg = args.find((arg) => arg.startsWith("--source="));
const source = sourceArg?.replace("--source=", "") || "all";
const passthroughArgs = args.filter((arg) => !arg.startsWith("--source="));

const scripts = {
  belinda: "import:belinda-lands",
  soken: "import:soken-lands",
  nk: "import:nk-lands",
};

const targets =
  source === "all"
    ? Object.values(scripts)
    : scripts[source]
      ? [scripts[source]]
      : null;

if (!targets) {
  throw new Error(
    `Unknown source: ${source}. Use one of: all, ${Object.keys(scripts).join(", ")}`,
  );
}

for (const script of targets) {
  await runNpmScript(script, passthroughArgs);
}

function runNpmScript(script, scriptArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", script, "--", ...scriptArgs], {
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${script} failed with exit code ${code}`));
      }
    });

    child.on("error", reject);
  });
}
