require('dotenv').config();
const { Telegraf, Markup, session } = require('telegraf');
const fs = require('fs');
const path = require('path');

const BETS_FILE = path.join(__dirname, '../bets.json');

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());

// Load bets from file
let bets = {};
let betIdCounter = 1;
if (fs.existsSync(BETS_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(BETS_FILE, 'utf8'));
    bets = data.bets || {};
    betIdCounter = data.betIdCounter || 1;
  } catch (e) {
    console.error('Failed to load bets.json:', e);
  }
}

function saveBets() {
  fs.writeFileSync(BETS_FILE, JSON.stringify({ bets, betIdCounter }, null, 2));
}

// Helper: Format bet for display
function formatBet(bet) {
  return `📝 <b>${bet.description}</b>\nAmount: <b>${bet.amount} ${bet.token}</b>\nYES: <b>${bet.yes.length}</b> | NO: <b>${bet.no.length}</b>\nStatus: <b>${bet.status}</b>`;
}

// Helper: get bot username
let botUsername = null;
bot.telegram.getMe().then((me) => {
  botUsername = me.username;
});

// Global session store for cross-context session passing
let sessionStore = {};

// Group mention handler
bot.on('message', async (ctx, next) => {
  // Only handle group/supergroup
  if (!ctx.chat || (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup')) return next();
  // Check if bot is mentioned
  const entities = ctx.message.entities || [];
  const mention = entities.find(e => e.type === 'mention' && ctx.message.text.slice(e.offset, e.offset + e.length).toLowerCase() === `@${botUsername.toLowerCase()}`);
  if (!mention) return next();

  // If reply to a message, use that as bet title
  let betTitle = null;
  if (ctx.message.reply_to_message && ctx.message.reply_to_message.text) {
    betTitle = ctx.message.reply_to_message.text;
  }

  // DM link
  const dmLink = `https://t.me/${botUsername}`;
  await ctx.reply(`Hi @${ctx.from.username || ctx.from.first_name}, start your bet in DM: [Start Bot](${dmLink})`, { parse_mode: 'Markdown', disable_web_page_preview: true });

  // Send DM to user
  try {
    await bot.telegram.sendMessage(
      ctx.from.id,
      betTitle
        ? `Let's create a sidebet for this message:\n\n"${betTitle}"\n\nWhich token do you want to bet with?`
        : `Let's create a new sidebet!\n\nWhat is the bet about?`,
      betTitle
        ? {
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('USDC', 'TOKEN_USDC'), Markup.button.callback('MON', 'TOKEN_MON')],
            ]).reply_markup
          }
        : undefined
    );
    // Set up session for DM flow
    // Store group and message context for posting later
    sessionStore[ctx.from.id] = {
      groupId: ctx.chat.id,
      betTitle,
      awaiting: betTitle ? 'TOKEN' : 'DESCRIPTION',
      betDraft: betTitle ? { description: betTitle } : {},
    };
  } catch (e) {
    // User may not have started bot in DM
  }
});

// DM flow handler (private chat, only for text messages)
bot.on('text', async (ctx, next) => {
  if (!ctx.chat || ctx.chat.type !== 'private') return next();
  ctx.session ??= {};
  // If user started from group mention, use sessionStore
  if (!ctx.session.awaiting && sessionStore[ctx.from.id]) {
    const store = sessionStore[ctx.from.id];
    ctx.session.awaiting = store.awaiting;
    ctx.session.betDraft = store.betDraft;
    ctx.session.groupId = store.groupId;
    delete sessionStore[ctx.from.id];
  }
  // Continue normal DM flow
  if (!ctx.session.awaiting) return;
  if (ctx.session.awaiting === 'DESCRIPTION') {
    ctx.session.betDraft.description = ctx.message.text;
    ctx.session.awaiting = 'TOKEN';
    await ctx.reply('Which token do you want to bet with?',
      Markup.inlineKeyboard([
        [Markup.button.callback('USDC', 'TOKEN_USDC'), Markup.button.callback('MON', 'TOKEN_MON')],
      ])
    );
    return;
  }
  if (ctx.session.awaiting === 'AMOUNT') {
    ctx.session.betDraft.amount = ctx.message.text;
    // Create and post the bet
    const bet = {
      id: betIdCounter++,
      creator: ctx.from.id,
      description: ctx.session.betDraft.description,
      amount: ctx.session.betDraft.amount,
      token: ctx.session.betDraft.token,
      yes: [],
      no: [],
      status: 'OPEN',
      groupId: ctx.session.groupId || null,
      creator_username: ctx.from.username || null,
    };
    bets[bet.id] = bet;
    saveBets();
    ctx.session.betDraft = null;
    ctx.session.awaiting = null;
    // Post bet in group if groupId is set
    if (bet.groupId) {
      await bot.telegram.sendMessage(
        bet.groupId,
        `New Sidebet by @${ctx.from.username || ctx.from.first_name}:\n\n${formatBet(bet)}`,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [
              Markup.button.callback('Join YES', `JOIN_YES_${bet.id}`),
              Markup.button.callback('Join NO', `JOIN_NO_${bet.id}`),
            ],
            [Markup.button.callback('Resolve Bet', `RESOLVE_${bet.id}`)],
          ]).reply_markup,
        }
      );
      await ctx.reply('✅ Bet created and posted in the group!');
    } else {
      await ctx.replyWithHTML(
        `✅ Bet created!\n\n${formatBet(bet)}`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback('Join YES', `JOIN_YES_${bet.id}`),
            Markup.button.callback('Join NO', `JOIN_NO_${bet.id}`),
          ],
          [Markup.button.callback('Resolve Bet', `RESOLVE_${bet.id}`)],
        ])
      );
    }
    return;
  }
});

