// enchant-shop-bot.js
// One-file premium enchant shop bot 😈
// Requires: discord.js v14, Node 18+

const {
  Client,
  GatewayIntentBits,
  Partials,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  REST,
  Routes,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");
require("dotenv").config();

// --------------- IDs & CONFIG ---------------

const OWNER_ID = "1499756848146808933";
const ENCHANTER_ROLE_ID = "1499756848146808933";
const ADMIN_ROLE_ID = "1106301364532957255";
const BUILDER_ROLE_ID = "1508199216927740175";

const ORDER_CHANNEL_ID = "1510397241578361084";
const ORDER_LOG_CHANNEL_ID = "1508895747716812860";

// --------------- CLIENT ---------------

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel],
});

// userId -> { items: [...], currentStep, currentItemIndex, currentCategory }
const carts = new Map();
let orderCounter = 1;

// --------------- DATA ---------------

const CATEGORY_EMOJIS = {
  weapons_tools: "🗡️",
  armor: "🛡️",
  ranged: "🏹",
  misc: "✨",
};

const ITEM_EMOJIS = {
  sword: "🗡️",
  axe: "🪓",
  pickaxe: "⛏️",
  shovel: "🧹",
  hoe: "🌾",
  bow: "🏹",
  crossbow: "🎯",
  fishing_rod: "🎣",
  trident: "📘",
  elytra: "🪽",
  helmet: "🪖",
  chestplate: "👕",
  leggings: "👖",
  boots: "🥾",
};

const MATERIALS_WEAPONS_TOOLS = [
  { label: "Wood", value: "Wood" },
  { label: "Stone", value: "Stone" },
  { label: "Iron", value: "Iron" },
  { label: "Gold", value: "Gold" },
  { label: "Diamond", value: "Diamond" },
  { label: "Netherite", value: "Netherite" },
];

const MATERIALS_ARMOR = [
  { label: "Leather", value: "Leather" },
  { label: "Chain", value: "Chain" },
  { label: "Iron", value: "Iron" },
  { label: "Gold", value: "Gold" },
  { label: "Diamond", value: "Diamond" },
  { label: "Netherite", value: "Netherite" },
];

const ENCHANTS = {
  sword: [
    { name: "Sharpness", maxLevel: 5 },
    { name: "Looting", maxLevel: 3 },
    { name: "Unbreaking", maxLevel: 3 },
    { name: "Sweeping Edge", maxLevel: 3 },
    { name: "Smite", maxLevel: 5 },
    { name: "Bane of Arthropods", maxLevel: 5 },
    { name: "Fire Aspect", maxLevel: 2 },
    { name: "Knockback", maxLevel: 2 },
    { name: "Mending", maxLevel: 1 },
    { name: "Curse of Vanishing", maxLevel: 1 },
  ],
  tools: [
    { name: "Efficiency", maxLevel: 5 },
    { name: "Fortune", maxLevel: 3 },
    { name: "Mending", maxLevel: 1 },
    { name: "Silk Touch", maxLevel: 1 },
    { name: "Unbreaking", maxLevel: 3 },
    { name: "Curse of Vanishing", maxLevel: 1 },
  ],
  armor_common: [
    { name: "Protection", maxLevel: 4 },
    { name: "Fire Protection", maxLevel: 4 },
    { name: "Blast Protection", maxLevel: 4 },
    { name: "Projectile Protection", maxLevel: 4 },
    { name: "Thorns", maxLevel: 3 },
    { name: "Unbreaking", maxLevel: 3 },
    { name: "Mending", maxLevel: 1 },
    { name: "Curse of Binding", maxLevel: 1 },
    { name: "Curse of Vanishing", maxLevel: 1 },
  ],
  helmet_only: [
    { name: "Respiration", maxLevel: 3 },
    { name: "Aqua Affinity", maxLevel: 1 },
  ],
  boots_only: [
    { name: "Feather Falling", maxLevel: 4 },
    { name: "Depth Strider", maxLevel: 3 },
    { name: "Frost Walker", maxLevel: 2 },
    { name: "Soul Speed", maxLevel: 3 },
  ],
  bow: [
    { name: "Power", maxLevel: 5 },
    { name: "Punch", maxLevel: 2 },
    { name: "Flame", maxLevel: 1 },
    { name: "Infinity", maxLevel: 1 },
    { name: "Unbreaking", maxLevel: 3 },
    { name: "Mending", maxLevel: 1 },
    { name: "Curse of Vanishing", maxLevel: 1 },
  ],
  crossbow: [
    { name: "Piercing", maxLevel: 4 },
    { name: "Multishot", maxLevel: 1 },
    { name: "Quick Charge", maxLevel: 3 },
    { name: "Unbreaking", maxLevel: 3 },
    { name: "Mending", maxLevel: 1 },
    { name: "Curse of Vanishing", maxLevel: 1 },
  ],
  fishing_rod: [
    { name: "Luck of the Sea", maxLevel: 3 },
    { name: "Lure", maxLevel: 3 },
    { name: "Unbreaking", maxLevel: 3 },
    { name: "Mending", maxLevel: 1 },
    { name: "Curse of Vanishing", maxLevel: 1 },
  ],
  trident: [
    { name: "Loyalty", maxLevel: 3 },
    { name: "Channeling", maxLevel: 1 },
    { name: "Riptide", maxLevel: 3 },
    { name: "Impaling", maxLevel: 5 },
    { name: "Unbreaking", maxLevel: 3 },
    { name: "Mending", maxLevel: 1 },
    { name: "Curse of Vanishing", maxLevel: 1 },
  ],
};

