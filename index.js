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

const generateMarkdownLinks = (builds) => {
  let output = ``;
  builds.forEach((b, i) => (output += `${i + 1}. [${b.name}](${b.link})\n`));

  return output;
};

function generateResponse(status, data = null) {
  return { status, data };
}

function parseCountersFromHTML(html) {
  const document = parser.parseFromString(html);
  const countersWrapper = document.getElementsByClassName("weak-block")[0];

  const properChampName = countersWrapper
    .getElementsByTagName("p")[0]
    .innerHTML.split("is Weak Against")[0];

  const counters = countersWrapper.getElementsByClassName("name").slice(0, 5);

  return { champion: properChampName, counters };
}

function parseBuildsFromHTML(html) {
  let output = [];

  const document = parser.parseFromString(html);
  const builds = document
    .getElementsByClassName("browse-list__item")
    .slice(0, 5);

  builds.forEach((b, i) =>
    output.push({
      name: b.getElementsByTagName("h3")[0].innerHTML,
      link: "https://www.mobafire.com" + builds[i].getAttribute("href"),
    })
  );

  return output;
}

function createEmbed(data) {
  const embed = new MessageEmbed();

  embed.setTitle(data.champion);
  embed.addField("Counterpicks", generateMarkdown(data.counters));
  embed.addField("Builds", generateMarkdownLinks(data.builds));

  return embed;
}

async function getCounterpicks(champion) {
  const res = await fetch(`https://lolcounter.com/champions/${champion}`);

  if (res.status !== 200)
    return generateResponse(res.status, "Champion not found.");

  const data = parseCountersFromHTML(await res.text());

  return generateResponse(200, data);
}

async function getBuilds(champion) {
  champion = champion
    .trim()
    .split(" ")
    .map((s) => s.replace("'", "").toLowerCase())
    .join("-");

  const res = await fetch(
    `https://www.mobafire.com/league-of-legends/${champion}-guide`
  );

  if (res.status !== 200)
    return generateResponse(res.status, "No guides found.");

  const data = parseBuildsFromHTML(await res.text());

  return generateResponse(200, data);
}

async function handleMessage(msg) {
  if (!msg.cleanContent.startsWith(KEYWORD)) return;

  let [_, champName] = msg.cleanContent.split(KEYWORD);

  if (!champName) return msg.reply("Invalid input.\n```!c <CHAMPION_NAME>```");

  champName = champName.trim().toLowerCase();

  const { data: counters, status } = await getCounterpicks(champName);

  if (status !== 200) return msg.reply("Invalid champion name.");

  const { data: builds, status: bStatus } = await getBuilds(counters.champion);

  if (bStatus !== 200) return msg.reply("No builds found.");

  const data = { ...counters, builds };

  msg.channel.send(createEmbed(data));
}

client.on("message", handleMessage);

client
  .login(process.env.TOKEN)
  .then(() => console.log("Bot logged in."))
  .catch((err) => console.error("client.login", err));