// Handle token selection (DM only)
bot.action(/TOKEN_(.+)/, async (ctx) => {
  ctx.session ??= {};
  if (!ctx.session.betDraft) return;
  ctx.session.betDraft.token = ctx.match[1];
  ctx.session.awaiting = 'AMOUNT';
  await ctx.reply('What should be the buy in amount?');
});

// Handle joining YES/NO (group or DM)
bot.action(/JOIN_(YES|NO)_(\d+)/, async (ctx) => {
  const [_, side, id] = ctx.match;
  const bet = bets[id];
  if (!bet || bet.status !== 'OPEN') {
    ctx.reply('Bet not found or not open.');
    return;
  }
  // If in group, DM the user
  if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
    try {
      await bot.telegram.sendMessage(
        ctx.from.id,
        `You clicked ${side} for bet #${id}:\n\n${formatBet(bet)}\n\nConfirm to join?`,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback(`Confirm ${side}`, `CONFIRM_${side}_${id}`)],
          ]).reply_markup,
        }
      );
      await ctx.answerCbQuery('Check your DM to confirm joining!');
    } catch (e) {
      // Provide a deep link to start the bot in DM with the bet ID
      const dmLink = `https://t.me/${botUsername}?start=bet${id}`;
      await ctx.replyWithMarkdown(
        `To join this bet, [start the bot in DM here](${dmLink}) and try again!`
      );
    }
    return;
  }
  // If in DM, proceed to join
  if (bet.yes.includes(ctx.from.id) || bet.no.includes(ctx.from.id)) {
    ctx.reply('You have already joined this bet.');
    return;
  }
  bet[side.toLowerCase()].push(ctx.from.id);
  saveBets();
  ctx.reply(`You joined ${side} for bet #${id}!`);
});

// Handle /start with bet deep link in DM
bot.start(async (ctx) => {
  ctx.session ??= {};
  const startPayload = ctx.startPayload;
  if (startPayload && startPayload.startsWith('bet')) {
    const betId = startPayload.slice(3);
    const bet = bets[betId];
    if (bet && bet.status === 'OPEN') {
      await ctx.replyWithHTML(
        `You were invited to join this bet:\n\n${formatBet(bet)}\n\nClick below to join:`,
        Markup.inlineKeyboard([
          [Markup.button.callback('Join YES', `JOIN_YES_${betId}`), Markup.button.callback('Join NO', `JOIN_NO_${betId}`)],
        ])
      );
      return;
    }
  }
  // Default /start message
  await ctx.reply(
    '👋 Welcome to Sidebets!\n\nCreate and join on-chain YES/NO bets with your friends.\n\nUse the button below to create a new sidebet.',
    Markup.inlineKeyboard([
      [Markup.button.callback('➕ Create Sidebet', 'CREATE_SIDEBET')],
      [Markup.button.callback('👀 View Open Bets', 'VIEW_OPEN_BETS')],
    ])
  );
});

// Confirm join in DM
bot.action(/CONFIRM_(YES|NO)_(\d+)/, (ctx) => {
  const [_, side, id] = ctx.match;
  const bet = bets[id];
  if (!bet || bet.status !== 'OPEN') {
    ctx.reply('Bet not found or not open.');
    return;
  }
  if (bet.yes.includes(ctx.from.id) || bet.no.includes(ctx.from.id)) {
    ctx.reply('You have already joined this bet.');
    return;
  }
  bet[side.toLowerCase()].push(ctx.from.id);
  saveBets();
  ctx.reply(`You joined ${side} for bet #${id}!`);
});

// Handle resolving a bet (group or DM)
bot.action(/RESOLVE_(\d+)/, async (ctx) => {
  ctx.session ??= {};
  const id = ctx.match[1];
  const bet = bets[id];
  if (!bet || bet.status !== 'OPEN') {
    await ctx.reply('Bet not found or not open.');
    return;
  }
  if (ctx.from.id !== bet.creator) {
    await ctx.reply('Only the bet creator can resolve this bet.');
    return;
  }
  await ctx.reply('Who won?',
    Markup.inlineKeyboard([
      [Markup.button.callback('YES', `SETTLE_YES_${id}`), Markup.button.callback('NO', `SETTLE_NO_${id}`)],
    ])
  );
});

