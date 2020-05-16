const { Client } = require("discord.js");
const fetch = require("node-fetch");
const DOMParser = require("dom-parser");
const client = new Client();
const KEYWORD = "!c";

// Load .env
require("dotenv").config();

function generateResponse(status, data = null) {
  return { status, data };
}

async function getCounterpicks(champion) {
  const res = await fetch(`https://lolcounter.com/champions/${champion}`);
  if (res.status !== 200)
    return generateResponse(res.status, "Champion not found.");
  return generateResponse(200, "Champion found.");
}

async function handleMessage(msg) {
  if (!msg.cleanContent.startsWith(KEYWORD)) return;
  let [_, champion] = msg.cleanContent.split(KEYWORD);
  if (!champion) return msg.reply("Invalid input.\n```!c <CHAMPION_NAME>```");
  champion = champion.trim().toLowerCase();
  const data = await getCounterpicks(champion);
  msg.channel.send(data.data);
}

client.on("message", handleMessage);

client
  .login(process.env.TOKEN)
  .then(() => console.log("Bot logged in."))
  .catch((err) => console.error("client.login", err));