// --------------- HELPERS ---------------

function getUserCart(userId) {
  if (!carts.has(userId)) {
    carts.set(userId, {
      items: [],
      currentStep: "none",
      currentItemIndex: null,
      currentCategory: null,
    });
  }
  return carts.get(userId);
}

function formatOrderId(num) {
  return `#${num.toString().padStart(4, "0")}`;
}

function roman(num) {
  const map = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V" };
  return map[num] || num.toString();
}

function formatCart(cart) {
  if (!cart.items.length) return "🛒 **Current Cart:** *(empty)*";

  let text = "🛒 **Current Cart:**\n";
  cart.items.forEach((item, index) => {
    const emoji = ITEM_EMOJIS[item.itemKey] || "✨";
    text += `\n**${index + 1}) ${emoji} ${item.material || "?"} ${item.displayName}**\n`;
    if (item.enchants.length) {
      item.enchants.forEach((e) => {
        text += `• ${e.name}${e.level ? ` ${roman(e.level)}` : ""}\n`;
      });
    } else {
      text += "• *(no enchantments yet)*\n";
    }
  });
  return text;
}

function getEnchantListFor(itemKey, category) {
  if (itemKey === "sword") return ENCHANTS.sword;
  if (["axe", "pickaxe", "shovel", "hoe"].includes(itemKey)) return ENCHANTS.tools;
  if (["helmet", "chestplate", "leggings", "boots"].includes(itemKey)) {
    let list = [...ENCHANTS.armor_common];
    if (itemKey === "helmet") list = list.concat(ENCHANTS.helmet_only);
    if (itemKey === "boots") list = list.concat(ENCHANTS.boots_only);
    return list;
  }
  if (itemKey === "bow") return ENCHANTS.bow;
  if (itemKey === "crossbow") return ENCHANTS.crossbow;
  if (itemKey === "fishing_rod") return ENCHANTS.fishing_rod;
  if (itemKey === "trident") return ENCHANTS.trident;
  return [];
}

// --------------- UI BUILDERS ---------------

function buildCategoryMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("cat_select")
      .setPlaceholder("Choose a category")
      .addOptions(
        {
          label: "Weapons & Tools",
          value: "weapons_tools",
          emoji: CATEGORY_EMOJIS.weapons_tools,
        },
        {
          label: "Armor",
          value: "armor",
          emoji: CATEGORY_EMOJIS.armor,
        },
        {
          label: "Ranged",
          value: "ranged",
          emoji: CATEGORY_EMOJIS.ranged,
        },
        {
          label: "Misc (Elytra, etc.)",
          value: "misc",
          emoji: CATEGORY_EMOJIS.misc,
        }
      )
  );
}

