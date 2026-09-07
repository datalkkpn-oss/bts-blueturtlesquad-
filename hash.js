const crypto = require("crypto");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Masukkan password Super Admin: ", (password) => {
  const hash = crypto.createHash("sha256").update(password).digest("hex");

  console.log("\nHash password:");
  console.log(hash);

  rl.close();
});
