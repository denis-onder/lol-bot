const { Client, MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const DOMParser = require('dom-parser');

const client = new Client();
const KEYWORD = '!c';

// Load .env
require('dotenv').config();

const parser = new DOMParser();

const sanitize = (str) =>
  str
    .toLowerCase()
    .trim()
    .split(' ')
    .map((s) => s.trim().replace("'", ''));

const setActivity = (champName = 'name') => {
  client.user.setActivity(`LoL | !c ${champName}`, {
    type: 'PLAYING',
  });
};

const generateMarkdown = (champArray) => {
  let output = '```md\n';

  champArray.forEach((c, i) => (output += `${i + 1}. ${c.innerHTML}\n`));
  output += '```';

  return output;
};

const generateBuildLinks = (builds) => {
  let output = ``;
  builds.forEach((b, i) => (output += `${i + 1}. [${b.name}](${b.link})\n\n`));

  return output;
};

function generateResponse(status, data = null) {
  return { status, data };
}

const parseTable = (table) => table.getElementsByClassName('name');

function parseCountersFromHTML(html) {
  const document = parser.parseFromString(html);

  const [
    goodAgainstTable,
    _,
    weakAgainstTable,
  ] = document.getElementsByClassName('data_table');

  console.log(goodAgainstTable, weakAgainstTable);

  const properChampName = document.getElementsByTagName('h2')[0].innerHTML;

  const weakAgainst = parseTable(weakAgainstTable);

  const goodAgainst = parseTable(goodAgainstTable);

  return { champion: properChampName, counters: weakAgainst, goodAgainst };
}

function parseBuildsFromHTML(html) {
  let output = [];

  const document = parser.parseFromString(html);
  const builds = document
    .getElementsByClassName('browse-list__item')
    .slice(0, 5);

  builds.forEach((b, i) =>
    output.push({
      name: b.getElementsByTagName('h3')[0].innerHTML,
      link: 'https://www.mobafire.com' + builds[i].getAttribute('href'),
    })
  );

  return output;
}

function createEmbed(data) {
  const embed = new MessageEmbed();

  embed.setTitle(data.champion);
  embed.addField('Weak Against', generateMarkdown(data.counters), true);
  embed.addField('Good Against', generateMarkdown(data.goodAgainst), true);
  embed.addField('Builds', generateBuildLinks(data.builds), false);

  return embed;
}

async function getCounterpicks(champion) {
  const res = await fetch(
    `https://www.leagueofgraphs.com/champions/counters/${champion}`
  );

  if (res.status !== 200)
    return generateResponse(res.status, 'Champion not found.');

  const data = parseCountersFromHTML(await res.text());

  return generateResponse(200, data);
}

async function getBuilds(champion) {
  champion = sanitize(champion).join('-');

  const res = await fetch(
    `https://www.mobafire.com/league-of-legends/${champion}-guide`
  );

  if (res.status !== 200)
    return generateResponse(res.status, 'No guides found.');

  const data = parseBuildsFromHTML(await res.text());

  return generateResponse(200, data);
}

async function handleMessage(msg) {
  if (!msg.cleanContent.startsWith(KEYWORD)) return;

  let [_, champName] = msg.cleanContent.split(KEYWORD);

  if (!champName) return msg.reply('Invalid input.\n```!c <CHAMPION_NAME>```');

  champName = sanitize(champName).join('');

  const { data: lolcounterData, status } = await getCounterpicks(champName);

  if (status !== 200) return msg.reply('Invalid champion name.');

  const { data: builds, status: bStatus } = await getBuilds(
    lolcounterData.champion
  );

  if (bStatus !== 200) return msg.reply('No builds found.');

  const data = { ...lolcounterData, builds };

  setActivity(champName);

  msg.channel.send(createEmbed(data));
}

client.on('message', handleMessage);

client.on('ready', () => {
  console.log(`Bot logged in.\n${client.user.tag}`);
  setActivity();
});

client
  .login(process.env.TOKEN)
  .catch((err) => console.error('client.login', err));

process.on('beforeExit', (code) => {
  console.log(`Process will exit with code: ${code}`);
  process.exit(code);
});