function buildItemMenu(category) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("item_select")
    .setPlaceholder("Choose an item");

  if (category === "weapons_tools") {
    menu.addOptions(
      { label: "Sword", value: "sword", emoji: ITEM_EMOJIS.sword },
      { label: "Axe", value: "axe", emoji: ITEM_EMOJIS.axe },
      { label: "Pickaxe", value: "pickaxe", emoji: ITEM_EMOJIS.pickaxe },
      { label: "Shovel", value: "shovel", emoji: ITEM_EMOJIS.shovel },
      { label: "Hoe", value: "hoe", emoji: ITEM_EMOJIS.hoe }
    );
  } else if (category === "armor") {
    menu.addOptions(
      { label: "Helmet", value: "helmet", emoji: ITEM_EMOJIS.helmet },
      { label: "Chestplate", value: "chestplate", emoji: ITEM_EMOJIS.chestplate },
      { label: "Leggings", value: "leggings", emoji: ITEM_EMOJIS.leggings },
      { label: "Boots", value: "boots", emoji: ITEM_EMOJIS.boots }
    );
  } else if (category === "ranged") {
    menu.addOptions(
      { label: "Bow", value: "bow", emoji: ITEM_EMOJIS.bow },
      { label: "Crossbow", value: "crossbow", emoji: ITEM_EMOJIS.crossbow },
      { label: "Trident", value: "trident", emoji: ITEM_EMOJIS.trident },
      { label: "Fishing Rod", value: "fishing_rod", emoji: ITEM_EMOJIS.fishing_rod }
    );
  } else if (category === "misc") {
    menu.addOptions(
      { label: "Elytra (soon)", value: "elytra_disabled", emoji: ITEM_EMOJIS.elytra }
    );
  }

  return new ActionRowBuilder().addComponents(menu);
}

function buildMaterialMenu(category) {
  const materials =
    category === "armor" ? MATERIALS_ARMOR : MATERIALS_WEAPONS_TOOLS;

  const menu = new StringSelectMenuBuilder()
    .setCustomId("material_select")
    .setPlaceholder("Choose a material")
    .addOptions(materials);

  return new ActionRowBuilder().addComponents(menu);
}

function buildEnchantMenu(itemKey, category, userId) {
  const list = getEnchantListFor(itemKey, category);
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`enchant_select:${userId}`)
    .setPlaceholder("Choose an enchantment")
    .addOptions(
      list.map((e) => ({
        label: e.name,
        value: e.name,
      }))
    );

  const row1 = new ActionRowBuilder().addComponents(menu);

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`back_to_material:${userId}`)
      .setLabel("Back to material")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`back_to_cart:${userId}`)
      .setLabel("Back to cart")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`shop_more:${userId}`)
      .setLabel("Shop more")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`finish_order:${userId}`)
      .setLabel("Finish order")
      .setStyle(ButtonStyle.Success)
  );

  return [row1, row2];
}

function buildLevelMenu(enchantName, maxLevel, userId) {
  const options = [];
  for (let i = 1; i <= maxLevel; i++) {
    options.push({
      label: `${enchantName} ${roman(i)}`,
      value: String(i),
    });
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`enchant_level_select:${userId}:${enchantName}`)
    .setPlaceholder(`Choose level for ${enchantName}`)
    .addOptions(options);

  return new ActionRowBuilder().addComponents(menu);
}

function buildRemoveItemsMenu(cart, userId) {
  const options = cart.items.map((item, index) => ({
    label: `${index + 1}) ${item.material || "?"} ${item.displayName}`,
    value: String(index),
  }));

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`remove_item_select:${userId}`)
    .setPlaceholder("Select an item to remove")
    .addOptions(options);

  return new ActionRowBuilder().addComponents(menu);
}

