require('dotenv').config()
const express = require("express");
const app = express();
const fetch = require("node-fetch")

app.use(express.static("webpage"));

const listener = app.listen(process.env.PORT || 3000, async () => {
  console.log(`Your app is listening on port ${process.env.PORT||3000}`);
  console.log(`UserAgent+IP: ${await (await fetch('https://fp4u.glitch.me/ua')).json()}`)
});














// Discord Bot
const {
  LocaleDb
} = require("informa-db.js");
const userData = new LocaleDb({
  path: "./users.conf"
});
userData.saveOnChange = true;
const Discord = require("discord.js");
const client = new Discord.Client();
const fixer = require("./fixer-io.custom.js");
const ct = require('countries-and-timezones');
const moment = require('moment');
const spacetime = require('spacetime')
const tzs = require('./tzs.json')
let re, match;
let convertTableToImperial = [
  //pounds
  {
    re: /([0-9]+((\.|\,)([0-9]+))?)( )?((kg)s?|(kilograms?))/gi,
    abbr: 3,
    convert: a => a * 2.205,
    to: [
      ["lb", "lbs"],
      ["pound", "pounds"]
    ]
  },
  //fahrenheit
  {
    re: /([0-9]+((\.|\,)([0-9]+))?)( )?(degrees? celcius|°C)/gi,
    abbr: 2,
    convert: a => (a * 9) / 5 + 32,
    to: [
      ["°F", "°F"],
      ["degree fahrenheit", "degrees fahrenheit"]
    ]
  },
  //feets
  {
    re: /([0-9]+((\.|\,)([0-9]+))?)( )?(m|meters?)/gi,
    abbr: 1,
    convert: a => a * 3.281,
    to: [
      ["'", "'"],
      ["feet", "feets"]
    ]
  },
  //miles
  {
    re: /([0-9]+((\.|\,)([0-9]+))?)( )?((km)s?|(kilometers?))/gi,
    abbr: 3,
    convert: a => a / 1.609,
    to: [
      ["mi", "mis"],
      ["miles", "miles"]
    ]
  }
];
let convertTableToMetric = [
  //pounds
  {
    re: /([0-9]+((\.|\,)([0-9]+))?)( )?((lb)s?|(pounds?))/gi,
    abbr: 3,
    convert: a => a / 2.205,
    to: [
      ["kg", "kgs"],
      ["kilogram", "kilograms"]
    ]
  },
  //fahrenheit
  {
    re: /([0-9]+((\.|\,)([0-9]+))?)( )?(degrees? fahrenheit|°F)/gi,
    abbr: 2,
    convert: a => ((a - 32) * 5) / 9,
    to: [
      ["°C", "°C"],
      ["degree celcius", "degrees celcius"]
    ]
  },
  //feets
  {
    re: /([0-9]+((\.|\,)([0-9]+))?)( )?('|feets?)/gi,
    abbr: 1,
    convert: a => a / 3.281,
    to: [
      ["m", "m"],
      ["meter", "meters"]
    ]
  },
  //miles
  {
    re: /([0-9]+((\.|\,)([0-9]+))?)( )?((miles?)|(mi)s?)/gi,
    abbr: 3,
    convert: a => a / 1.609,
    to: [
      ["km", "kms"],
      ["kilometer", "kilometers"]
    ]
  }
];
let symToCurr = {
  $: "USD",
  "¥": "JPY",
  元: "CNY",
  "£": "GBP",
  "€": "EUR"
};
let {countries} = require("country-data-list");

async function convert(str, usedCurrency, m, mentionnedMsg){
  let tz;
  if(mentionnedMsg){
    if(userData.value[mentionnedMsg.author.id]){
      if(userData.value[mentionnedMsg.author.id].ctry){
        tz=Object.entries(ct.getAllTimezones()).find(([,v])=>v.utcOffset==userData.value[mentionnedMsg.author.id].tz*60)[0]
      }
    }
  }
  let rates = await fixer.currentRates(process.env.FIXER_API_KEY);
  rates.rates[rates.base] = 1
  re = /([0-9]+((\.|\,)?([0-9]{1,2}))?)( )?(([A-Z]{3})|(£|\$|€|¥|₾|₽|₺|₴|₪|₦|元|₩|₫|₿|ɱ|Ξ))/g;
  console.log(str);
  while ((match = re.exec(str)) != null) {
    let num = +match[1].replace(",", ".");
    let space = match[5] ? " " : "";
    let currency = match[7] ? match[7] : symToCurr[match[8]];
    if (currency == "undefined") {
      m.channel.send(
        `We currently don't support the ${match[8]} symbol, skipping.`
      );
      continue;
    }
    str = str.split("");
    str.splice(
      match.index,
      match[0].length,
      `${Number.parseFloat((num * rates.rates[usedCurrency]) / rates.rates[currency]).toFixed(
        (match[4] || "").length
      )}${space}${usedCurrency}`
    );
    str = str.join('')
  }
  console.log(str);
  Object.entries(tzs).forEach(([i,v])=>str=str.replace(new RegExp(`/${i}/g`),v))
  re = /(([0-9]+\/){3} )?([0-9]{2}((:)([0-9]{2}))?)( )?(AM|PM)?(( )(UTC(\+|-)([0-9]{1,4})))?/g;
  while ((match = re.exec(str)) != null) {
    if(!tz&&!match[9])
      m.channel.send(`Cannot convert time in convertraw unless formatted this way: \`[DD/MM/YY[YY] ]HH:MM[ ][A]ZZ[Z[Z[Z]]]\` where:
-D is day,
-M is month,
-Y is year,
-H is hour,
-M is minute,
-A is AM or PM and
-Z is the timezone`)
    let space1 = match[7] ? " " : "";
    let formatTemplate=`${match[1]?'DD-MM-YYYY ':''}HH${match[4]?':MM':''}${space1}${match[8]?'a':''}`
    let currMoment=spacetime(moment(match[0],formatTemplate+(match[9]?' zz':'')).format(), !match[11]?`UTC${Math.abs(tz)==tz?'+':'-'}${tz}`:match[11])
    console.log(currMoment)
    if(!currMoment.isValid())continue;
    str = str.split("");
    let usrTz=userData.value[m.author.id].tz
    console.log(usrTz, tz)
    currMoment.goto(`UTC${Math.abs(usrTz)==usrTz?'+':'-'}${usrTz}`)
    str.splice(
      match.index,
      match[0].length,
      currMoment.time()
    );
    str = str.join('')
    //console.log(str)
  }
  console.log(str);
  (["US", "MM", "LB"].includes(userData.value[m.author.id]) ? convertTableToImperial : convertTableToMetric).forEach((v, i) => {
    while ((match = v.re.exec(str)) != null) {
      let num = +match[1].replace(",", ".");
      let space = match[5] ? " " : "";
      let abbr = match[6].length <= v.abbr;
      let rslt = v.convert(num)
      str = str.split("");
      str.splice(
        match.index,
        match[0].length,
        `${Number.parseFloat(rslt).toFixed(
            (match[4] || "").length
          )}${space}${abbr?rslt<2?v.to[0][0]:v.to[0][1]:rslt<2?v.to[1][0]:v.to[1][1]}`
      );
      str=str.join('')
    }
  });
  console.log(str);
  return str;
}

const commands = {
  /*setbday:{
    desc:"Set your birthday date",
    func:(m,args)=>{
      if(args.length>1||args[0].split('/').length>2||args[0].split('/').some(v=>v.length!=2||isNaN(+v)))
        return m.channel.send("This is not a valid date. Please format: DD/MM")
      userData.value[m.author.id].bday=args[0].split('/')
    },
    perms:[]
  },*/
  setctry: {
    desc: "Set your country",
    func: (m, args) => {
      if (args.length != 1 || (args[0] && args[0].length > 3) || (args[0] && args[0].length < 1))
        return m.channel
          .send(`This is not a valid country. Please format: CC[C].
For a list of country codes see https://www.iban.com/country-codes`);
      args[0] = args[0].toUpperCase();
      if (!countries[args[0]])
        return m.channel.send(`This country does not exist.
For a list of country codes see https://www.iban.com/country-codes`);
      let tz=ct.getCountry(countries[args[0]].alpha2).timezones
      if(tz.length>1&&!args[1]) return m.channel.send(`Your country is located in multiple timezones. Please retry with \`${m.content} [Delay with UTC]\``)
      if(args[1]&&isNaN(+args[1])||Math.abs(+args[1])<13) return m.channel.send(`This is not a valid delay with UTC. Please retry with [-]{0->12}`)
      if(!args[1]){
        console.log(tz[0])
        userData.value[m.author.id].tz=ct.getTimezone(tz[0]).utcOffset/60
      }else{
        userData.value[m.author.id].tz=+args[1]
      }
      userData.value[m.author.id].ctry = args[0];
      m.channel.send(
        `Your country is now set to ${args[0]} (${countries[args[0]].name})`
      );
    },
    perms: []
  },
  convertraw: {
    desc: "Automatically converts a message to the units of your country",
    func: async (m, args) => {
      if (
        args.length==0
      )
        return m.channel.send(
          "You did not provide a valid message id or valid currency. Please format: m!convert Channel MessageId [CCC]"
        );
      if (!userData.value[m.author.id].ctry)
        return m.channel.send(
          "You didn't register yourself in a country. Please type `m!setctry CC[C]` and try again"
        );
      if (
        countries[userData.value[m.author.id].ctry].currencies.length == 0 &&
        !userData.value[m.author.id].c7y
      )
        return m.channel.send(
          `Your country shows no official currency. Please register your preferred currency with \`${process.env.PREFIX}setcurr [3 letter currency you're familliar with]\``
        );
      if (
        countries[userData.value[m.author.id].ctry].currencies.length < 1 &&
        !userData.value[m.author.id].c7y
      )
        m.channel.send(
          `Your country shows multiple official currency. I'll be using ${
            countries[userData.value[m.author.id].ctry].currencies[0]
          } but you can choose your own currency registering your preferred currency with \`${process.env.PREFIX}setcurr [3 letter currency you're familliar with]\``
        );
      let usedCurrency =
        userData.value[m.author.id].c7y || countries[userData.value[m.author.id].ctry].currencies[0];
      let str = args.join(' ');
      m.reply(await convert(str, usedCurrency, m))
    },
    perms: []
  },
  convert: {
    desc: "Automatically converts a message (From provided id) to the units of your country",
    func: async (m, args) => {
      if (
        ![2, 3].includes(args.length) ||
        args[1].length != 18 ||
        args[1].match(/[^0-9]/g) ||
        (args[2] &&
          (args[2].length != 3 || args[1].toUpperCase() != args[1])) ||
        m.mentions.channels.first().toString() != args[0]
      )
        return m.channel.send(
          "You did not provide a valid message id or valid currency. Please format: m!convert Channel MessageId [CCC]"
        );
      if (!userData.value[m.author.id].ctry)
        return m.channel.send(
          "You didn't register yourself in a country. Please type `m!setctry CC[C]` and try again"
        );
      if (
        countries[userData.value[m.author.id].ctry].currencies.length == 0 &&
        !userData.value[m.author.id].c7y &&
        !args[2]
      )
        return m.channel.send(
          `Your country shows no official currency. Please try again with \`${m.content} [3 letter currency you're familliar with]\` or register your preferred currency with \`${process.env.PREFIX}setcurr [3 letter currency you're familliar with]\``
        );
      if (
        countries[userData.value[m.author.id].ctry].currencies.length < 1 &&
        !userData.value[m.author.id].c7y &&
        !args[2]
      )
        m.channel.send(
          `Your country shows multiple official currency. I'll be using ${
            countries[userData.value[m.author.id].ctry].currencies[0]
          } but you can choose your own currency by typing \`${
            m.content
          } [Currency you're familliar with]\` or register your preferred currency with \`${process.env.PREFIX}setcurr [3 letter currency you're familliar with]\``
        );
      let usedCurrency =
        args[2] || userData.value[m.author.id].c7y || countries[userData.value[m.author.id].ctry].currencies[0];
      let str = (await m.guild.channels.cache
        .find(v => v.id == m.mentions.channels.first().id)
        .messages.fetch(args[1])).content;
      m.reply(await convert(str, usedCurrency, m))
    },
    perms: []
  },
  help: {
    func: (m, args) => {
      if (args.length == 0) {
        m.channel.send(
          Object.entries(commands).map(
            ([i, v]) =>
            `**${i}** : ${v.desc} [You need ${
                v.perms.length == 0
                  ? `no perms at all to run it!`
                  : `the following perms to run it: ${v.perms.join(", ")}`
              }]`
          )
        );
      } else if (args.length == 1) {
        let i = args[0];
        let v = commands[args[0]];
      }
    },
    perms: []
  }
};

client.on("message", m => {
  if (m.content.startsWith(process.env.PREFIX)) {
    m.content = m.content.replace(/ +/g, " ");
    let [command, ...args] = m.content
      .slice(process.env.PREFIX.length)
      .split(" ");
    if (!userData.value[m.author.id]) {
      userData.value[m.author.id] = {
        ctry: false
      };
    }
    console.log(command, args);
    if (commands[command]) {
      commands[command].func(m, args);
    } else {
      m.reply(`Command ${m.content.split(" ")[0]} does not exist`);
    }
  }
});

client.login(process.env.TOKEN);