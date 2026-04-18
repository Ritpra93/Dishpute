import { runTinyFish } from "../src/tinyfish";

async function main() {
  const result = await runTinyFish({
    url: "https://example.com",
    goal: "Return the page title as JSON: { title: string }",
  });

  console.log("Raw resultJson:", JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