function buildCartControlButtons(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`shop_more:${userId}`)
      .setLabel("Shop more")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`remove_items:${userId}`)
      .setLabel("Remove items")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`finish_order:${userId}`)
      .setLabel("Finish order")
      .setStyle(ButtonStyle.Success)
  );
}

function buildOrderEmbed(user, cart, orderId) {
  const embed = new EmbedBuilder()
    .setTitle(`Enchant Order ${orderId}`)
    .setColor(0x00ae86)
    .setTimestamp(new Date())
    .setFooter({ text: `User ID: ${user.id}` })
    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() });

  if (!cart.items.length) {
    embed.setDescription("No items in cart.");
    return embed;
  }

  let desc = "";
  cart.items.forEach((item, index) => {
    const emoji = ITEM_EMOJIS[item.itemKey] || "✨";
    desc += `**${index + 1}) ${emoji} ${item.material || "?"} ${item.displayName}**\n`;
    if (item.enchants.length) {
      item.enchants.forEach((e) => {
        desc += `• ${e.name}${e.level ? ` ${roman(e.level)}` : ""}\n`;
      });
    } else {
      desc += "• *(no enchantments)*\n";
    }
    desc += "\n";
  });

  embed.setDescription(desc);
  return embed;
}

// --------------- COMMAND REGISTRATION ---------------

const commands = [
  new SlashCommandBuilder()
    .setName("enchantpanel")
    .setDescription("Open the enchant shop panel"),
].map((c) => c.toJSON());

