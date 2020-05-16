const { Client, MessageEmbed } = require("discord.js");
const fetch = require("node-fetch");
const DOMParser = require("dom-parser");
const client = new Client();
const KEYWORD = "!c";

// Load .env
require("dotenv").config();

const parser = new DOMParser();

const generateMarkdown = (champArray) => {
  let output = "```md\n";

  champArray.forEach((c, i) => (output += `${i + 1}. ${c.innerHTML}\n`));
  output += "```";

  return output;
};

function generateResponse(status, data = null) {
  return { status, data };
}

function parseHTML(html) {
  const document = parser.parseFromString(html);
  const countersWrapper = document.getElementsByClassName("weak-block")[0];

  const properChampName = countersWrapper
    .getElementsByTagName("p")[0]
    .innerHTML.split("is Weak Against")[0];

  const counters = countersWrapper.getElementsByClassName("name");

  return { champion: properChampName, counters };
}

function createEmbed(data) {
  const embed = new MessageEmbed();

  embed.setTitle(data.champion);
  embed.addField("Counterpicks", generateMarkdown(data.counters));

  return embed;
}

async function getCounterpicks(champion) {
  const res = await fetch(`https://lolcounter.com/champions/${champion}`);

  if (res.status !== 200)
    return generateResponse(res.status, "Champion not found.");

  const data = parseHTML(await res.text());

  return generateResponse(200, createEmbed(data));
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