// Handle settling a bet (group or DM)
bot.action(/SETTLE_(YES|NO)_(\d+)/, async (ctx) => {
  ctx.session ??= {};
  const [_, outcome, id] = ctx.match;
  const bet = bets[id];
  if (!bet || bet.status !== 'OPEN') {
    await ctx.reply('Bet not found or not open.');
    return;
  }
  if (ctx.from.id !== bet.creator) {
    await ctx.reply('Only the bet creator can resolve this bet.');
    return;
  }
  bet.status = `RESOLVED (${outcome})`;
  saveBets();
  // Announce in group if groupId exists
  if (bet.groupId) {
    await bot.telegram.sendMessage(
      bet.groupId,
      `🏆 Bet #${id} resolved by @${ctx.from.username || ctx.from.first_name}!

${formatBet(bet)}`,
      { parse_mode: 'HTML' }
    );
  }
  else {
    await ctx.replyWithHTML(`🏆 Bet #${id} resolved!

${formatBet(bet)}`);
  }
});

// Handle view open bets (works in both group and DM)
bot.action('VIEW_OPEN_BETS', async (ctx) => {
  ctx.session ??= {};
  const openBets = Object.values(bets).filter((b) => b.status === 'OPEN');
  if (openBets.length === 0) {
    await ctx.reply('No open bets right now. Create one!');
    return;
  }
  for (const bet of openBets) {
    await ctx.replyWithHTML(
      formatBet(bet),
      Markup.inlineKeyboard([
        [
          Markup.button.callback('Join YES', `JOIN_YES_${bet.id}`),
          Markup.button.callback('Join NO', `JOIN_NO_${bet.id}`),
        ],
      ])
    );
  }
});

// /listbets command: List all open bets in a single message with creators tagged
bot.command('listbets', async (ctx) => {
  ctx.session ??= {};
  const openBets = Object.values(bets).filter((b) => b.status === 'OPEN');
  if (openBets.length === 0) {
    await ctx.reply('No open bets right now.');
    return;
  }
  let msg = '<b>Open Bets:</b>\n';
  for (const bet of openBets) {
    const creatorTag = bet.creator_username
      ? `@${bet.creator_username}`
      : `<a href="tg://user?id=${bet.creator}">creator</a>`;
    msg += `\n<b>#${bet.id}</b>: ${bet.description}\nAmount: <b>${bet.amount} ${bet.token}</b>\nBy: ${creatorTag}\n`;
  }
  await ctx.replyWithHTML(msg);
});

// /resolvebet command: List user's open bets and allow them to resolve
bot.command('resolvebet', async (ctx) => {
  ctx.session ??= {};
  const userBets = Object.values(bets).filter((b) => b.status === 'OPEN' && b.creator === ctx.from.id);
  if (userBets.length === 0) {
    await ctx.reply('You have no open bets to resolve.');
    return;
  }
  await ctx.reply('Select a bet to resolve:',
    Markup.inlineKeyboard(
      userBets.map(bet => [Markup.button.callback(`#${bet.id}: ${bet.description.substring(0, 30)}...`, `RESOLVE_${bet.id}`)])
    )
  );
});

// /leaderboard command: Show users ranked by number of bets won
bot.command('leaderboard', async (ctx) => {
  // Count wins for each user
  const winCounts = {};
  for (const bet of Object.values(bets)) {
    if (!bet.status || !bet.status.startsWith('RESOLVED')) continue;
    const outcome = bet.status.match(/RESOLVED \((YES|NO)\)/);
    if (!outcome) continue;
    const winners = bet[outcome[1].toLowerCase()] || [];
    for (const userId of winners) {
      winCounts[userId] = (winCounts[userId] || 0) + 1;
    }
  }
  // Sort users by win count
  const sorted = Object.entries(winCounts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    await ctx.reply('No winners yet!');
    return;
  }
  let msg = '<b>🏆 Sidebets Leaderboard</b>\n';
  for (let i = 0; i < Math.min(10, sorted.length); i++) {
    const [userId, count] = sorted[i];
    // Try to find username from any bet
    let username = null;
    for (const bet of Object.values(bets)) {
      if (bet.creator == userId && bet.creator_username) {
        username = bet.creator_username;
        break;
      }
    }
    const userTag = username
      ? `@${username}`
      : `<a href="tg://user?id=${userId}">user</a>`;
    msg += `\n${i + 1}. ${userTag} — <b>${count}</b> win${count > 1 ? 's' : ''}`;
  }
  await ctx.replyWithHTML(msg);
});

// Launch the bot
bot.launch();

console.log('Sidebets Telegram bot running!'); 