async function registerCommands() {
  if (!process.env.TOKEN || !process.env.CLIENT_ID) {
    console.log("Missing TOKEN or CLIENT_ID for command registration.");
    return;
  }

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  try {
    console.log("Registering slash commands...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });
    console.log("Slash commands registered.");
  } catch (err) {
    console.error("Error registering commands:", err);
  }
}

// --------------- EVENTS ---------------

client.once("ready", async (c) => {
  console.log(`Bot is online as ${c.user.tag}`);
  await registerCommands();
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "enchantpanel") {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("start_shopping")
            .setLabel("Start Shopping")
            .setStyle(ButtonStyle.Success)
            .setEmoji("✨")
        );

        await interaction.reply({
          content:
            "✨ **Enchant Shop Panel**\nPress the button below to start shopping.",
          components: [row],
        });
      }
      return;
    }

    // ---------------- BUTTONS ----------------
    if (interaction.isButton()) {
      const { customId } = interaction;

      if (customId === "start_shopping") {
        const cart = getUserCart(interaction.user.id);
        cart.items = [];
        cart.currentStep = "category";
        cart.currentItemIndex = null;
        cart.currentCategory = null;

        await interaction.followUp({
          content: "🔧 **What do you want to enchant?**",
          components: [buildCategoryMenu()],
          ephemeral: true,
        });

        return;
      }

      const [action, userId] = customId.split(":");

      if (userId && userId !== interaction.user.id) {
        await interaction.reply({
          content: "❌ This panel is not for you.",
          ephemeral: true,
        });
        return;
      }

      const cart = getUserCart(interaction.user.id);

      if (action === "shop_more") {
        cart.currentStep = "category";
        cart.currentItemIndex = null;
        cart.currentCategory = null;

        await interaction.update({
          content: "🛍️ **Shop More**\n\n🔧 What do you want to enchant?",
          components: [buildCategoryMenu()],
        });
        return;
      }

      // FINISH ORDER
      if (action === "finish_order") {
        if (!cart.items.length) {
          await interaction.reply({
            content: "⚠️ Your cart is empty.",
            ephemeral: true,
          });
          return;
        }

        const orderId = formatOrderId(orderCounter++);
        const embed = buildOrderEmbed(interaction.user, cart, orderId);
        const pingText = `<@${OWNER_ID}> <@&${ENCHANTER_ROLE_ID}> <@&${ADMIN_ROLE_ID}>${
          BUILDER_ROLE_ID !== "000000000000000000"
            ? ` <@&${BUILDER_ROLE_ID}>`
            : ""
        }`;

        let targetChannel = interaction.channel;
        if (ORDER_CHANNEL_ID) {
          const ch = await interaction.guild.channels
            .fetch(ORDER_CHANNEL_ID)
            .catch(() => null);
          if (ch) targetChannel = ch;
        }

        await targetChannel.send({
          content: `${pingText}\nOrder ${orderId}`,
          embeds: [embed],
        });

        if (ORDER_LOG_CHANNEL_ID) {
          const logCh = await interaction.guild.channels
            .fetch(ORDER_LOG_CHANNEL_ID)
            .catch(() => null);
          if (logCh) {
            await logCh.send({
              content: `🧾 New order logged: ${orderId} by ${interaction.user.tag} (${interaction.user.id})`,
              embeds: [embed],
            });
          }
        }

        // Ticket erstellen
        const ticketChannel = await interaction.guild.channels.create({
          name: `order-${orderId}`,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: interaction.user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
              ],
            },
            {
              id: OWNER_ID,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
              ],
            },
            {
              id: ADMIN_ROLE_ID,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
              ],
            },
            {
              id: ENCHANTER_ROLE_ID,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
              ],
            },
            ...(BUILDER_ROLE_ID !== "000000000000000000"
              ? [
                  {
                    id: BUILDER_ROLE_ID,
                    allow: [
                      PermissionFlagsBits.ViewChannel,
                      PermissionFlagsBits.SendMessages,
                    ],
                  },
                ]
              : []),
          ],
        });

        const staffButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`claim_ticket:${interaction.user.id}`)
            .setLabel("Claim")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`unclaim_ticket:${interaction.user.id}`)
            .setLabel("Unclaim")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`close_ticket:${interaction.user.id}`)
            .setLabel("Close")
            .setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({
          content: `<@${interaction.user.id}> <@${OWNER_ID}> <@&${ADMIN_ROLE_ID}> <@&${ENCHANTER_ROLE_ID}>${
            BUILDER_ROLE_ID !== "000000000000000000"
              ? ` <@&${BUILDER_ROLE_ID}>`
              : ""
          }`,
          embeds: [embed],
          components: [staffButtons],
        });

        carts.delete(interaction.user.id);

        await interaction.update({
          content: `✅ **Order finished!**\nYour enchant order ${orderId} has been submitted.`,
          components: [],
        });
        return;
      }

      // REMOVE ITEMS
      if (action === "remove_items") {
        if (!cart.items.length) {
          await interaction.reply({
            content: "⚠️ Your cart is already empty.",
            ephemeral: true,
          });
          return;
        }

        await interaction.update({
          content:
            "🗑️ **Remove Items**\nSelect an item to remove from your cart.",
          components: [buildRemoveItemsMenu(cart, interaction.user.id)],
        });
        return;
      }

      // BACK TO CART
      if (action === "back_to_cart") {
        cart.currentStep = "cart";
        await interaction.update({
          content: "🛒 **Your Cart:**\n\n" + formatCart(cart),
          components: [buildCartControlButtons(interaction.user.id)],
        });
        return;
      }

      // BACK TO CATEGORY
      if (action === "back_to_category") {
        cart.currentStep = "category";
        cart.currentItemIndex = null;
        cart.currentCategory = null;

        await interaction.update({
          content: "🔧 **What do you want to enchant?**",
          components: [buildCategoryMenu()],
        });
        return;
      }

      // BACK TO ITEM
      if (action === "back_to_item") {
        if (!cart.currentCategory) {
          await interaction.reply({
            content: "❌ Something went wrong. Please start again.",
            ephemeral: true,
          });
          return;
        }

        cart.currentStep = "item";

        await interaction.update({
          content: `${
            CATEGORY_EMOJIS[cart.currentCategory] || "✨"
          } **Choose an item:**`,
          components: [buildItemMenu(cart.currentCategory)],
        });
        return;
      }

      // BACK TO MATERIAL
      if (action === "back_to_material") {
        if (!cart.currentCategory || cart.currentItemIndex === null) {
          await interaction.reply({
            content: "❌ Something went wrong. Please start again.",
            ephemeral: true,
          });
          return;
        }

        cart.currentStep = "material";

        await interaction.update({
          content: `${
            ITEM_EMOJIS[cart.items[cart.currentItemIndex].itemKey] || "✨"
          } **Choose a material:**`,
          components: [buildMaterialMenu(cart.currentCategory)],
        });
        return;
      }

      // ---------------- TICKET BUTTONS ----------------

      if (action === "claim_ticket") {
        if (
          interaction.user.id !== OWNER_ID &&
          !interaction.member.roles.cache.has(ADMIN_ROLE_ID)
        ) {
          return interaction.reply({
            content: "❌ Only Owner or Admin can claim tickets.",
            ephemeral: true,
          });
        }

        const newContent = `${interaction.message.content}\n\n🔒 Ticket claimed by <@${interaction.user.id}>`;

        await interaction.update({
          content: newContent,
          components: interaction.message.components,
        });
        return;
      }

      if (action === "unclaim_ticket") {
        if (interaction.user.id !== OWNER_ID) {
          return interaction.reply({
            content: "❌ Only the Owner can unclaim tickets.",
            ephemeral: true,
          });
        }

        const newContent = `${interaction.message.content}\n\n🔓 Ticket unclaimed.`;

        await interaction.update({
          content: newContent,
          components: interaction.message.components,
        });
        return;
      }

      if (action === "close_ticket") {
        if (
          interaction.user.id !== OWNER_ID &&
          !interaction.member.roles.cache.has(ADMIN_ROLE_ID)
        ) {
          return interaction.reply({
            content: "❌ Only Owner or Admin can close tickets.",
            ephemeral: true,
          });
        }

        await interaction.reply({
          content: "🔒 Ticket will be closed.",
          ephemeral: true,
        });

        await interaction.channel.delete().catch(() => {});
        return;
      }
    }

    // ---------------- SELECT MENUS ----------------
    if (interaction.isStringSelectMenu()) {
      const { customId, values } = interaction;

      // CATEGORY SELECT
      if (customId === "cat_select") {
        const category = values[0];
        const cart = getUserCart(interaction.user.id);

        cart.currentStep = "item";
        cart.currentCategory = category;
        cart.currentItemIndex = null;

        await interaction.update({
          content: `${CATEGORY_EMOJIS[category] || "✨"} **Choose an item:**`,
          components: [buildItemMenu(category)],
        });
        return;
      }

      // ITEM SELECT
      if (customId === "item_select") {
        const itemKey = values[0];
        const cart = getUserCart(interaction.user.id);

        if (itemKey === "elytra_disabled") {
          await interaction.reply({
            content: "🪽 Elytra enchantments are coming soon!",
            ephemeral: true,
          });
          return;
        }

        if (!cart.currentCategory) {
          await interaction.reply({
            content: "❌ Something went wrong. Please start again.",
            ephemeral: true,
          });
          return;
        }

        const displayName =
          itemKey.charAt(0).toUpperCase() + itemKey.slice(1).replace("_", " ");

        const newItem = {
          category: cart.currentCategory,
          itemKey,
          material: null,
          displayName,
          enchants: [],
        };

        cart.items.push(newItem);
        cart.currentItemIndex = cart.items.length - 1;
        cart.currentStep = "material";

        await interaction.update({
          content: `${ITEM_EMOJIS[itemKey] || "✨"} **Choose a material:**`,
          components: [buildMaterialMenu(cart.currentCategory)],
        });
        return;
      }

      // MATERIAL SELECT
      if (customId === "material_select") {
        const material = values[0];
        const cart = getUserCart(interaction.user.id);

        if (cart.currentItemIndex === null) {
          await interaction.reply({
            content: "❌ Something went wrong. Please start again.",
            ephemeral: true,
          });
          return;
        }

        const item = cart.items[cart.currentItemIndex];
        item.material = material;
        item.enchants = item.enchants || [];

        cart.currentStep = "enchants";

        await interaction.update({
          content: `✨ **What enchantments do you want?**\n\n${formatCart(cart)}`,
          components: buildEnchantMenu(
            item.itemKey,
            item.category,
            interaction.user.id
          ),
        });
        return;
      }

      // ENCHANT SELECT
      if (customId.startsWith("enchant_select:")) {
        const userId = customId.split(":")[1];
        if (userId !== interaction.user.id) {
          await interaction.reply({
            content: "❌ This menu is not for you.",
            ephemeral: true,
          });
          return;
        }

        const enchantName = values[0];
        const cart = getUserCart(interaction.user.id);

        if (cart.currentItemIndex === null) {
          await interaction.reply({
            content: "❌ Something went wrong. Please start again.",
            ephemeral: true,
          });
          return;
        }

        const item = cart.items[cart.currentItemIndex];
        const list = getEnchantListFor(item.itemKey, item.category);
        const enchant = list.find((e) => e.name === enchantName);

        if (!enchant) {
          await interaction.reply({
            content: "❌ Invalid enchantment.",
            ephemeral: true,
          });
          return;
        }

        if (enchant.maxLevel === 1) {
          item.enchants.push({ name: enchant.name, level: null });

          await interaction.update({
            content: `✨ **Enchantment added:** ${enchant.name}\n\n${formatCart(
              cart
            )}`,
            components: buildEnchantMenu(
              item.itemKey,
              item.category,
              interaction.user.id
            ),
          });
        } else {
          await interaction.update({
            content: `✨ **Choose level for ${enchant.name}:**\n\n${formatCart(
              cart
            )}`,
            components: [
              buildLevelMenu(enchant.name, enchant.maxLevel, interaction.user.id),
            ],
          });
        }
        return;
      }

      // ENCHANT LEVEL SELECT
      if (customId.startsWith("enchant_level_select:")) {
        const parts = customId.split(":");
        const userId = parts[1];
        const enchantName = parts[2];

        if (userId !== interaction.user.id) {
          await interaction.reply({
            content: "❌ This menu is not for you.",
            ephemeral: true,
          });
          return;
        }

        const level = parseInt(values[0], 10);
        const cart = getUserCart(interaction.user.id);

        if (cart.currentItemIndex === null) {
          await interaction.reply({
            content: "❌ Something went wrong. Please start again.",
            ephemeral: true,
          });
          return;
        }

        const item = cart.items[cart.currentItemIndex];
        item.enchants.push({ name: enchantName, level });

        await interaction.update({
          content: `✨ **Enchantment added:** ${enchantName} ${roman(
            level
          )}\n\n${formatCart(cart)}`,
          components: buildEnchantMenu(
            item.itemKey,
            item.category,
            interaction.user.id
          ),
        });
        return;
      }

      // REMOVE ITEM SELECT
      if (customId.startsWith("remove_item_select:")) {
        const userId = customId.split(":")[1];
        if (userId !== interaction.user.id) {
          await interaction.reply({
            content: "❌ This menu is not for you.",
            ephemeral: true,
          });
          return;
        }

        const index = parseInt(values[0], 10);
        const cart = getUserCart(interaction.user.id);

        if (isNaN(index) || index < 0 || index >= cart.items.length) {
          await interaction.reply({
            content: "❌ Invalid selection.",
            ephemeral: true,
          });
          return;
        }

        cart.items.splice(index, 1);
        if (cart.currentItemIndex === index) {
          cart.currentItemIndex = null;
          cart.currentStep = "cart";
        }

        await interaction.update({
          content: "🗑️ **Item removed from cart.**\n\n" + formatCart(cart),
          components: [buildCartControlButtons(interaction.user.id)],
        });
        return;
      }
    }
  } catch (err) {
    console.error(err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ An error occurred.",
        ephemeral: true,
      });
    }
  }
});

// --------------- LOGIN ---------------

if (!process.env.TOKEN) {
  console.log("Missing TOKEN in environment.");
} else {
  client.login(process.env.TOKEN);
}
