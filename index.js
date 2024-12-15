const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder, AuditLogEvent, ChannelType, InteractionType, Events, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const { token, clientId } = require('./config.json');
const noblox = require('noblox.js');
const { DisTube } = require('distube');
const { YouTubePlugin } = require('@distube/youtube');
const { SpotifyPlugin } = require('@distube/spotify'); 
const SpotifyWebApi = require('spotify-web-api-node');
const { VoiceChannel } = require('discord.js');
const ytdl = require('ytdl-core'); 
const fs = require('fs');
const express = require('express');
const app = express();
const PORT = 3300;
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildMembers
    ],
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Datei Pfad für die JSON-Daten
const usersFile = path.join(__dirname, 'public', 'user.json');

// Benutzerdaten laden
app.get('/users', (req, res) => {
    fs.readFile(usersFile, 'utf-8', (err, data) => {
        if (err) return res.status(500).send('Fehler beim Laden der Benutzerdaten');
        res.json(JSON.parse(data));
    });
});

// Änderungen an Benutzerdaten speichern
app.post('/save-user', (req, res) => {
    const updatedUser = req.body;
    
    fs.readFile(usersFile, 'utf-8', (err, data) => {
        if (err) return res.status(500).send('Fehler beim Laden der Benutzerdaten');
        
        let users = JSON.parse(data);
        const userIndex = users.findIndex(u => u.vorname === updatedUser.vorname && u.nachname === updatedUser.nachname);
        
        if (userIndex !== -1) {
            users[userIndex] = updatedUser;
            fs.writeFile(usersFile, JSON.stringify(users, null, 2), err => {
                if (err) return res.status(500).send('Fehler beim Speichern der Benutzerdaten');
                res.send('Benutzerdaten erfolgreich gespeichert');
            });
        } else {
            res.status(404).send('Benutzer nicht gefunden');
        }
    });
});

// Route zum Speichern eines neuen Fahrzeugs
app.post('/add-vehicle', (req, res) => {
    const newVehicle = req.body;

    // Pfad zur fahrzeuge.json
    const vehiclesFilePath = path.join(__dirname, 'fahrzeuge.json');

    // Lese die aktuelle Fahrzeugdatei
    fs.readFile(vehiclesFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Fehler beim Laden der Fahrzeugdaten');
        }

        // Parse die Daten
        const vehicles = JSON.parse(data);

        // Füge das neue Fahrzeug zur Liste hinzu
        vehicles.push(newVehicle);

        // Schreibe die aktualisierten Daten in die JSON-Datei
        fs.writeFile(vehiclesFilePath, JSON.stringify(vehicles, null, 2), 'utf8', (err) => {
            if (err) {
                return res.status(500).send('Fehler beim Speichern des Fahrzeugs');
            }
            res.status(200).send('Fahrzeug erfolgreich hinzugefügt!');
        });
    });
});

// Starten des Servers
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

client.once('ready', async () => {
    console.log(`Bot is online as ${client.user.tag}`);
    
    try {
        await client.user.setPresence({
            activities: [{
                name: 'ready to Support',
                type: 1 
            }],
            status: 'online' 
        });
        console.log('Status erfolgreich gesetzt!');
    } catch (err) {
        console.error('Fehler beim Setzen des Status:', err);
    }
});

 // Deine bestehende ID-Logik
let ids = {};
const loadIds = () => {
    if (!fs.existsSync('ids.json')) {
        ids = {};
        return;
    }

    const data = fs.readFileSync('ids.json', 'utf8');
    if (!data) {
        ids = {};
        return;
    }

    try {
        ids = JSON.parse(data);
    } catch (error) {
        console.error('Fehler beim Laden der IDs:', error);
        ids = {};
    }
};

loadIds();

const saveIds = () => {
    try {
        fs.writeFileSync('ids.json', JSON.stringify(ids, null, 2));
    } catch (error) {
        console.error('Fehler beim Speichern der IDs:', error);
    }
};

client.distube = new DisTube(client, {
    plugins: [new YouTubePlugin(), new SpotifyPlugin()], 
    emitNewSongOnly: true,
    savePreviousSongs: true,
    nsfw: false,
    emitAddSongWhenCreatingQueue: false,
    emitAddListWhenCreatingQueue: true,
    joinNewVoiceChannel: true,
    nsfw: true
});
client.distube.setMaxListeners(3);


let levels = loadLevels(); // Geladene Levels

// Funktion zum Laden der Levels
function loadLevels() {
    try {
        if (fs.existsSync('levels.json')) {
            const data = fs.readFileSync('levels.json', 'utf8');
            if (data.trim() === '') {
                return {}; // Wenn die Datei leer ist, ein leeres Objekt zurückgeben
            }
            return JSON.parse(data); // Wenn Daten vorhanden sind, laden
        }
    } catch (error) {
        console.error('Error loading levels data:', error);
    }
    return {}; // Falls die Datei nicht existiert oder ein Fehler auftritt, ein leeres Objekt zurückgeben
}

// Funktion zum Speichern der Levels
function saveLevels() {
    try {
        fs.writeFileSync('levels.json', JSON.stringify(levels, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving levels data:', error);
    }
}

// Funktion zur Berechnung des neuen Levels und Speichern
function addXp(userId, xp) {
    if (!levels[userId]) {
        levels[userId] = { xp: 0, level: 1 }; // Initialisieren, wenn der Benutzer noch nicht existiert
    }

    levels[userId].xp += xp;

    // Berechne das neue Level basierend auf XP
    const newLevel = Math.floor(levels[userId].xp / 100); // XP pro Level 100
    if (newLevel > levels[userId].level && newLevel <= 100) { // Maximalstufe 100
        levels[userId].level = newLevel;
        sendLevelUpMessage(userId, newLevel); // Nachricht senden, wenn Level up
        assignRoleOnLevelUp(userId, newLevel); // Rolle zuweisen, wenn Level up
    }
}

// Funktion, um die Level-Up Nachricht zu senden
async function sendLevelUpMessage(userId, level) {
    const user = client.users.cache.get(userId);
    const channel = client.channels.cache.get('1297978348076535891'); // Textkanal-ID

    if (!user || !channel) return;

    // Erstelle das Embed für das Level-Up
    const levelUpEmbed = new EmbedBuilder()
        .setColor(0xADD8E6) // Goldene Farbe für Level-Up
        .setTitle(`${user.tag} hat Level ${level} erreicht! <:giveaway:1307408840156778506>`)
        .setDescription(`Herzlichen Glückwunsch, ${user.username}! Du hast nun **Level ${level}** erreicht! <:pandachrismas:1305585634127118418>`)
        .addFields(
            { name: '<:Info2:1305942999850549259>XP', value: `Du hast nun **${levels[userId].xp}** XP!`, inline: true },
            { name: '<:Info2:1305942999850549259>Maximales Level', value: 'Level 100 ist das höchste erreichbare Level.', inline: true }
        )
        .setThumbnail(user.displayAvatarURL())
        .setFooter({
            text: 'Bleib dran und erziele mehr XP!',
            iconURL: 'https://cdn.discordapp.com/attachments/1193016571115876393/1305585769225650196/pandachrismas.png',
        })
        .setTimestamp();

    try {
        // Sende das Embed in den Kanal
        await channel.send({ embeds: [levelUpEmbed] });
    } catch (error) {
        console.error('Fehler beim Senden des Level-Up Embeds:', error);
    }
}

// Funktion zur Zuweisung einer Rolle basierend auf dem Level des Benutzers
async function assignRoleOnLevelUp(userId, level) {
    const guild = client.guilds.cache.get('1292560320019042396'); // Deine Server-ID
    const user = guild.members.cache.get(userId);

    if (!user) return;

    // Definiere die Rollen-IDs, die vergeben werden sollen (ersetze mit deinen eigenen IDs)
    const rolesToAssign = [
        { level: 1, roleId: '1307169105186521099' },  // Beispiel: Rolle für Level 1
        { level: 10, roleId: '1307169105186521099' }, // Rolle für Level 10
        { level: 20, roleId: '1307168604126449715' }, // Rolle für Level 20
        { level: 30, roleId: '1307168506743095366' }, // Rolle für Level 30
        { level: 40, roleId: '1307076359377518682' }, // Rolle für Level 40
        { level: 50, roleId: '1307169428588204072' }, // Rolle für Level 50
        { level: 60, roleId: '1307169256055636050' }, // Rolle für Level 60
        { level: 70, roleId: '1307168886688452748' }, // Rolle für Level 70
        { level: 80, roleId: '1307168743046119454' }, // Rolle für Level 80
        { level: 90, roleId: '1307167963476131880' }, // Rolle für Level 90
        { level: 100, roleId: '1307077577189494905' } // Rolle für Level 100
    ];

    // Suche nach der Rolle, die dem aktuellen Level entspricht
    const roleToAssign = rolesToAssign.find(role => role.level === level);
    if (roleToAssign) {
        // Hole die Rolle mit der ID
        const role = guild.roles.cache.get(roleToAssign.roleId);
        if (role && !user.roles.cache.has(role.id)) {
            await user.roles.add(role);
            console.log(`Rolle mit ID "${roleToAssign.roleId}" wurde ${user.user.tag} zugewiesen!`);
        }
    }
}

const allowedRoleId2 = '1297978177112637492'; //OWNER ID
const Police = '1299566799804698675'; //OWNER ID
const allowedRoleId1 = '1297978184918241321'; //BRP TEAM ID
const teamleitung = '1302229684993523794'; //BRP TEAM ID
const serverleitung = '1299550335207211070'; //BRP TEAM ID
const logChannelId = '1301823060600688681'; // Replace with your actual log channel ID
const logChannelId2 = '1297978300668317797'; // STAFF CHAT
const ticketDataPath = path.join(__dirname, 'ticketData.json');
const logoURL = 'https://cdn.discordapp.com/attachments/1193016571115876393/1302401026359300189/image.png?ex=672de9ba&is=672c983a&hm=c66ab5985ed73d97d6ed6e5999e482c16050e54e4f4a90de804d92fbdba54198&';

// Funktion zum Laden der Tickets aus der Datei
function loadTicketData() {
    if (fs.existsSync(ticketDataPath)) {
        const data = fs.readFileSync(ticketDataPath);
        return JSON.parse(data);
    }
    return {};
}

// Funktion zum Speichern der Tickets in die Datei
function saveTicketData(ticketMap) {
    fs.writeFileSync(ticketDataPath, JSON.stringify(Object.fromEntries(ticketMap)), 'utf-8');
}

// `ticketMap` mit geladenen Daten initialisieren
const ticketMap = new Map(Object.entries(loadTicketData()));

function loadTicketData() {
    try {
      const data = fs.readFileSync('ticketData.json', 'utf8');
      // Check if data is empty or null before parsing
      if (!data) {
        console.error("JSON file is empty or missing data.");
        return []; // Or handle as appropriate
      }
      return JSON.parse(data); // Parse JSON data
    } catch (err) {
      console.error("Error reading or parsing JSON:", err);
      return []; // Fallback or error handling
    }
  }

  let warns = {};

  const loadWarns = () => {
      if (!fs.existsSync('warns.json')) {
          warns = {};
          return;
      }
  
      const data = fs.readFileSync('warns.json', 'utf8');
  
      if (!data) {
          warns = {};
          return;
      }
  
      try {
          warns = JSON.parse(data);
      } catch (error) {
          console.error('Fehler beim Laden der Warnungen:', error);
          warns = {};
      }
  };
  
  loadWarns();
  
  const saveWarns = () => {
      try {
          fs.writeFileSync('warns.json', JSON.stringify(warns, null, 2));
      } catch (error) {
          console.error('Fehler beim Speichern der Warnungen:', error);
      }
  };

// Event-Listener für das Hinzufügen neuer Mitglieder
client.on('guildMemberAdd', async (member) => {
    console.log(`Neues Mitglied beigetreten: ${member.user.tag}`);

    // CHANNEL ID
    const channelId = '1297978287787606027';
    let channel;

    try {
        channel = await member.guild.channels.fetch(channelId);
    } catch (error) {
        console.error(`Fehler beim Abrufen des Kanals:`, error);
        return;
    }

    // Überprüfen, ob der Kanal ein Textkanal ist
    if (channel.type !== ChannelType.GuildText) {
        console.error('Der Kanal ist kein Textkanal.');
        return;
    }

    const botMember = member.guild.members.cache.get(client.user.id); 

    // Überprüfen, ob der Bot im Server ist und Berechtigungen hat
    if (!botMember) {
        console.error('Der Bot ist nicht im Server.');
        return;
    }

    if (!channel.permissionsFor(botMember).has('SEND_MESSAGES')) {
        console.error('Bot hat keine Berechtigung, Nachrichten zu senden.');
        return;
    }

    // Member Role
    const roleId = '1297979139130916946';

    try {
        // Die Rolle dem Mitglied hinzufügen
        const role = member.guild.roles.cache.get(roleId);
        if (role) {
            await member.roles.add(role);
            console.log(`Rolle erfolgreich hinzugefügt: ${role.name} für ${member.user.tag}`);
        } else {
            console.error('Rolle nicht gefunden.');
        }
    } catch (error) {
        console.error('Fehler beim Hinzufügen der Rolle:', error);
    }

    // Create the welcome embed
    const welcomeEmbed = new EmbedBuilder()
        .setColor(0xADD8E6) // Light blue color
        .setTitle('WELCOME <a:pik:1304113878359212104>')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 })) // Display the user's avatar
        .setDescription(`
            • <@${member.id}>, welcome to **Berlin RP**! You are our **${member.guild.memberCount}th member!** <a:heart:1304113853637853255>`)
        .addFields(
            {
                name: '<a:krone:1304113900962185246> Account Created On',
                value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:d>`,
                inline: true
            },
            {
                name: '<a:chat:1304114696911323218> Information',
                value: 'If you have any questions or issues, please open a ticket in <#1297978355752108154>.',
                inline: false
            }
        )
        .setFooter({
            text: "Copyright © BRP 2024",
            iconURL: logoURL // Verwende die Variable hier
        })
        .setImage("https://cdn.discordapp.com/attachments/1252287347782058067/1304115478779793480/testeteete.png?ex=672e37af&is=672ce62f&hm=c0ae52b672be3ab536f6a98f0ce52a647e9b5659c9adb3895efccf95890ce178&");

    try {
        await channel.send({ embeds: [welcomeEmbed] });
        console.log('Willkommens-Embed erfolgreich gesendet.');
    } catch (error) {
        console.error('Fehler beim Senden des Willkommens-Embeds:', error);
    }
});

  
// Anti-link functionality for regular messages
client.on('messageCreate', async (message) => {
    // Ignore messages from bots or webhooks
    if (message.author.bot || message.webhookId) return;

    // Ensure the message is from a Guild (server)
    if (!message.guild) return;

    // Regex to detect links, excluding Spotify and YouTube links
    const linkRegex = /(https?:\/\/(?!open\.spotify\.com|youtu\.be|youtube\.com)[^\s]+)/g;

    // Check if the message contains a non-exempt link
    if (linkRegex.test(message.content)) {
        // Check if the user has a role that allows posting links
        if (message.member.roles.cache.has(allowedRoleId2) ||
            message.member.roles.cache.has(teamleitung) ||
            message.member.roles.cache.has(serverleitung)) {
            return; // Allow the user to post the link if they have the correct role
        }

        try {
            // Delete the message and ban the user if they don't have permission to post links
            await message.delete();
            await message.guild.members.ban(message.author, {
                reason: `Posted a prohibited link: ${message.content.match(linkRegex)[0]}`
            });

            // Create a ban notification embed
            const banEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle('<:ban2:1306316652543213668> User Banned')
                .setDescription(`**${message.author.tag}** has been banned for attempting to post a prohibited link.`)
                .addFields(
                    { name: '<:Member2:1305941789944975360> User ID:', value: message.author.id, inline: true },
                    { name: '<:Time:1306301542126719017> Time:', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '<:moderator:1305939310968569948> Banned by:', value: `**Antilink**`, inline: true },
                    { name: '<:message3:1305939299459403827> Link:', value: `${message.content.match(linkRegex)[0]}`, inline: true }
                )
                .setFooter({
                    text: 'I successfully banned this user!',
                    iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                });

            // Send the ban embed to the log channel
            const channel = message.guild.channels.cache.get(logChannelId2);
            if (channel) {
                await channel.send({ embeds: [banEmbed] });
            } else {
                console.error('Log channel not found.');
            }
        } catch (error) {
            console.error(`Error banning user: ${error.message}`);
        }
        return; // Prevent further checks for the message
    }
});


// Benutzerlevels alle 60 Sekunden speichern
setInterval(saveLevels, 60000); // Speichert alle 60 Sekunden die Levels

// Alle Nachrichten speichern und XP vergeben (hier z.B. 5 XP pro Nachricht)
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // 5 XP pro Nachricht hinzufügen
    addXp(message.author.id, 5);
});

// Slash-Befehle definieren
const commands = [
    {
        name: 'ticket',
        description: 'Send the ticket embed',
    },
    {
        name: 'test1',
        description: 'Send the Test Embed',
    },
    {
        name: 'server-rules',
        description: 'Send the server rules embed',
    },
    {
        name: 'shiftpanel1',
        description: 'Shift Panel 1',
    },
    {
        name: 'shiftpanel2',
        description: 'Shift Panel 2',
    },
    {
        name: 'shiftpanel3',
        description: 'Shift Panel 3',
    },
    {
        name: 'shiftpanel4',
        description: 'Shift Panel 4',
    },
    {
        name: 'changelogo',
        description: 'Change the logo of the bot!',
        options: [
            {
                name: 'logo',
                description: 'The URL of the new logo (Avatar)',
                type: 3, // STRING type
                required: true,
            },
        ],

    },
    {
        name: 'ingame-rules',
        description: 'Send the ingame rules embed',
    },
    {
        name: 'rank',
        description: 'Show your current rank and level',
    },
    {
        name: 'clear',
        description: 'Clear messages',
        options: [
            {
                name: 'amount',
                description: 'The number of messages to delete (1-100)',
                type: 4, // INTEGER type
                required: true,
            },
        ],
    },
    {
        name: 'serverinfo',
        description: 'Show all server information',
    },
    {
        name: 'robloxinfo',
        description: 'Show Roblox information of a user',
        options: [
            {
                name: 'username',  // Argument name for Roblox username
                description: 'Roblox username to fetch info for',
                type: 3, // STRING type
                required: true,
            },
        ],
    },
    {
        name: 'server',
        description: 'Show information about a specific server',
        options: [
            {
                name: 'server_number',
                description: 'Server number (e.g., 1, 2, 3)',
                type: 4, // INTEGER type
                required: true,
            },
        ],
    },
    {
        name: 'warn',
        description: 'Warn a user with a specific reason',
        options: [
            {
                name: 'user',
                description: 'User to be warned',
                type: 6, // USER type
                required: true,
            },
            {
                name: 'reason',
                description: 'Reason for the warning',
                type: 3, // STRING type
                required: true,
            },
        ],
    },
    {
    name: 'invite-user',
    description: 'Lade einen Benutzer in deinen privaten Sprachkanal ein',
    options: [
        {
            name: 'user',
            description: 'Der Benutzer, der eingeladen werden soll',
            type: 6, // USER type
            required: true,
        },
    ],
},
    {
        name: 'remove-warn',
        description: 'Remove a warning from a user',
        options: [
            {
                name: 'user',
                description: 'User whose warning will be removed',
                type: 6, // USER type
                required: true,
            },
            {
                name: 'warning_number',
                description: 'Warning number to remove, or "all"',
                type: 3, // STRING type
                required: true,
            },
        ],
    },
    {
        name: 'warns',
        description: 'Show warnings of a user',
        options: [
            {
                name: 'user',
                description: 'User to show warnings for',
                type: 6, // USER type
                required: true,
            },
        ],
    },
    {
        name: 'createid',
        description: 'Create a user ID with personal information',
    },
    {
        name: 'vehicle',
        description: 'Manage vehicle data for a user',
        options: [
            {
                name: 'action',
                description: 'Action to perform (add, delete, update)',
                type: 3, // STRING
                required: true,
            },
            {
                name: 'id',
                description: 'User ID',
                type: 3, // STRING
                required: true,
            },
            {
                name: 'type',
                description: 'Vehicle type (e.g., Car, Bike)',
                type: 3, // STRING
                required: true,
            },
            {
                name: 'plate',
                description: 'Vehicle license plate',
                type: 3, // STRING
                required: true,
            },
            {
                name: 'status',
                description: 'Vehicle status (e.g., registered, stolen, impounded)',
                type: 3, // STRING
                required: true,
            },
        ],
    },
    {
        name: 'warrant',
        description: 'Update or remove a wanted status for a user',
        options: [
            {
                name: 'id',
                description: 'User ID to update the wanted status',
                type: 3, // STRING
                required: true,
            },
            {
                name: 'status',
                description: 'Wanted status (true for wanted, false for not wanted)',
                type: 5, // BOOLEAN
                required: true,
            },
            {
                name: 'description',
                description: 'Reason for wanted status',
                type: 3, // STRING
                required: false,
            },
        ],
    },
    {
        name: 'record',
        description: 'Add or remove a crime record for a user',
        options: [
            {
                name: 'action',
                description: 'Action to perform (add, delete)',
                type: 3, // STRING
                required: true,
            },
            {
                name: 'id',
                description: 'User ID to add/remove record from',
                type: 3, // STRING
                required: true,
            },
            {
                name: 'crime',
                description: 'Description of the crime',
                type: 3, // STRING
                required: true,
            },
            {
                name: 'date',
                description: 'Date of the crime',
                type: 3, // STRING
                required: true,
            },
        ],
    },
    {
        name: 'warning',
        description: 'Add or delete a warning for a user',
        options: [
            {
                name: 'action',
                description: 'Action to perform (add, delete)',
                type: 3, // STRING
                required: true,
            },
            {
                name: 'id',
                description: 'User ID to add/remove warning from',
                type: 3, // STRING
                required: true,
            },
            {
                name: 'warning',
                description: 'Description of the warning',
                type: 3, // STRING
                required: true,
            },
            {
                name: 'date',
                description: 'Date of the warning',
                type: 3, // STRING
                required: true,
            },
        ],
    },
    {
        name: 'license',
        description: 'Add, delete or update a license for a user',
        options: [
            {
                name: 'action',
                description: 'Action to perform (add, delete, update)',
                type: 3, // STRING
                required: true,
            },
            {
                name: 'id',
                description: 'User ID to update the license for',
                type: 3, // STRING
                required: true,
            },
            {
                name: 'type',
                description: 'Type of the license (e.g., driver\'s license)',
                type: 3, // STRING
                required: true,
            },
            {
                name: 'status',
                description: 'Status of the license (active, revoked)',
                type: 3, // STRING
                required: true,
            },
        ],
    },
    {
        name: 'search',
        description: 'Search for a user by their ID',
        options: [
            {
                name: 'id',
                description: 'ID to search for',
                type: 3, // STRING type
                required: true,
            },
        ],
    }
];


const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('🚀 Registering global slash commands...');
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log('✅ Slash commands registered globally.');
    } catch (error) {
        console.error('❌ Error registering slash commands:', error);
    }
})();

// New selection menu for ticket types
const ticketSelectMenu = new StringSelectMenuBuilder()
    .setCustomId('ticket_select')
    .setPlaceholder('Select a ticket topic')
    .addOptions([
        {
            label: 'General Support',
            description: 'Get general support',
            value: 'general_support',
            emoji: '<:general:1305942998596587530>',
        },
        {
            label: 'Report a Player',
            description: 'Report a player',
            value: 'report_player',
            emoji: '<:report:1305942996969328691>',
        },
        {
            label: 'Report a Bug',
            description: 'Report a bug',
            value: 'report_bug',
            emoji: '<:warnung:1305942995174162523>',
        },
        {
            label: 'Partnerships',
            description: 'Questions about partnerships',
            value: 'partnerships',
            emoji: '<:Info2:1305942999850549259>',
        },
    ]);


//SERVER_RULES AND INGAME_RULES SelectMenu
    const selectMenuDeutsch = new StringSelectMenuBuilder()
    .setCustomId('select_test_de')
    .setPlaceholder('Deutsch')
    .addOptions([
        {
            label: 'Regeln 1-12',
            description: 'Roleplay',
            value: 'test_1_de',
            emoji: '📜',
        },
        {
            label: 'Regeln 12-22',
            description: 'Geiseln + TOS/Verbot',
            value: 'test_2_de',
            emoji: '📜',
        },
        {
            label: 'Definitionen',
            description: 'Alle RP-Begriffe werden hier erklärt.',
            value: 'test_3_de',
            emoji: '📘',
        },
    ]);


const selectMenuEnglish = new StringSelectMenuBuilder()
    .setCustomId('select_test_eng')
    .setPlaceholder('English')
    .addOptions([
        {
            label: 'Rules 1-12',
            description: 'Roleplay',
            value: 'test_1_eng',
            emoji: '📜',
        },
        {
            label: 'Rules 12-22',
            description: 'Hostages + TOS/Prohibition',
            value: 'test_2_eng',
            emoji: '📜',
        },
        {
            label: 'Definitions',
            description: 'All RP terms are explained here.',
            value: 'test_3_eng',
            emoji: '📘',
        },
    ]);

    const selectMenuEnglish2 = new StringSelectMenuBuilder()
    .setCustomId('select_test_eng2')
    .setPlaceholder('English')
    .addOptions([
        {
            label: 'English',
            description: 'All Server Rules',
            value: 'test_1_eng2',
            emoji: '🇬🇧',
        },
    ]);

    const selectMenuDeutsch2 = new StringSelectMenuBuilder()
    .setCustomId('select_test_de2')
    .setPlaceholder('Deutsch')
    .addOptions([
        {
            label: 'German',
            description: 'Alle Server Regeln',
            value: 'test_1_de2',
            emoji: '🇩🇪',
        },
    ]);


// Die Funktion hier definieren
function createServerEmbed(code, language, status) {
    return new EmbedBuilder()
        .setColor(0xADD8E6)
        .setTitle('<:server:1307001707812880485> __Berlin RP Server__')
        .setThumbnail(logoURL) 
        .setDescription(
            `**Server Details:**\n\n` +
            `<:Info2:1305942999850549259> **Server Code:** \`${code}\`\n` +
            `<:general:1305942998596587530> **Language:** ${language}\n` +
            `<:status:1307001706466508902> **Status:** ${status}`
        )
        .addFields(
            { name: '<:dddd:1305969016631726121> __Important Note__', value: 'Please make sure you have read and accepted all server rules before joining.' }
        )
        .setFooter({
            text: 'Berlin RP - Your place for authentic roleplay',
            iconURL: logoURL 
        });
}


client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

     // Member-Objekt definieren
     const member = interaction.member;



     if (commandName === 'testmodal') {
        console.log('testmodal command triggered');

        if (!interaction.member.roles.cache.has(allowedRoleId2)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle('<:xx:1304121069841416316> Missing Permission')
                .setDescription(`It looks like you don't have permission to use this command. Only specific roles are allowed access.`)
                .setFooter({
                    text: 'Thank you for understanding!',
                    iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                });

            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        const modal = new ModalBuilder()
        .setCustomId('test_modal')
        .setTitle('Test Modal')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('test_input')
                    .setLabel('Dein Testtext')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Gib etwas ein...')
                    .setRequired(true)
            )
        );

    await interaction.showModal(modal);
}

client.on('interactionCreate', async (interaction) => {
    if (interaction.isModalSubmit() && interaction.customId === 'test_modal') {
        const userInput = interaction.fields.getTextInputValue('test_input');
        await interaction.reply({ content: `Du hast eingegeben: ${userInput}`, ephemeral: true });
    }
});

    if (commandName === 'ticket') {
        console.log('ticket command triggered');

        if (!interaction.member.roles.cache.has(allowedRoleId2)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle('<:xx:1304121069841416316> Missing Permission')
                .setDescription(`It looks like you don't have permission to use this command. Only specific roles are allowed access.`)
                .setFooter({
                    text: 'Thank you for understanding!',
                    iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                });

            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(0xADD8E6)
            .setTitle('<:ticketnew:1305939312810135612> Ticket Panel')
            .setDescription('Use the buttons below to open a ticket according to your needs.\n\n**Acknowledgements**\n>>> <:punkt:1304144927940284416> Do not spam open tickets.\n<:punkt:1304144927940284416> Do not spam ping staff.\n<:punkt:1304144927940284416> Make sure you specify your reason in detail.')
            .setFooter({ text: "Copyright © BRP 2024" });

        

        const ticket = new ActionRowBuilder().addComponents(ticketSelectMenu);

        await interaction.reply({
            embeds: [embed],
            components: [ticket],
            ephemeral: false
        });
    }

    if (commandName === 'changelogo') {
        console.log('changelogo command triggered');

        if (!interaction.member.roles.cache.has(allowedRoleId2)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle('<:xx:1304121069841416316> Missing Permission')
                .setDescription(`It looks like you don't have permission to use this command. Only specific roles are allowed access.`)
                .setFooter({
                    text: 'Thank you for understanding!',
                    iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                });

            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        const logo = options.getString('logo'); // Hole den Logo-Link aus den Optionen
        if (!logo) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Fehler')
                .setDescription('No valid logo link provided. Please provide a valid URL for the logo.');
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        try {
            // Setze den Avatar des Bots auf das neue Logo
            await client.user.setAvatar(logo);
            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Avatar Changed')
                .setDescription('The bot\'s avatar has been successfully changed!');
            await interaction.reply({ embeds: [successEmbed] });
        } catch (error) {
            console.error('Error while changing avatar:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Fehler')
                .setDescription('There was an error changing the avatar. Please try again later.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }

    if (commandName === 'test1') {
        if (commandName === 'test1') {
            const user = interaction.user;
    
        console.log('test erfolgreich ausgeführt')
    
        const LeonEmbed = new EmbedBuilder() 
        .setColor(0xADD8E6)
        .setTitle('Test Server 1')
        .setDescription(`${user.username}, hat den command`)
        .setFooter({ text: 'Das ist ein test command'});

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
            .setCustomId('Homo')
            .setLabel('Claim')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('<:ban:1303386261888962560>'),

        )
        return interaction.reply({ embeds: [LeonEmbed], components: [row], ephemeral: false });
     }
    }



// Befehl 'createid' – Deaktiviert
if (commandName === 'createid') {
    return interaction.reply({
        content: 'Dieser Befehl wurde vom Entwickler deaktiviert. Er wird in den nächsten Wochen wieder aktiviert.',
        ephemeral: true
    });
}


    if (interaction.commandName === 'invite-user') {
        const targetUser = interaction.options.getUser('user');
        const member = interaction.member;

        // Prüfen, ob der Benutzer einen Kanal hat
        const channelId = activeVoiceChannels.get(member.id);
        if (!channelId) {
            return interaction.reply({
                content: 'Du besitzt keinen privaten Kanal!',
                ephemeral: true,
            });
        }

        const channel = interaction.guild.channels.cache.get(channelId);
        if (!channel) {
            return interaction.reply({
                content: 'Dein Kanal konnte nicht gefunden werden.',
                ephemeral: true,
            });
        }

        // Erlaubnis hinzufügen
        await channel.permissionOverwrites.create(targetUser.id, {
            Connect: true,
        });

        return interaction.reply({
            content: `${targetUser} wurde eingeladen, deinen Kanal zu betreten.`,
            ephemeral: true,
        });
    }

// Befehl 'vehicle', 'warrant', 'record', 'warning', 'license' – Deaktiviert
if (commandName === 'vehicle' || commandName === 'warrant' || commandName === 'record' || commandName === 'warning' || commandName === 'license') {
    return interaction.reply({
        content: 'Dieser Befehl wurde vom Entwickler deaktiviert. Er wird in den nächsten Wochen wieder aktiviert.',
        ephemeral: true
    });
}

// Befehl 'search' – Deaktiviert
if (commandName === 'search') {
    return interaction.reply({
        content: 'Dieser Befehl wurde vom Entwickler deaktiviert. Er wird in den nächsten Wochen wieder aktiviert.',
        ephemeral: true
    });
}

    if (commandName === 'serverinfo') {
        console.log('serverinfo command triggered');
    
        if (!interaction.member.roles.cache.has(allowedRoleId1)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle('<:xx:1304121069841416316> Missing Permission')
                .setDescription(`It looks like you don't have permission to use this command. Only specific roles are allowed access.`)
                .setFooter({
                    text: 'Thank you for understanding!',
                    iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                });
    
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    
        const { guild } = interaction;
        await guild.members.fetch(); // Lädt alle Mitglieder, um korrekte Zählung sicherzustellen
    
        const { name, ownerId, createdTimestamp, memberCount } = guild;
        const icon = guild.iconURL();
        const roles = guild.roles.cache.size;
        const emojis = guild.emojis.cache.size;
        const id = guild.id;
        const channels = guild.channels.cache.size;
        const category = guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory).size;
        const text = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText).size;
        const voice = guild.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).size;
        const announcement = guild.channels.cache.filter((c) => c.type === ChannelType.GuildAnnouncement).size;
        const stage = guild.channels.cache.filter((c) => c.type === ChannelType.GuildStageVoice).size;
        const forum = guild.channels.cache.filter((c) => c.type === ChannelType.GuildForum).size;
        const thread = guild.channels.cache.filter((c) => c.type === ChannelType.GuildPublicThread).size;
        const rolelist = guild.roles.cache.toJSON().join(' ');
        const botCount = guild.members.cache.filter(member => member.user.bot).size;
        const vanity = guild.vanityURLCode || 'No vanity';
        const sticker = guild.stickers.cache.size;
        const highestrole = guild.roles.highest;
        const animated = guild.emojis.cache.filter(emoji => emoji.animated).size;
        const description = guild.description || 'No description';
    
        const splitPascal = (string, separator) => string.split(/(?=[A-Z])/).join(separator);
        const toPascalCase = (string, separator = false) => {
            const pascal = string.charAt(0).toUpperCase() + string.slice(1).toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase());
            return separator ? splitPascal(pascal, separator) : pascal;
        };
        const features = guild.features?.map(feature => `- ${toPascalCase(feature, " ")}`)?.join("\n") || "None";
    
        let baseVerification = guild.verificationLevel;
        baseVerification = ["None", "Low", "Medium", "High", "Very High"][baseVerification] || "None";
    
        const serverinfoembed = new EmbedBuilder()
            .setColor(0xADD8E6)
            .setThumbnail(icon)
            .setAuthor({ name: name, iconURL: icon })
            .setDescription(`${description}`)
            .setFooter({ text: `Server ID: ${id}` })
            .setTimestamp()
            .addFields({ name: "» Date Created", value: `<t:${parseInt(createdTimestamp / 1000)}:R>`, inline: true })
            .addFields({ name: "» Server Owner", value: `<@${ownerId}>`, inline: true })
            .addFields({ name: "» Vanity URL", value: `${vanity}`, inline: true })
            .addFields({ name: "» Member Count", value: `${memberCount - botCount}`, inline: true })
            .addFields({ name: "» Bot Count", value: `${botCount}`, inline: true }) // Korrigierte Bot-Zählung
            .addFields({ name: "» Emoji Count", value: `${emojis}`, inline: true })
            .addFields({ name: "» Animated Emojis", value: `${animated}`, inline: true })
            .addFields({ name: "» Sticker Count", value: `${sticker}`, inline: true })
            .addFields({ name: `» Role Count`, value: `${roles}`, inline: true })
            .addFields({ name: `» Highest Role`, value: `${highestrole}`, inline: true })
            .addFields({ name: "» Verification Level", value: `${baseVerification}`, inline: true })
            .addFields({ name: "» Boost Count", value: `${guild.premiumSubscriptionCount}`, inline: true })
            .addFields({
                name: "» Channels",
                value: `Total: ${channels} | <:Info:1305939309106429972> ${category} | <:textkanal:1305939307634229288> ${text} | <:Info:1305939309106429972> ${voice} | <:Info:1305939309106429972> ${announcement} | <:Info:1305939309106429972> ${stage} | <:message4:1305939298360492102> ${forum} | <:Info:1305939309106429972> ${thread}`,
                inline: false
            })
            .addFields({ name: `» Features`, value: `\`\`\`${features}\`\`\`` });
    
        await interaction.reply({
            embeds: [serverinfoembed],
            ephemeral: true // Antwort ist für alle sichtbar
        });
    }
    
    if (commandName === 'rank') {
        if (commandName === 'rank') {
            const user = interaction.user;
            const userId = user.id;
    
            // Lade Level und XP des Benutzers
            const userLevel = levels[userId] ? levels[userId].level : 1;
            const userXp = levels[userId] ? levels[userId].xp : 0;
    
            // Erstelle das Rank Embed
            const rankEmbed = new EmbedBuilder()
                .setColor(0xADD8E6) // Blau für das Rank Embed
                .setTitle(`<:Member2:1305941789944975360> ${user.tag}'s Rank`)
                .setDescription(`${user.username}, du bist aktuell auf **Level ${userLevel}** mit **${userXp}** XP! <a:krone:1304113900962185246>`)
                .addFields(
                    { name: '<:Info2:1305942999850549259> Maximales Level', value: 'Level 100', inline: true },
                    { name: '<:Info2:1305942999850549259> XP für nächstes Level', value: `${(userLevel + 1) * 100} XP`, inline: true }
                )
                .setThumbnail(user.displayAvatarURL())
                .setImage("https://cdn.discordapp.com/attachments/1252287347782058067/1304115478779793480/testeteete.png?ex=672e37af&is=672ce62f&hm=c0ae52b672be3ab536f6a98f0ce52a647e9b5659c9adb3895efccf95890ce178&")
                .setFooter({
                    text: 'Bleib dran und level weiter!',
                    iconURL: 'https://cdn.discordapp.com/attachments/1193016571115876393/1305585769225650196/pandachrismas.png',
                })
                .setTimestamp();

    
            // Sende das Embed als Antwort
            await interaction.reply({ embeds: [rankEmbed] });
        }
    }

    if (commandName === 'ingame-rules') {
        console.log('ingame-rules command triggered'); // Debugging

        if (!interaction.member.roles.cache.has(allowedRoleId2)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle('<:xx:1304121069841416316> Missing Permission')
                .setDescription(`It looks like you don't have permission to use this command. Only specific roles are allowed access.`)
                .setFooter({
                    text: 'Thank you for understanding!',
                    iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                });

            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(0xADD8E6)
            .setTitle('<:dddd:1305969016631726121> BERLIN RP')
            .setDescription('<:punkt:1304144927940284416> `INGAME RULES`\n <:punkt:1304144927940284416> `INGAME REGELN`')
            .setFooter({
                text: 'We reserve the right to change the rules at any time without prior notice!｜Copyright © BRP 2024',
                iconURL: 'https://cdn.discordapp.com/attachments/1193016571115876393/1305585769225650196/pandachrismas.png'
            })
            .setImage(logoURL);

        const rowDeutsch = new ActionRowBuilder().addComponents(selectMenuDeutsch);
        const rowEnglish = new ActionRowBuilder().addComponents(selectMenuEnglish);

        await interaction.reply({
            embeds: [embed],
            components: [rowDeutsch, rowEnglish],
            ephemeral: false
        });
    }

    if (commandName === 'clear') {
        const amount = interaction.options.getInteger('amount');
        
        
        if (!interaction.member.roles.cache.has(allowedRoleId1)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle('<:xx:1304121069841416316> Missing Permission')
                .setDescription(`It looks like you don't have permission to use this command. Only specific roles are allowed access.`)
                .setFooter({
                    text: 'Thank you for understanding!',
                    iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                });
    
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Check if the amount is valid (between 1 and 100)
        if (isNaN(amount) || amount < 1 || amount > 100) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000) // Red for error
                .setTitle('❌ Error')
                .setDescription('Please provide a valid number of messages to delete (1 to 100).');
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Fetch and delete messages
        try {
            const messages = await interaction.channel.messages.fetch({ limit: amount + 1 }); // +1 to delete the command message itself
            await interaction.channel.bulkDelete(messages, true);

            const successEmbed = new EmbedBuilder()
                .setColor(0xADD8E6) // Green for success
                .setTitle('<:Verified:1305132264329314335> Success')
                .setDescription(`Successfully deleted \`${amount}\` message(s)!`);
            return interaction.reply({ embeds: [successEmbed] });
        } catch (err) {
            console.error('Error deleting messages:', err);
            const errorEmbed = new EmbedBuilder()
                .setColor(0xADD8E6) // Red for error
                .setTitle('<:xx:1304121069841416316> Error')
                .setDescription('There was an issue deleting the messages.');
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }

    if (commandName === 'server-rules') {
        console.log('server-rules command triggered'); // Debugging

        if (!interaction.member.roles.cache.has(allowedRoleId2)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle('<:xx:1304121069841416316> Missing Permission')
                .setDescription(`It looks like you don't have permission to use this command. Only specific roles are allowed access.`)
                .setFooter({
                    text: 'Thank you for understanding!',
                    iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                });

            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const embed = new EmbedBuilder()
        .setColor(0xADD8E6)
        .setTitle('<:dddd:1305969016631726121> BERLIN RP')
        .setDescription('<:punkt:1304144927940284416> `SERVER RULES`\n <:punkt:1304144927940284416> `SERVER REGELN`')
        .setFooter({
            text: 'We reserve the right to change the rules at any time without prior notice!｜Copyright © BRP 2024',
            iconURL: 'https://cdn.discordapp.com/attachments/1193016571115876393/1305585769225650196/pandachrismas.png'
        })
        .setImage(logoURL);

    const rowDeutsch2 = new ActionRowBuilder().addComponents(selectMenuDeutsch2);
    const rowEnglish2 = new ActionRowBuilder().addComponents(selectMenuEnglish2);

        await interaction.reply({
            embeds: [embed],
            components: [rowDeutsch2, rowEnglish2],
            ephemeral: false
        });
    }
    
      // Shift Panel 1
      if (commandName === 'shiftpanel1') {
        const embed = new EmbedBuilder()
            .setColor(0x7289DA)
            .setTitle('🚀 Shift Panel 1')
            .setDescription('Nutze die untenstehenden Buttons, um deine Schicht zu **starten**, **pausieren**, **beenden** oder um **Informationen** zu erhalten.')
            .setThumbnail('https://example.com/logo.png')
            .setFooter({ text: 'BRP | Shift Manager', iconURL: 'https://example.com/icon.png' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('startShift1')
                    .setLabel('🚦 Starten')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('pauseShift1')
                    .setLabel('⏸️ Pause')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('endShift1')
                    .setLabel('🛑 Beenden')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('infoShift1')
                    .setLabel('ℹ️ Info')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }

    // Shift Panel 2
    if (commandName === 'shiftpanel2') {
        const embed = new EmbedBuilder()
            .setColor(0x7289DA)
            .setTitle('🚀 Shift Panel 2')
            .setDescription('Nutze die untenstehenden Buttons, um deine Schicht zu **starten**, **pausieren**, **beenden** oder um **Informationen** zu erhalten.')
            .setThumbnail('https://example.com/logo.png')
            .setFooter({ text: 'BRP | Shift Manager', iconURL: 'https://example.com/icon.png' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('startShift2')
                    .setLabel('🚦 Starten')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('pauseShift2')
                    .setLabel('⏸️ Pause')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('endShift2')
                    .setLabel('🛑 Beenden')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('infoShift2')
                    .setLabel('ℹ️ Info')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }

    // Shift Panel 3
    if (commandName === 'shiftpanel3') {
        const embed = new EmbedBuilder()
            .setColor(0x7289DA)
            .setTitle('🚀 Shift Panel 3')
            .setDescription('Nutze die untenstehenden Buttons, um deine Schicht zu **starten**, **pausieren**, **beenden** oder um **Informationen** zu erhalten.')
            .setThumbnail('https://example.com/logo.png')
            .setFooter({ text: 'BRP | Shift Manager', iconURL: 'https://example.com/icon.png' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('startShift3')
                    .setLabel('🚦 Starten')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('pauseShift3')
                    .setLabel('⏸️ Pause')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('endShift3')
                    .setLabel('🛑 Beenden')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('infoShift3')
                    .setLabel('ℹ️ Info')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }

    // Shift Panel 4
    if (commandName === 'shiftpanel4') {
        const embed = new EmbedBuilder()
            .setColor(0x7289DA)
            .setTitle('🚀 Shift Panel 4')
            .setDescription('Nutze die untenstehenden Buttons, um deine Schicht zu **starten**, **pausieren**, **beenden** oder um **Informationen** zu erhalten.')
            .setThumbnail('https://example.com/logo.png')
            .setFooter({ text: 'BRP | Shift Manager', iconURL: 'https://example.com/icon.png' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('startShift4')
                    .setLabel('🚦 Starten')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('pauseShift4')
                    .setLabel('⏸️ Pause')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('endShift4')
                    .setLabel('🛑 Beenden')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('infoShift4')
                    .setLabel('ℹ️ Info')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }

    if (commandName === 'warn') {
        console.log('warn command triggered'); // Debugging

        if (!interaction.member.roles.cache.has(allowedRoleId2) && !interaction.member.roles.cache.has(teamleitung) && !interaction.member.roles.cache.has(serverleitung)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle('<:xx:1304121069841416316> Missing Permission')
                .setDescription(`It looks like you don't have permission to use this command. Only specific roles are allowed access.`)
                .setFooter({
                    text: 'Thank you for understanding!',
                    iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                });
        
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const user = options.getMember('user');
        const reason = options.getString('reason');
        const timestamp = new Date();

        if (!warns[user.id]) warns[user.id] = [];
        warns[user.id].push({
            reason,
            date: timestamp.toLocaleString(),
            warnedBy: interaction.user.tag,
        });
        saveWarns();

        const warnEmbed = new EmbedBuilder()
            .setColor(0xADD8E6)
            .setTitle('<:warnung:1305942995174162523> Warning Added!')
            .setDescription(`<:Member2:1305941789944975360> - ${user} has been **warned**.`)
            .setThumbnail(user.user.displayAvatarURL({ dynamic: true, size: 1024 }))
            .addFields(
                { name: '<:dddd:1305969016631726121> **Reason**', value: reason },
                { name: '<:Time:1306301542126719017> **Timestamp**', value: timestamp.toLocaleString() },
                { name: '<:moderator:1305939310968569948> **Warned By**', value: interaction.user.tag }
            )
            .setImage("https://cdn.discordapp.com/attachments/1252287347782058067/1304115478779793480/testeteete.png?ex=672e37af&is=672ce62f&hm=c0ae52b672be3ab536f6a98f0ce52a647e9b5659c9adb3895efccf95890ce178&");

        await interaction.reply({ embeds: [warnEmbed] });

        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel) {
            const logWarnEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle('<:warnung:1305942995174162523> Warning Added!')
                .setThumbnail(user.user.displayAvatarURL({ dynamic: true, size: 1024 }))
                .addFields(
                    { name: '<:Member2:1305941789944975360> **User**', value: user.user.tag },
                    { name: '<:dddd:1305969016631726121> **Reason**', value: reason },
                    { name: '<:moderator:1305939310968569948> **Warned By**', value: interaction.user.tag },
                    { name: '<:Time:1306301542126719017> **Timestamp**', value: timestamp.toLocaleString() }
                )
                .setImage("https://cdn.discordapp.com/attachments/1252287347782058067/1304115478779793480/testeteete.png?ex=672e37af&is=672ce62f&hm=c0ae52b672be3ab536f6a98f0ce52a647e9b5659c9adb3895efccf95890ce178&");

            await logChannel.send({ embeds: [logWarnEmbed] });
        }
        
    } else if (commandName === 'remove-warn') {
        console.log('remove-warn command triggered'); // Debugging

        if (!interaction.member.roles.cache.has(allowedRoleId2) && !interaction.member.roles.cache.has(teamleitung)  && !interaction.member.roles.cache.has(serverleitung)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle('<:xx:1304121069841416316> Missing Permission')
                .setDescription(`It looks like you don't have permission to use this command. Only specific roles are allowed access.`)
                .setFooter({
                    text: 'Thank you for understanding!',
                    iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                });

            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const user = options.getMember('user');
        const warningNumber = options.getString('warning_number');

        if (!warns[user.id] || warns[user.id].length === 0) {
            return interaction.reply({ content: 'This user has no warnings.', ephemeral: true });
        }

        const logChannel = interaction.guild.channels.cache.get(logChannelId);

        if (warningNumber === 'all') {
            const warnCount = warns[user.id].length;
            warns[user.id] = [];
            saveWarns();

            const removeAllWarnEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle('<:Verified:1305132264329314335> All Warnings Removed!')
                .setThumbnail(user.user.displayAvatarURL({ dynamic: true, size: 1024 }))
                .setDescription(`<:delete:1305968687253028935> - All **${warnCount}** warnings from ${user} have been removed.`);
            await interaction.reply({ embeds: [removeAllWarnEmbed] });

            // Send log message for removing all warnings
            if (logChannel) {
                const logRemoveAllWarnEmbed = new EmbedBuilder()
                    .setColor(0xADD8E6)
                    .setTitle('<:Verified:1305132264329314335> All Warnings Removed!')
                    .setThumbnail(user.user.displayAvatarURL({ dynamic: true, size: 1024 }))
                    .addFields(
                        { name: '<:Member2:1305941789944975360> **User**', value: user.user.tag },
                        { name: '<:moderator:1305939310968569948> **Removed By**', value: interaction.user.tag },
                        { name: '<:Warning:1305942995174162523> **Warnings Removed**', value: `${warnCount} warnings` }
                    )
                    .setImage("https://cdn.discordapp.com/attachments/1252287347782058067/1304115478779793480/testeteete.png?ex=672e37af&is=672ce62f&hm=c0ae52b672be3ab536f6a98f0ce52a647e9b5659c9adb3895efccf95890ce178&");
                await logChannel.send({ embeds: [logRemoveAllWarnEmbed] });
            }

        } else {
            const index = parseInt(warningNumber) - 1;
            if (isNaN(index) || index < 0 || index >= warns[user.id].length) {
                return interaction.reply({ content: 'Invalid warning number.', ephemeral: true });
            }
            const removedWarn = warns[user.id].splice(index, 1);
            saveWarns();

            const removeWarnEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle('<:Verified:1305132264329314335> Warning Removed!')
                .setThumbnail(user.user.displayAvatarURL({ dynamic: true, size: 1024 }))
                .setDescription(`<:delete:1305968687253028935> - **Warning ${warningNumber}** from ${user} has been removed.`)
                .addFields(
                    { name: '<:dddd:1305969016631726121> **Reason**', value: removedWarn[0].reason },
                    { name: '<:Time:1306301542126719017> **Timestamp**', value: removedWarn[0].date }
                )
                .setImage("https://cdn.discordapp.com/attachments/1252287347782058067/1304115478779793480/testeteete.png?ex=672e37af&is=672ce62f&hm=c0ae52b672be3ab536f6a98f0ce52a647e9b5659c9adb3895efccf95890ce178&");
            await interaction.reply({ embeds: [removeWarnEmbed] });

            // Send log message for removing a specific warning
            if (logChannel) {
                const logRemoveWarnEmbed = new EmbedBuilder()
                    .setColor(0xADD8E6)
                    .setTitle('<:Verified:1305132264329314335> Warning Removed!')
                    .setThumbnail(user.user.displayAvatarURL({ dynamic: true, size: 1024 }))
                    .addFields(
                        { name: '<:Member2:1305941789944975360> **User**', value: user.user.tag },
                        { name: '<:moderator:1305939310968569948> **Removed By**', value: interaction.user.tag },
                        { name: '<:Warning:1305942995174162523> **Warning Number**', value: warningNumber },
                        { name: '<:dddd:1305969016631726121> **Reason**', value: removedWarn[0].reason },
                        { name: '<:Time:1306301542126719017> **Timestamp**', value: removedWarn[0].date }
                    )
                    .setImage("https://cdn.discordapp.com/attachments/1252287347782058067/1304115478779793480/testeteete.png?ex=672e37af&is=672ce62f&hm=c0ae52b672be3ab536f6a98f0ce52a647e9b5659c9adb3895efccf95890ce178&");
                await logChannel.send({ embeds: [logRemoveWarnEmbed] });
            }
        }
    } else if (commandName === 'warns') {

        console.log('warns command triggered'); // Debugging

        if (!interaction.member.roles.cache.has(allowedRoleId2) && !interaction.member.roles.cache.has(teamleitung) && !interaction.member.roles.cache.has(serverleitung)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle('<:xx:1304121069841416316> Missing Permission')
                .setDescription(`It looks like you don't have permission to use this command. Only specific roles are allowed access.`)
                .setFooter({
                    text: 'Thank you for understanding!',
                    iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                });

            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const user = options.getMember('user');
        const userWarns = warns[user.id] || [];
        const warnList = userWarns.map((warn, index) => `**${index + 1}. Warn/s  **<:dddd:1305969016631726121> **Reason:** ${warn.reason}\n <:Time:1306301542126719017> **Time:** ${warn.date}\n <:moderator:1305939310968569948> **Warned By:** ${warn.warnedBy}`).join('\n') || 'This user has no warnings.';

        const showWarnEmbed = new EmbedBuilder()
            .setColor(0xADD8E6)
            .setTitle(`<:warnung:1305942995174162523> Warnings for ${user.user.tag}`)
            .setThumbnail(user.user.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setDescription(warnList)
            .setImage("https://cdn.discordapp.com/attachments/1252287347782058067/1304115478779793480/testeteete.png?ex=672e37af&is=672ce62f&hm=c0ae52b672be3ab536f6a98f0ce52a647e9b5659c9adb3895efccf95890ce178&");
            return interaction.reply({ embeds: [showWarnEmbed], ephemeral: true });
    }

    else if (commandName === 'robloxinfo') {
        const username = interaction.options.getString('username');
    
        // Überprüfe, ob der Benutzername null oder leer ist
        if (!username) {
            return interaction.reply({ content: 'Bitte gib einen Roblox-Benutzernamen an!', ephemeral: true });
        }
    
        try {
            const userId = await noblox.getIdFromUsername(username);
            const userInfo = await noblox.getPlayerInfo(userId);
            const userThumbnail = await noblox.getPlayerThumbnail([userId], '720x720', 'png', false, 'body');
    
            const robloxEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle(`${userInfo.username} (${userId})`)
                .setThumbnail(userThumbnail[0].imageUrl)
                .addFields(
                    { name: `Beigetreten`, value: `<t:${Math.floor(new Date(userInfo.joinDate).getTime() / 1000)}:R>` },
                    { name: 'Beschreibung', value: `${userInfo.blurb || 'Keine Beschreibung'}` },
                    { name: `Freunde`, value: `${userInfo.friendCount ?? '0'}` },
                    { name: `Follower`, value: `${userInfo.followerCount ?? '0'}` },
                    { name: `Gebannt`, value: `${userInfo.isBanned ? "✅" : "❌"}` }
                );
    
            await interaction.reply({ embeds: [robloxEmbed] });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: `There was a problem retrieving the information for \`${username}\`.`, ephemeral: true });
        }
        

    } else if (commandName === 'server') {
        if (!interaction.member.roles.cache.has(allowedRoleId2) && !interaction.member.roles.cache.has(teamleitung)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle('<:xx:1304121069841416316> Missing Permission')
                .setDescription(`It looks like you don't have permission to use this command. Only specific roles are allowed access.`)
                .setFooter({
                    text: 'Thank you for understanding!',
                    iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                });
        
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        
            // Server-Nummer aus den Optionen abrufen
            const serverNumber = interaction.options.getInteger('server_number');
        
            // Server-Daten definieren
            const servers = {
                1: { code: 'ic4qbgv3', language: '🇩🇪 **German**', status: '<:Online:1307001702926520370>' },
                2: { code: '75yeei83', language: '🇩🇪 **German**', status: '<:Online:1307001702926520370>' },
                3: { code: 'ekci4njr', language: '🇬🇧 **English**', status: '<:Online:1307001702926520370>' },
                4: { code: 'coming soon', language: 'no data available!', status: '<:Offline:1307001704604241950>' },
            };
        
            // Server-Details anhand der Nummer abrufen
            const serverDetails = servers[serverNumber];
            if (!serverDetails) {
                return interaction.reply({ content: 'Invalid server number. Please provide a valid number (1, 2, 3, 4).', ephemeral: true });
            }
        
            // Server-Embed erstellen und senden
            const embed = createServerEmbed(serverDetails.code, serverDetails.language, serverDetails.status);
            await interaction.reply({ embeds: [embed] });
        }
});



client.on(Events.GuildAuditLogEntryCreate, async (auditLog, guild) => {
    const { action, executorId, targetId, reason } = auditLog;

    // Warten Sie einige Zeit, um sicherzustellen, dass die Audit-Logs verfügbar sind
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (action === AuditLogEvent.MemberKick) {
        const executor = await guild.client.users.fetch(executorId);
        const kickedUser = await guild.client.users.fetch(targetId);

        console.log(`${kickedUser.tag} was kicked by ${executor.tag}. Reason: ${reason || 'No reason provided'}.`);

        const logChannel = guild.channels.cache.get('1301823060600688681');
        if (logChannel) {
            const kickEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle('<:Verified:1305132264329314335> Member Kicked')
                .addFields(
                    { name: '<:Member2:1305941789944975360> User', value: `<:punkt:1304144927940284416> ${kickedUser.tag}`, inline: true },
                    { name: '<:moderator:1305939310968569948> Moderator', value: `<:punkt:1304144927940284416> ${executor.tag}`, inline: true },
                    { name: '<:dddd:1305969016631726121> Reason', value: reason || 'No reason provided', inline: false }
                )
                .setThumbnail(kickedUser.displayAvatarURL())
                .setTimestamp()
                .setFooter({ text: 'Kick Event logged', iconURL: guild.client.user.displayAvatarURL() });

            await logChannel.send({ embeds: [kickEmbed] });
        }
    } else if (action === AuditLogEvent.MemberBanAdd) {
        const executor = await guild.client.users.fetch(executorId);
        const bannedUser = await guild.client.users.fetch(targetId);

        console.log(`${bannedUser.tag} was banned by ${executor.tag}. Reason: ${reason || 'No reason provided'}.`);

        const logChannel = guild.channels.cache.get('1301823060600688681');
        if (logChannel) {
            const banEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle('<:Verified:1305132264329314335> Member Banned')
                .addFields(
                    { name: '<:Member2:1305941789944975360> User', value: `<:punkt:1304144927940284416> ${bannedUser.tag}`, inline: true },
                    { name: '<:moderator:1305939310968569948> Executed By', value: `<:punkt:1304144927940284416> ${executor.tag}`, inline: true },
                    { name: '<:dddd:1305969016631726121> Reason', value: reason || 'No reason provided', inline: false }
                )
                .setThumbnail(bannedUser.displayAvatarURL())
                .setTimestamp()
                .setFooter({ text: 'Ban Event logged', iconURL: guild.client.user.displayAvatarURL() });

            await logChannel.send({ embeds: [banEmbed] });
        }
    }
});


client.on('messageDelete', async (message) => {
    if (message.partial) return;

    const logChannel = message.guild.channels.cache.get('1301823060600688681'); // Replace with your log channel ID
    if (!logChannel) {
        console.error('Log channel not found.');
        return;
    }

    const fetchedLogs = await message.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MessageDelete,
    }).catch(console.error);

    const deletionLog = fetchedLogs?.entries.first();
    let executor = 'Unknown'; // Default value
    if (deletionLog) {
        const { executor: user, target } = deletionLog;
        if (target.id === message.author.id) {
            executor = user.tag;
        }
    }

    // Nachrichtentext oder Standardwert
    const messageContent = message.content || 'No content';

    // Verarbeitung von Embeds
    let embedContent = 'No embeds';
    if (message.embeds.length > 0) {
        embedContent = message.embeds.map((embed, index) => {
            return `**Embed ${index + 1}:**\n` +
                   `**Title:** ${embed.title || 'No title'}\n` +
                   `**Description:** ${embed.description || 'No description'}\n` +
                   `**Fields:** ${embed.fields.length > 0 ? embed.fields.map(field => `\n- ${field.name}: ${field.value}`).join('') : 'No fields'}`;
        }).join('\n\n');
    }

    // Verarbeitung von Anhängen (z. B. Bilder oder Dateien)
    let attachmentLinks = 'No attachments';
    if (message.attachments.size > 0) {
        attachmentLinks = message.attachments.map(attachment => attachment.url).join('\n');
    }

    // Sonderfall: Wenn nur ein Bild/Anhang ohne Text oder Embeds gelöscht wurde
    const hasOnlyAttachments = !message.content && message.embeds.length === 0 && message.attachments.size > 0;

    const deleteEmbed = new EmbedBuilder()
        .setTitle('<:delete:1305968687253028935> Message Deleted')
        .setColor(0xADD8E6)
        .addFields(
            { name: '<:Member2:1305941789944975360> Author', value: message.author?.tag || 'Unknown Author', inline: true },
            { name: '<:textkanal:1305939307634229288> Channel', value: message.channel?.name || 'Unknown Channel', inline: true },
            { name: '<:message3:1305939299459403827> Content', value: hasOnlyAttachments ? 'Only attachments' : messageContent, inline: false },
            { name: '<:embed:1305939299459403827> Embeds', value: embedContent, inline: false },
            { name: '<:attachment:1305968687253028935> Attachments', value: attachmentLinks, inline: false }
        )
        .setFooter({ text: 'Message Deleted Event logged', iconURL: message.guild.client.user.displayAvatarURL() })
        .setThumbnail(message.author?.displayAvatarURL() || '')
        .setTimestamp();

    logChannel.send({ embeds: [deleteEmbed] }).catch(console.error);
});





client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const { customId, member, guild, message } = interaction;

    if (customId === 'support_case_takeover') {
        const waitingRoomChannelId = '1297978289264263168'; // Der Wartekanal
        const supportChannels = [
            '1297978291512147989', // Kanal 1
            '1297978340816453683', // Kanal 2
            '1303230662374854667', // Kanal 3
            '1303230716301148160'  // Kanal 4
        ];

        // Leeren Support-Kanal finden
        let availableChannel = null;
        for (const channelId of supportChannels) {
            const channel = guild.channels.cache.get(channelId);
            if (channel instanceof VoiceChannel && channel.members.size === 0) {
                availableChannel = channel;
                break;
            }
        }

        if (!availableChannel) {
            // Kein leerer Kanal gefunden
            return interaction.reply({
                content: "Du kannst den Support-Fall nicht übernehmen, da alle Sprachkanäle besetzt sind. Bitte warte!",
                ephemeral: true
            });
        }

        try {
            // Finde den Benutzer im Wartekanal, aber ignoriere den Bot
            const waitingUser = guild.members.cache.find(m => m.voice.channelId === waitingRoomChannelId && !m.user.bot);
            if (!waitingUser) {
                return interaction.reply({
                    content: "Es gibt keinen Benutzer im Wartekanal, der Hilfe benötigt.",
                    ephemeral: true
                });
            }

            // Verschiebe den Benutzer in den freien Support-Kanal
            await waitingUser.voice.setChannel(availableChannel);

            // Generiere eine zufällige Case-ID
            const caseId = `#S-RP${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

            // Hole das Embed der ursprünglichen Nachricht
            const embedMessage = message;

            // Erstelle ein neues Embed und kopiere die Felder, aber bearbeite den Supporter
            const updatedEmbed = new EmbedBuilder(embedMessage.embeds[0].toJSON())
                .setTitle('<:ddddddd:1307032329755168860> **SUPPORT FALL ÜBERNOMMEN**')  // Titel aktualisieren
                .setFields(embedMessage.embeds[0].fields.map(field => {
                    if (field.name === '<:Member2:1305941789944975360> Supporter') {
                        return { name: field.name, value: `<@${member.user.id}>`, inline: true };  // Supporter wird markiert
                    }
                    if (field.name === '<:rrrrr:1307021476209360979> Kanal') {
                        return { name: field.name, value: `<#${availableChannel.id}>`, inline: true };  // Kanal wird als Erwähnung angezeigt
                    }
                    return field;
                }));

            // Entferne die Beschreibung oder setze sie auf einen leeren String
            updatedEmbed.setDescription(null);  // Leert die Beschreibung oder setze sie auf null

            // Bearbeite die Nachricht mit dem neuen Embed
            await embedMessage.edit({ embeds: [updatedEmbed] });

            // Button deaktivieren, aber weiterhin anzeigen
            const disabledButton = new ButtonBuilder()
                .setCustomId('support_case_takeover')
                .setEmoji('<:Verified:1305132264329314335>') 
                .setLabel('Übernommen')
                .setStyle(ButtonStyle.Secondary)  // Grauer Button
                .setDisabled(true);  // Deaktiviert den Button

            const actionRow = new ActionRowBuilder().addComponents(disabledButton);

            // Bearbeite die Nachricht erneut, um den Button zu deaktivieren
            await embedMessage.edit({ components: [actionRow] });

            // Bestätige die Übernahme für den Supporter
            await interaction.reply({
                content: `Du hast den Support-Fall erfolgreich übernommen, ${member.user.tag}.`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Fehler beim Verschieben des Benutzers oder Bearbeiten des Embeds:', error);
            await interaction.reply({
                content: "Es gab einen Fehler beim Verschieben des Benutzers oder Bearbeiten des Support-Falls. Versuche es später erneut.",
                ephemeral: true
            });
        }
    }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    const voiceChannelId = '1297978289264263168'; // Wartekanal
    const textChannelId = '1297978300668317797'; // Logkanal
    const roleId = '1297978184918241321'; // ID der zu markierenden Rolle

    // Liste der Musik-URLs, die der Bot zufällig abspielt
    const musicUrls = [
        'https://youtu.be/HoVWmW0Zdmo?si=4duKhu9A3OITX3vO',  // Beispiel-Link 1
        'https://youtu.be/3ntWT2E6INQ?si=IYf7261TNFtM9IiS',  // Neuer Musik-Link
        'https://youtu.be/pWZAskDksjg?si=zWLjh1zKH9JC8YtI'   // Neuer Musik-Link
    ];

    // Benutzer betritt den Wartekanal
    if (newState.channelId === voiceChannelId && !newState.member.user.bot) { // Ignoriere den Bot
        const userId = newState.member.id;

        // Loggen, dass der Benutzer den Wartekanal betreten hat
        console.log(`Benutzer ${userId} hat den Wartekanal betreten.`);

        const channel = newState.guild.channels.cache.get(newState.channelId);

        if (channel instanceof VoiceChannel) {
            try {
                // Musik abspielen: Zufällige URL aus der Liste auswählen
                await client.distube.voices.join(channel);
                console.log('Bot hat dem Sprachkanal beigetreten und spielt Musik.');

                // Zufällige Musik aus der Liste auswählen
                const randomMusic = musicUrls[Math.floor(Math.random() * musicUrls.length)];

                await client.distube.play(channel, randomMusic);
                await client.distube.setRepeatMode(channel, 2); // Wiederhole das Lied

                // Embed senden
                const logChannel = newState.guild.channels.cache.get(textChannelId);
                if (logChannel) {
                    const caseId = `#S-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
                    const embed = new EmbedBuilder()
                        .setColor(0xADD8E6)
                        .setTitle('<:ddddddd:1307032329755168860> **NEUER SUPPORT FALL**')
                        .setDescription(`<@${userId}> benötigt Hilfe`)
                        .addFields(
                            { name: '<:Member2:1305941789944975360> Supporter', value: '-', inline: true },
                            { name: '<:cccc:1307021474837561535> Case-ID', value: caseId, inline: true },
                            { name: '<:Time:1306301542126719017> Zeitpunkt', value: new Date().toLocaleString('de-DE'), inline: true },
                            { name: '<:rrrrr:1307021476209360979> Kanal', value: '-', inline: true },
                        )
                        .setFooter({ text: 'BERLIN RP', iconURL: client.user.displayAvatarURL() });

                    const button = new ButtonBuilder()
                        .setCustomId('support_case_takeover')
                        .setEmoji('<:Verified:1305132264329314335>') 
                        .setLabel('Support Fall übernehmen')
                        .setStyle(ButtonStyle.Secondary);

                    const actionRow = new ActionRowBuilder().addComponents(button);

                    await logChannel.send({
                        content: `<@&${roleId}>`,
                        embeds: [embed],
                        components: [actionRow]
                    });

                    console.log(`Support-Embed für Benutzer ${userId} gesendet.`);
                }
            } catch (error) {
                console.error('Fehler beim Beitreten des Sprachkanals und beim Abspielen der Musik:', error);
            }
        }
    }

    // Benutzer verlässt den Wartekanal
    if (oldState.channelId === voiceChannelId && newState.channelId !== voiceChannelId) {
        const channel = oldState.guild.channels.cache.get(oldState.channelId);

        if (channel instanceof VoiceChannel) {
            // Keine Aktion nötig, Benutzer wird nicht dauerhaft gespeichert
            console.log(`Benutzer ${oldState.member.id} hat den Wartekanal verlassen.`);
        }
    }

    // Der Bot verlässt den Kanal, wenn alle anderen Benutzer gegangen sind
    if (oldState.channelId === voiceChannelId && newState.channelId !== voiceChannelId) {
        const channel = oldState.guild.channels.cache.get(oldState.channelId);

        if (channel instanceof VoiceChannel) {
            // Wenn der Bot der einzige ist, der noch im Kanal ist
            if (channel.members.size === 1 && channel.members.has(client.user.id)) {
                try {
                    await client.distube.voices.get(oldState.guild.id)?.leave();
                    console.log('Bot hat den Sprachkanal verlassen, weil niemand anderes mehr da war.');
                } catch (error) {
                    console.error('Fehler beim Verlassen des Sprachkanals:', error);
                }
            }
        }
    }
});


const activeVoiceChannels = new Map(); // Speichert benutzerdefinierte Kanäle

client.on('voiceStateUpdate', async (oldState, newState) => {
    const targetChannelId = '1313922082458959872'; // ID des Ziel-Sprachkanals

    // Benutzer tritt dem Zielkanal bei
    if (newState.channelId === targetChannelId && !oldState.channelId) {
        const guild = newState.guild;
        const member = newState.member;

        // Prüfen, ob der Benutzer bereits einen Kanal hat
        if (activeVoiceChannels.has(member.id)) {
            const existingChannel = activeVoiceChannels.get(member.id);
            await member.voice.setChannel(existingChannel);
            return;
        }

        // Erstellen eines neuen Kanals
        const privateChannel = await guild.channels.create({
            name: `${member.user.username}'s Room`,
            type: ChannelType.GuildVoice,
            parent: newState.channel.parentId, // Im gleichen Kategorieordner wie der Hauptkanal
            permissionOverwrites: [
                {
                    id: guild.id, // Standardrollen
                    deny: [PermissionsBitField.Flags.Connect],
                },
                {
                    id: member.id, // Benutzerrolle
                    allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ManageChannels],
                },
            ],
        });

        // Benutzer in den neuen Kanal verschieben
        await member.voice.setChannel(privateChannel);

        // Kanal speichern
        activeVoiceChannels.set(member.id, privateChannel.id);
    }

    // Benutzer verlässt einen Kanal
    if (oldState.channelId && !newState.channelId) {
        const emptyChannel = oldState.guild.channels.cache.get(oldState.channelId);

        // Prüfen, ob es ein benutzerdefinierter Kanal ist und ob er leer ist
        if (emptyChannel && [...activeVoiceChannels.values()].includes(emptyChannel.id) && emptyChannel.members.size === 0) {
            activeVoiceChannels.forEach((channelId, userId) => {
                if (channelId === emptyChannel.id) {
                    activeVoiceChannels.delete(userId); // Kanal aus Map entfernen
                }
            });

            await emptyChannel.delete().catch(console.error); // Kanal löschen
        }
    }
});



// Interaktionen für test7 und test8
client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu()) return;

    let newEmbed;

    // Überprüfe die Custom ID des Auswahlmenüs
    if (interaction.customId === 'select_test_de') {
        // Deutsche Auswahl
        if (interaction.values[0] === 'test_1_de') {
            newEmbed = new EmbedBuilder()
            .setColor(0xADD8E6)
            .setTitle('Regelwerk für Rollenspiel-Sitzungen')
            .addFields(
                { name: '§1 __Voiding / Szenen löschen__', value: 'Szenen können von Moderatoren aus verschiedenen Gründen gelöscht werden. Sobald eine Szene gelöscht wurde, darf sich der eigene Charakter nicht mehr an die besagte Szene erinnern.\n\n<:punkt:1304144927940284416>  Eine Nichtbeachtung dieser Regel wird mit einer Verwarnung geahndet.' },
                { name: '§2 __Betreten von Jobs ohne bestandene Bewerbung__', value: 'Um bei der Polizei, der Feuerwehr, dem ADAC oder HVV (Bus- und Taxi-Service) arbeiten zu dürfen, musst du eine Bewerbung auf dem jeweiligen Nebenserver bestehen.\n\n<:punkt:1304144927940284416>  Eine Nichtbeachtung dieser Regel wird mit einer Verwarnung oder gegebenenfalls mit einem Kick moderiert.' },
                { name: '§3 __Protest-RP__', value: 'Proteste und/oder Demonstrationen sind ausschließlich während nicht aktiver Friedenszeiten gestattet. Bei Blockaden mit Fahrzeugen muss der Fahrer vor Ort bleiben, um eine Räumung zu ermöglichen. Reale politische Konflikte dürfen nur in angepasster Form verwendet werden.\n\n<:punkt:1304144927940284416> Das Moderationsteam darf Demonstrationen ohne öffentliche Rechtfertigung auflösen.\n<:punkt:1304144927940284416> Eine Nichteinhaltung dieser Regel wird mit einer Verwarnung oder, wenn nicht sogar, mit einem Kick oder temporären Bann geahndet.' },
                { name: '§4 __Friedenszeiten / Peacetime__', value: 'Während der aktivierten Friedenszeit sind die folgenden Handlungen verboten:\n<:punkt:1304144927940284416> Juwelierraub\n<:punkt:1304144927940284416>  Bankraub\n<:punkt:1304144927940284416>  Container-Schiff Raub\n<:punkt:1304144927940284416>  Geiselnahme\n<:punkt:1304144927940284416>  Waffenbesitz\n<:punkt:1304144927940284416>  Angriffe auf andere Spieler\n<:punkt:1304144927940284416>  Widersetzungen gegen polizeiliche Anweisungen\n<:punkt:1304144927940284416>  Tresor-Raub bei Erwin\'s Club\n<:punkt:1304144927940284416>  Eine Nichtbeachtung dieser Regel führt zu einer Verwarnung oder gegebenenfalls zu einem Kick.' },
                { name: '§5 __RDM (Random Deathmatch)__', value: 'Das Angreifen von Spielern ohne einen vorhergehenden Rollenspiel-Kontext ist verboten.\n\n<:punkt:1304144927940284416> Eine Nichtbeachtung dieser Regel kann mit einer Verwarnung oder in schweren Fällen mit einem Kick vom Server geahndet werden.' },
                { name: '§6 __Adminautos__', value: 'Adminautos dürfen im RP nicht beachtet werden. Ein Adminauto mit aktivierten Lichtern pausiert mit sofortiger Wirkung alle Szenen an dessen Standort. Solltest du Fragen zu Regeln oder Ähnlichem haben, kannst du den Fahrer des Adminautos kontaktieren. Bitte bedenke, dass das Gespräch jedoch außerhalb des Charakters geführt werden muss.\n\n<:punkt:1304144927940284416> Wenn die Admin-Sirene ertönt, sind alle Spieler verpflichtet, den rechten Fahrbahnrand aufzusuchen und kontrolliert zum Halt zu kommen. Ein Adminauto, das dich nicht verfolgt, wird immer versuchen, dich links zu überholen.\n<:punkt:1304144927940284416> Eine Nichtbeachtung dieser Regel wird mit einer Verwarnung oder gegebenenfalls mit einem Kick moderiert.\n<:punkt:1304144927940284416> Das Flüchten vor einem Adminauto kann mit einem temporären Bann geahndet werden.' },
                { name: '§7 __Crash-RP / Unfall-RP__', value: 'Verkehrsunfälle müssen jederzeit nachgespielt werden. Auch bei leichten Unfällen sollte das Fahrzeug zumindest oberflächlich begutachtet werden.\n\n<:punkt:1304144927940284416> Das Fahren eines Autos/Quads mit mehr als zwei kaputten Reifen gilt als fehlendes Crash-RP.\n<:punkt:1304144927940284416> Das Fahren eines Motorrads/Rollers mit jeglicher Anzahl an kaputten Reifen gilt ebenfalls als fehlendes Crash-RP.' },
                { name: '§8 __Hosentaschen-RP__', value: 'Große Gegenstände wie Warnkegel, Leitern, Langwaffen usw. müssen aus einem Kofferraum oder einem Regal, wo solche Gegenstände vermutet werden können, geholt werden.\n\n<:punkt:1304144927940284416> Eine Nichtbeachtung dieser Regel wird mit einer Verwarnung oder gegebenenfalls mit einem Kick moderiert.' },
                { name: '§9 __Fail Roleplay (FRP)__', value: 'Unrealistisches Verhalten ist nicht erlaubt und wird mit einer Verwarnung oder einem Ban vom Server bestraft.\n\n<:punkt:1304144927940284416> OOC (Out of Character) Gespräche gelten ebenfalls als FRP. Wenn nötig, sind sie nur in Klammern erlaubt.\n<:punkt:1304144927940284416> Fehlendes FearRP wird als FRP gewertet.\n<:punkt:1304144927940284416> Metagaming wird ebenfalls als FRP klassifiziert.' },
                { name: '§10 __Unrealistisch schnelles Sterben__', value: 'Das Versterben eines Charakters in unrealistischer Geschwindigkeit ist untersagt.\n\n<:punkt:1304144927940284416> Eine Nichtbeachtung dieser Regel kann als FRP gewertet werden.' },
                { name: '§11 __Combat Logging__', value: 'Combat Logging bezeichnet das Verlassen des Spiels, um Konsequenzen oder Verpflichtungen zu vermeiden. Dies wird mit einer Verwarnung oder möglicherweise mit einem temporären Bann geahndet.\n\n<:punkt:1304144927940284416> Solltest du einen triftigen Grund haben, das Spiel schnell zu verlassen, informiere bitte einen Moderator und liefere, wenn möglich, Beweise.' },
                { name: '§12 __Unrealistische Avatare__', value: 'Avatare, die ein Tier oder einen Gegenstand darstellen, sind in unseren Rollenspiel-Sitzungen verboten.\n\n<:punkt:1304144927940284416> Wir behalten uns das Recht vor, Nutzer aufgrund ihres Avatars aufzufordern, diesen zu ändern.' }
            )
            .setFooter({ text: "Copyright © BRP 2024" });

        } else if (interaction.values[0] === 'test_2_de') {
            newEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle('Geiseln + TOS/Verbot')
                .addFields(
                    { name: '§13 __Play-to-Kill-Regel__', value: 'Szenen wie Raubüberfälle dürfen nicht mit der alleinigen Absicht gestartet werden, andere zu töten oder anzugreifen. Solches Verhalten wird als RDM oder, in schwerwiegenden Fällen, als Terror-RP eingestuft.\n\n<:punkt:1304144927940284416> Die Missachtung dieser Regel kann eine Verwarnung oder einen Bann zur Folge haben.' },
                                    { name: '§14 __Stürmung von Geiselnahmen__', value: 'Geiselnahmen können aus folgenden Gründen von der Polizei gestürmt werden:\n<:punkt:1304144927940284416> keine Einigung nach mehreren Verhandlungsversuchen\n<:punkt:1304144927940284416> dringende Vermutung auf schwere Verletzung oder Tod der Geisel' },
                                    { name: '§15 __Verbotene Waffen__', value: '<:punkt:1304144927940284416> Derzeit sind keine Waffen verboten. Wir behalten uns jedoch das Recht vor, diese Regel jederzeit ohne Vorankündigung zu ändern.' },
                                    { name: '§16 __Forderungen an die Geisel__', value: 'Es ist nicht erlaubt, eine Geisel zu einer Überweisung von Geld zu zwingen.\n\n<:punkt:1304144927940284416> Die Missachtung dieser Regel wird mit einer Verwarnung geahndet.' },
                                    { name: '§17 __Slotted Fahrzeuge__', value: 'Diese Fahrzeuge sind nur dann erlaubt, wenn der Host sie ausdrücklich zulässt:\n<:punkt:1304144927940284416> Porsche 911 / Ferdinand 911 (Normal & Cabriolet)\n<:punkt:1304144927940284416> Porsche Cayenne / Ferdinand Jalapeno' },
                                    { name: '§18 __Maximale Werte für Geiselnahmen__', value: '<:punkt:1304144927940284416> Geiseln: 3\n<:punkt:1304144927940284416> Geldforderungen: 14.000€ (abhängig vom Budget des Polizeidienstes)\n<:punkt:1304144927940284416> Maximal eine Forderung pro Geisel' },
                                    { name: '§19 __Drittparteien in Konfliktszenen__', value: 'In Auseinandersetzungen zwischen zwei Parteien (z. B. Schlägerei oder Schusswechsel) dürfen keine weiteren Parteien eingreifen. Diese Regel gilt nicht für die Polizei.\n\n<:punkt:1304144927940284416> Die Missachtung dieser Regel kann mit einer Verwarnung oder einem temporären Bann geahndet werden.' },
                                    { name: '§20 __Verbotene Fahrzeuge und Waffen__', value: '**16.1 Verbotene Fahrzeuge**\n<:punkt:1304144927940284416>  Derzeit sind keine Fahrzeuge verboten. Wir behalten uns jedoch das Recht vor, diese Regel jederzeit ohne Vorankündigung zu ändern.\n\nVerbotene Fahrzeuge, die in Richtung des Autohauses unterwegs sind, werden im RP ignoriert. Weicht die Route ab, ist ein Moderator zu informieren.' },
                                    { name: '§21 __Fake Geiseln__', value: 'Schein-Geiseln (Fake-Geiseln) sind nicht gestattet.\n\n<:punkt:1304144927940284416> Eine Nichtbeachtung dieser Regel wird mit einer Verwarnung oder gegebenenfalls einem temporären Bann geahndet.' },
                                    { name: '§22 __Wehrlose Parteien__', value: 'Mitarbeiter des ADAC, der Feuerwehr, des Rettungsdienstes sowie der Bus- und LKW-Firmen dürfen nicht als Geiseln genommen werden. Sie müssen dennoch im Rollenspiel Furcht vor Bedrohungen zeigen.\n\n<:punkt:1304144927940284416> Eine Nichtbeachtung dieser Regel kann mit einer Verwarnung oder in schweren Fällen mit einem temporären Bann geahndet werden.' },
                                  { name: '__Hinweis!__', value: 'Wir behalten uns das Recht vor, diese Regeln zu ändern, ohne die Spieler über die Änderungen zu informieren.' }
                                )
                                .setFooter({ text: "Copyright © BRP 2024" });
        } else if (interaction.values[0] === 'test_3_de') {
            newEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle('Definitionen')
                .addFields(
                    { name: '__Terror-RP__', value: '<:punkt:1304144927940284416> Ausspielen von Attentaten oder anderen terroristischen Taten. Beispiele: Bombendrohungen, Angriffe mit Sprengstoff auf andere Personen.' },
                                    { name: '__Suizid-RP__', value: '<:punkt:1304144927940284416> Ausspielen oder Androhung von selbst verletzendem Verhalten.\n*Hinweis: Das Erzwingen solch eines Verhaltens durch Bedrohung kann ebenfalls als Suizid-RP gewertet werden.*' },
                                    { name: '__VDM__', value: '<:punkt:1304144927940284416> "Vehicle Deathmatch"\n<:punkt:1304144927940284416> Absichtliches Anfahren eines Spielers mit einem Fahrzeug, ohne direkt vorausgehendes Rollenspiel.' },
                                    { name: '__Fake-Geisel__', value: '<:punkt:1304144927940284416> Spieler, der als Geisel posiert, sich jedoch im Vorhinein mit den Tätern abgesprochen hat.' },
                                    { name: '__OOC Talk__', value: '<:punkt:1304144927940284416> Sprechen außerhalb des Charakters.' },
                                    { name: '__Meta Gaming__', value: '<:punkt:1304144927940284416> Nutzen von Informationen, die der Charakter aus deren Perspektive nicht wissen kann.' },
                                    { name: '__Geisel__', value: '<:punkt:1304144927940284416> Person, die durch Androhung physischer Gewalt zur Befolgung von Anweisungen gezwungen wird.\n<:punkt:1304144927940284416> Person, deren Leben bedroht wird, um andere Personen dazu zu drängen, Anweisungen zu befolgen (z.B. während Verhandlungen).' },
                                    { name: '__Fear-RP__', value: '<:punkt:1304144927940284416> Schützen des eigenen oder eines fremden Lebens.\n<:punkt:1304144927940284416> Ausspielen von Angst um das eigene oder um ein fremdes Leben.' },
                                    { name: '__NSFW-RP__', value: '<:punkt:1304144927940284416> "Not Safe for Work - Roleplay"\n<:punkt:1304144927940284416> Ausspielen von sexuellen und/oder nicht jugendfreien Inhalten.' },
                                    { name: '__RDM__', value: '<:punkt:1304144927940284416> "Random Deathmatch"\n<:punkt:1304144927940284416> Angriff gegen Spieler ohne direkt vorausgehendes Rollenspiel.' },
                                    { name: '__Gang-RP__', value: '<:punkt:1304144927940284416> Formen einer kriminellen Gruppierung mit vier oder mehr Mitgliedern.' },
                                    { name: '__Combat Logging__', value: '<:punkt:1304144927940284416> Das Verlassen des Spiels während des Kampfes/Situation, um Konsequenzen zu vermeiden.' })
                .setFooter({ text: "Copyright © BRP 2024" });
        }
    } else if (interaction.customId === 'select_test_eng') {
        // Englische Auswahl
        if (interaction.values[0] === 'test_1_eng') {
            newEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle('Rules for Roleplay Sessions')
                .addFields(
                    { name: '§1 __Voiding / Scene Deletion__', value: 'Scenes can be deleted by moderators for various reasons. Once a scene has been deleted, the character must no longer remember the scene in question.\n\n<:punkt:1304144927940284416> Failure to comply with this rule will result in a warning.' },
                                    { name: '§2 __Entering Jobs Without Passing an Application__', value: 'To work with the police, fire department, ADAC, or HVV (bus and taxi service), you must pass an application on the respective side server.\n\n<:punkt:1304144927940284416> Failure to comply with this rule will be moderated with a warning or possibly a kick.' },
                                    { name: '§3 __Protest RP__', value: 'Protests and/or demonstrations are only allowed during non-active peacetime. In the case of blockades with vehicles, the driver must remain on site to facilitate a clearance. Real political conflicts may only be used in an adapted form.\n\n<:punkt:1304144927940284416> The moderation team may dissolve demonstrations without public justification.\n<:punkt:1304144927940284416> Non-compliance with this rule will result in a warning, or potentially a kick or temporary ban.' },
                                    { name: '§4 __Peacetime__', value: 'During active peacetime, the following actions are prohibited:\n<:punkt:1304144927940284416> Jewelry robbery\n<:punkt:1304144927940284416> Bank robbery\n<:punkt:1304144927940284416> Container ship robbery\n<:punkt:1304144927940284416> Hostage-taking\n<:punkt:1304144927940284416> Possession of weapons\n<:punkt:1304144927940284416> Attacks on other players\n<:punkt:1304144927940284416> Resisting police orders\n<:punkt:1304144927940284416> Safe robbery at Erwin\'s Club\n<:punkt:1304144927940284416> Failure to comply with this rule will lead to a warning or possibly a kick.' },
                                    { name: '§5 __RDM (Random Deathmatch)__', value: 'Attacking players without prior roleplay context is prohibited.\n\n<:punkt:1304144927940284416> Non-compliance with this rule may result in a warning or, in severe cases, a kick from the server.' },
                                    { name: '§6 __Admin Vehicles__', value: 'Admin vehicles should not be acknowledged in RP. An admin vehicle with activated lights immediately pauses all scenes at its location. If you have questions about rules or similar, you can contact the driver of the admin vehicle. Please keep in mind that the conversation must be held out of character.\n\n<:punkt:1304144927940284416> When the admin siren sounds, all players are required to pull over to the right side of the road and come to a controlled stop. An admin vehicle that is not pursuing you will always attempt to overtake you on the left.\n<:punkt:1304144927940284416> Failure to comply with this rule will be moderated with a warning or possibly a kick.\n<:punkt:1304144927940284416> Fleeing from an admin vehicle may result in a temporary ban.' },
                                    { name: '§7 __Crash RP / Accident RP__', value: 'Traffic accidents must be roleplayed at all times. Even in minor accidents, the vehicle should be at least superficially inspected.\n\n<:punkt:1304144927940284416> Driving a car/quad with more than two flat tires is considered missing crash RP.\n<:punkt:1304144927940284416> Riding a motorcycle/scooter with any number of flat tires is also considered missing crash RP.' },
                                    { name: '§8 __Pocket RP__', value: 'Large items such as traffic cones, ladders, long weapons, etc., must be retrieved from a trunk or a shelf where such items can be expected.\n\n<:punkt:1304144927940284416> Non-compliance with this rule will be moderated with a warning or possibly a kick.' },
                                    { name: '§9 __Fail Roleplay (FRP)__', value: 'Unrealistic behavior is not allowed and will be punished with a warning or a ban from the server.\n\n<:punkt:1304144927940284416> OOC (Out of Character) conversations are also considered FRP. If necessary, they are only allowed in parentheses.\n<:punkt:1304144927940284416> Missing FearRP will be classified as FRP.\n<:punkt:1304144927940284416> Metagaming is also classified as FRP.' },
                                    { name: '§10 __Unrealistic Speed of Death__', value: 'Dying of a character in an unrealistic timeframe is prohibited.\n\n<:punkt:1304144927940284416> Non-compliance with this rule may be regarded as FRP.' },
                                    { name: '§11 __Combat Logging__', value: 'Combat logging refers to leaving the game to avoid consequences or obligations. This will be punished with a warning or possibly a temporary ban.\n\n<:punkt:1304144927940284416> If you have a valid reason to leave the game quickly, please inform a moderator and provide evidence if possible.' },
                                    { name: '§12 __Unrealistic Avatars__', value: 'Avatars representing animals or objects are prohibited in our roleplay sessions.\n\n<:punkt:1304144927940284416> We reserve the right to ask users to change their avatar due to its appearance.' }
                )
                                    .setFooter({ text: "Copyright © BRP 2024" });

        } else if (interaction.values[0] === 'test_2_eng') {
            newEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle('Hostages + TOS/Bans')
                .addFields(
                    { name: '§13 __Play-to-Kill Rule__', value: 'Scenes such as robberies must not be initiated solely with the intent to kill or attack others. Such behavior is classified as RDM or, in severe cases, as Terror RP.\n\n<:punkt:1304144927940284416> Violation of this rule may result in a warning or a ban.' },
                    { name: '§14 __Storming of Hostage Situations__', value: 'Hostage situations can be stormed by the police for the following reasons:\n<:punkt:1304144927940284416> No agreement after several negotiation attempts\n<:punkt:1304144927940284416> Urgent suspicion of severe injury or death of the hostage.' },
                    { name: '§15 __Prohibited Weapons__', value: '<:punkt:1304144927940284416> Currently, no weapons are prohibited. However, we reserve the right to change this rule at any time without prior notice.' },
                    { name: '§16 __Demands on the Hostage__', value: 'It is not allowed to force a hostage to transfer money.\n\n<:punkt:1304144927940284416> Violation of this rule will result in a warning.' },
                    { name: '§17 __Slotted Vehicles__', value: 'These vehicles are only allowed if explicitly permitted by the host:\n<:punkt:1304144927940284416> Porsche 911 / Ferdinand 911 (Normal & Cabriolet)\n<:punkt:1304144927940284416> Porsche Cayenne / Ferdinand Jalapeno.' },
                    { name: '§18 __Maximum Values for Hostage Situations__', value: '<:punkt:1304144927940284416> Hostages: 3\n<:punkt:1304144927940284416> Monetary demands: €14,000 (depending on the police department\'s budget)\n<:punkt:1304144927940284416> Maximum one demand per hostage.' },
                    { name: '§19 __Third Parties in Conflict Scenes__', value: 'In disputes between two parties (e.g., fights or shootouts), no other parties may intervene. This rule does not apply to the police.\n\n<:punkt:1304144927940284416> Violation of this rule may result in a warning or a temporary ban.' },
                    { name: '§20 __Prohibited Vehicles and Weapons__', value: '**16.1 Prohibited Vehicles**\n<:punkt:1304144927940284416> Currently, no vehicles are prohibited. However, we reserve the right to change this rule at any time without prior notice.\n\nProhibited vehicles traveling toward the dealership will be ignored in RP. If the route deviates, a moderator must be informed.' },
                    { name: '§21 __Fake Hostages__', value: 'Fake hostages are not allowed.\n\n<:punkt:1304144927940284416> Violation of this rule will result in a warning or possibly a temporary ban.' },
                    { name: '§22 __Defenseless Parties__', value: 'Employees of ADAC, the fire department, the rescue service, and bus and truck companies may not be taken hostage. However, they must still show fear of threats in roleplay.\n\n<:punkt:1304144927940284416> Violation of this rule may result in a warning or, in severe cases, a temporary ban.' },
                    { name: '__Note!__', value: 'We reserve the right to change these rules without informing players of the changes.' }
                )

                    .setFooter({ text: "Copyright © BRP 2024" });
                   
              
        } else if (interaction.values[0] === 'test_3_eng') {
            newEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle('Definitions')
                .addFields(
                    { name: '__Terror-RP__', value: '<:punkt:1304144927940284416> Playing out assassinations or other terrorist acts. Examples: bomb threats, explosive attacks on other individuals.' },
                    { name: '__Suicide-RP__', value: '<:punkt:1304144927940284416> Playing out or threatening self-harm behavior.\n*Note: Forcing such behavior through threats can also be considered Suicide-RP.*' },
                    { name: '__VDM__', value: '<:punkt:1304144927940284416> "Vehicle Deathmatch"\n<:punkt:1304144927940284416> Intentionally hitting a player with a vehicle without prior roleplay context.' },
                    { name: '__Fake Hostage__', value: '<:punkt:1304144927940284416> A player posing as a hostage but who has pre-arranged with the perpetrators.' },
                    { name: '__OOC Talk__', value: '<:punkt:1304144927940284416> Communication outside of character.' },
                    { name: '__Meta Gaming__', value: '<:punkt:1304144927940284416> Using information that the character cannot know from their perspective.' },
                    { name: '__Hostage__', value: '<:punkt:1304144927940284416> A person who is forced to comply with instructions under the threat of physical violence.\n<:punkt:1304144927940284416> A person whose life is threatened to coerce others into following orders (e.g., during negotiations).' },
                    { name: '__Fear-RP__', value: '<:punkt:1304144927940284416> Protecting one’s life or the life of others.\n<:punkt:1304144927940284416> Playing out fear for one\'s own life or for the life of others.' },
                    { name: '__NSFW-RP__', value: '<:punkt:1304144927940284416> "Not Safe for Work - Roleplay"\n<:punkt:1304144927940284416> Playing out sexual and/or adult content.' },
                    { name: '__RDM__', value: '<:punkt:1304144927940284416> "Random Deathmatch"\n<:punkt:1304144927940284416> Attacks against players without prior roleplay context.' },
                    { name: '__Gang-RP__', value: '<:punkt:1304144927940284416> Forming a criminal group with four or more members.' },
                    { name: '__Combat Logging__', value: '<:punkt:1304144927940284416> Leaving the game during combat to avoid consequences. This behavior is not allowed and can result in penalties.' }
                )
                .setFooter({ text: "Copyright © BRP 2024" });
        }
    } else if (interaction.customId === 'select_test_de2') {
        if (interaction.values[0] === 'test_1_de2') {
            newEmbed = new EmbedBuilder()
            .setColor(0xADD8E6) // Kräftiges Blau für bessere Sichtbarkeit
            .setTitle('<:Info2:1305942999850549259> - Serverregeln & Informationen')
            .setThumbnail(logoURL)
            .setDescription(
                '**Unsere Regeln**\n\n' +
                '<:punkt:1304144927940284416> **Beachte jederzeit die Nutzungsbedingungen und Community-Richtlinien von Discord.**\n' +
                '[Nutzungsbedingungen](https://dis.gd/terms) | [Community-Richtlinien](https://dis.gd/guidelines)\n\n' +
                '<:punkt:1304144927940284416> **Respektiere alle Nutzer.** Keine Belästigung, kein Trolling, Spamming oder Hassrede. Vermeide kontroverse Themen wie Politik oder Religion.\n\n' +
                '<:punkt:1304144927940284416> **Keine NSFW- oder anstößigen Inhalte** erlaubt, einschließlich Spitznamen, Benutzernamen, Avatare und Status.\n\n' +
                '<:punkt:1304144927940284416> **Selbstwerbung** ist nur in den dafür vorgesehenen Kanälen erlaubt.\n\n' +
                '<:punkt:1304144927940284416> **Bitte halte alle Inhalte nur auf Deutsch und Englisch.**\n\n\n' +
                '*Unsere Moderatoren behalten sich das Recht vor, Regeln je nach Kontext anzupassen oder zu interpretieren. Zusätzliche Regeln können in bestimmten Kanälen gelten—siehe angeheftete Nachrichten oder Kanaltopics, bevor du postest.*\n\n' +
                '<:heart2:1304144905517400106> Vielen Dank, dass du unseren Server zu einem einladenden Ort für alle machst!'
            )
            .setImage("https://cdn.discordapp.com/attachments/1252287347782058067/1304115478779793480/testeteete.png?ex=672e37af&is=672ce62f&hm=c0ae52b672be3ab536f6a98f0ce52a647e9b5659c9adb3895efccf95890ce178&")
            .setFooter({
                text: 'Copyright © BRP 2024',
                iconURL: 'https://cdn.discordapp.com/attachments/1193016571115876393/1305585769225650196/pandachrismas.png'
            })
            .setTimestamp();   
        }
        
    } else if (interaction.customId === 'select_test_eng2') {
        if (interaction.values[0] === 'test_1_eng2') {
            newEmbed = new EmbedBuilder()
            .setColor(0xADD8E6) // Vibrant blue for better visibility
            .setTitle('<:Info2:1305942999850549259> - Server Rules & Information')
            .setThumbnail(logoURL)
            .setDescription(
                '**Our Rules**\n\n' +
                '<:punkt:1304144927940284416> **Follow Discord’s Terms of Service and Community Guidelines** at all times.\n' +
                '[Terms of Service](https://dis.gd/terms) | [Community Guidelines](https://dis.gd/guidelines)\n\n' +
                '<:punkt:1304144927940284416> **Respect all users.** No harassment, trolling, spamming, or hate speech. Avoid divisive topics like politics or religion.\n\n' +
                '<:punkt:1304144927940284416> **No NSFW or offensive content** is allowed, including nicknames, usernames, avatars, and statuses.\n\n' +
                '<:punkt:1304144927940284416> **Self-promotion** is only allowed in designated channels.\n\n' +
                '<:punkt:1304144927940284416> **Please keep all content in German and English only.**\n\n\n' +
                '*Our moderators reserve the right to update or interpret rules based on context. Additional rules may also apply to certain channels—check pinned messages or channel topics before posting.*\n\n' +
                '<:heart2:1304144905517400106> Thank you for making our server a welcoming place for everyone!'
            )
            .setImage("https://cdn.discordapp.com/attachments/1252287347782058067/1304115478779793480/testeteete.png?ex=672e37af&is=672ce62f&hm=c0ae52b672be3ab536f6a98f0ce52a647e9b5659c9adb3895efccf95890ce178&")
            .setFooter({
                text: 'Copyright © BRP 2024',
                iconURL: 'https://cdn.discordapp.com/attachments/1193016571115876393/1305585769225650196/pandachrismas.png'
            })
            .setTimestamp();
        }
    }

    // Wenn ein neues Embed vorhanden ist, antworten und die Komponenten zurücksetzen
    if (newEmbed) {
        await interaction.reply({
            embeds: [newEmbed],
            ephemeral: true // Diese Antwort ist nur für den Benutzer sichtbar, der die Interaktion ausgelöst hat
        });

        // Editieren des ursprünglichen Nachrichteninhalts, um die Auswahlmenüs zurückzusetzen
        let components;
        if (interaction.customId === 'select_test_de2' || interaction.customId === 'select_test_eng2') {
            components = [new ActionRowBuilder().addComponents(selectMenuDeutsch2), new ActionRowBuilder().addComponents(selectMenuEnglish2)];
        } else {
            components = [new ActionRowBuilder().addComponents(selectMenuDeutsch), new ActionRowBuilder().addComponents(selectMenuEnglish)];
        }

        await interaction.message.edit({
            components: components
        });
    }
});


 // Initialisiere die Sammlung für aktive Schichten
 const activeShifts = new Set();

 client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const channelId = '1302640916397559918'; // Zielkanal, in dem die Nachricht gesendet wird
    const targetChannel = interaction.guild.channels.cache.get(channelId);

    if (!targetChannel || !targetChannel.isTextBased()) {
        await interaction.reply({ content: '❌ Der Zielkanal konnte nicht gefunden werden.', ephemeral: true });
        return;
    }

    let embed;
    const match = interaction.customId.match(/(start|pause|end|info)Shift(\d+)/);
    if (!match) return; // Wenn keine passende customId gefunden wird, ignoriere die Interaktion

    const action = match[1]; // Die Aktion (start, pause, end, info)
    const serverNumber = match[2]; // Die Servernummer (1, 2, 3, 4)

    // Handle verschiedene Aktionen
    if (action === 'start') {
        activeShifts.add(interaction.user.id); // Benutzer zur Schichtliste hinzufügen
        embed = new EmbedBuilder()
            .setColor(0x00FF7F)
            .setTitle(`✅ Schicht auf Server ${serverNumber} gestartet`)
            .setDescription(`${interaction.user} hat die Schicht auf Server ${serverNumber} erfolgreich **gestartet**.`)
            .setFooter({ text: 'BRP | Shift Manager', iconURL: 'https://example.com/icon.png' })
            .setTimestamp();
        await interaction.reply({ content: `🚦 Deine Schicht auf Server ${serverNumber} wurde gestartet!`, ephemeral: true });
    } else if (action === 'pause') {
        embed = new EmbedBuilder()
            .setColor(0x1E90FF)
            .setTitle(`⏸️ Schicht auf Server ${serverNumber} pausiert`)
            .setDescription(`${interaction.user} hat die Schicht auf Server ${serverNumber} **pausiert**.`)
            .setFooter({ text: 'BRP | Shift Manager', iconURL: 'https://example.com/icon.png' })
            .setTimestamp();
        await interaction.reply({ content: `⏸️ Deine Schicht auf Server ${serverNumber} wurde pausiert!`, ephemeral: true });
    } else if (action === 'end') {
        activeShifts.delete(interaction.user.id); // Benutzer von der Schichtliste entfernen
        embed = new EmbedBuilder()
            .setColor(0xFF6347)
            .setTitle(`🛑 Schicht auf Server ${serverNumber} beendet`)
            .setDescription(`${interaction.user} hat die Schicht auf Server ${serverNumber} **beendet**.`)
            .setFooter({ text: 'BRP | Shift Manager', iconURL: 'https://example.com/icon.png' })
            .setTimestamp();
        await interaction.reply({ content: `🛑 Deine Schicht auf Server ${serverNumber} wurde beendet!`, ephemeral: true });
    } else if (action === 'info') {
        // Liste der Benutzer, die in einer Schicht sind
        const usersInShift = Array.from(activeShifts)
            .map(userId => `<@${userId}>`)
            .join('\n') || `❌ Niemand ist aktuell in einer Schicht auf Server ${serverNumber}.`;

        embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle(`ℹ️ Schicht-Informationen für Server ${serverNumber}`)
            .setDescription(`**Aktuelle Benutzer in einer Schicht auf Server ${serverNumber}:**\n${usersInShift}`)
            .setFooter({ text: 'BRP | Shift Manager', iconURL: 'https://example.com/icon.png' })
            .setTimestamp();
        await interaction.reply({ content: `ℹ️ Hier sind die aktuellen Schichtinformationen für Server ${serverNumber}.`, ephemeral: true });
    }

    // Sende die Embed-Nachricht in den Zielkanal
    if (embed) {
        await targetChannel.send({ embeds: [embed] });
    }
});


client.on('interactionCreate', async interaction => {
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'ticket_select') {
            let newEmbed;

            // Überprüfe die Auswahl und erstelle das entsprechende Embed
            if (interaction.values[0] === 'general_support') {
                const modal = new ModalBuilder()
                    .setCustomId('general_support_modal')
                    .setTitle('General Support Request');

                const reasonInput = new TextInputBuilder()
                    .setCustomId('reasonInput')
                    .setLabel("Bitte beschreiben Sie Ihr Anliegen")
                    .setStyle(TextInputStyle.Paragraph);

                const actionRow = new ActionRowBuilder().addComponents(reasonInput);
                modal.addComponents(actionRow);

                await interaction.showModal(modal);
            } else if (interaction.values[0] === 'report_player') {
                const modal = new ModalBuilder()
                    .setCustomId('report_player_modal')
                    .setTitle('Player Report');
                const reportInput = new TextInputBuilder()
                    .setCustomId('reportInput')
                    .setLabel("Bitte beschreiben Sie das Verhalten")
                    .setStyle(TextInputStyle.Paragraph);
                const actionRow = new ActionRowBuilder().addComponents(reportInput);
                modal.addComponents(actionRow);
                await interaction.showModal(modal);
            }
            await interaction.message.edit({
                components: [new ActionRowBuilder().addComponents(ticketSelectMenu)]
            });
            if (newEmbed) {
                await interaction.reply({ embeds: [newEmbed], ephemeral: true });
            
            } else if (interaction.values[0] === 'report_bug') {
                const modal = new ModalBuilder()
                .setCustomId('report_bug_modal')
                .setTitle('Bug Report');
            const reportInput = new TextInputBuilder()
                .setCustomId('reportbugInput')
                .setLabel("Bitte beschreiben Sie den Bug")
                .setStyle(TextInputStyle.Paragraph);
            const actionRow = new ActionRowBuilder().addComponents(reportInput);
            modal.addComponents(actionRow);
            await interaction.showModal(modal);
        }
        await interaction.message.edit({
            components: [new ActionRowBuilder().addComponents(ticketSelectMenu)]
        });
        if (newEmbed) {
            await interaction.reply({ embeds: [newEmbed], ephemeral: true });
        
            } else if (interaction.values[0] === 'partnerships') {
                const modal = new ModalBuilder()
                .setCustomId('partnerships_modal')
                .setTitle('Partnerships');
            const reportInput = new TextInputBuilder()
                .setCustomId('partnershipsInput')
                .setLabel("Grund für die Partnerschaft")
                .setStyle(TextInputStyle.Paragraph);
            const actionRow = new ActionRowBuilder().addComponents(reportInput);
            modal.addComponents(actionRow);
            await interaction.showModal(modal);
        }
        await interaction.message.edit({
            components: [new ActionRowBuilder().addComponents(ticketSelectMenu)]
        });
        if (newEmbed) {
            await interaction.reply({ embeds: [newEmbed], ephemeral: true });
        
            }

            // Zuerst das Auswahlmenü zurücksetzen
            await interaction.message.edit({
                components: [new ActionRowBuilder().addComponents(ticketSelectMenu)] // Zurücksetzen des Auswahlmenüs
            });

            // Antwort senden mit dem Embed
            if (newEmbed) {
                await interaction.reply({
                    embeds: [newEmbed],
                    ephemeral: true
                });
            }
        }
    }

    

    // Verarbeitung der Modal-Eingabe (General Support)
if (interaction.isModalSubmit()) {
    if (interaction.customId === 'general_support_modal') {
        const reason = interaction.fields.getTextInputValue('reasonInput');
        const ticketCreatorId = interaction.user.id; // Speichert die ID des Ticket-Erstellers
        const categoryId = '1305996441008865280'; // Die Kategorie-ID
        const category = interaction.guild.channels.cache.get(categoryId); 
        

        // Kanal erstellen
        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            parent: category.id,  // Weist den Kanal der gewünschten Kategorie zu
            type: 0, // Textkanal
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
                {
                    id: '1297978184918241321',  // Support-Rolle o.Ä.
                    allow: [PermissionsBitField.Flags.ViewChannel],  // Zugriff erlauben
                },
            ],
        });

        ticketMap.set(channel.id, ticketCreatorId); // Hinzufügen zur Map
        saveTicketData(ticketMap); // Speichern in Datei


        // Erstelle die Buttons
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('claim_ticket')
                .setLabel('Claim Ticket')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:message4:1305939298360492102>'),
            new ButtonBuilder()
                .setCustomId('transcript_ticket')
                .setLabel('Transcript Ticket')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:Trasscript:1305941360947236925>'),
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Close Ticket')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:close:1305939301028331600>'),
            new ButtonBuilder()
                .setCustomId('user_info')
                .setLabel('User Info')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:Info:1305939309106429972>')
        );

       // Embed message with ticket details
const embed = new EmbedBuilder()
.setColor(0xADD8E6)
.setTitle('<:ticketnew:1305939312810135612> General Support Ticket')
.setDescription(`${interaction.user}, welcome to our support! Thank you for opening a ticket. A team member will attend to your issue shortly.`)
.addFields(
    { name: '<:Member2:1305941789944975360> Ticket from:', value: interaction.user.tag },
    { name: '<:textkanal:1305939307634229288> Ticket Category:', value: 'General Support' },
    { name: '<:message3:1305939299459403827> Reason:', value: `${reason}` }
)
.setFooter({ text: "Support Team will reach out to you soon." });

// Send the message with ticket details
await channel.send({ embeds: [embed], components: [row] });

        // Nachricht, die das Team markiert, wird danach gesendet
        const teamMentionMessage = await channel.send({
            content: `<@&1297978184918241321>`,
        });

        // Lösche diese Nachricht nach dem Senden
        setTimeout(() => {
            teamMentionMessage.delete().catch(console.error);
        }, 1000);

        // Bestätigungsnachricht an den Benutzer
        await interaction.reply({ content: `Dein Ticket wurde erstellt: ${channel}`, ephemeral: true });
    }
}

// Überprüfen der Button-Interaktionen und `customId` verwenden
if (interaction.isButton()) {
    const { customId } = interaction;

    if (customId === 'claim_ticket') {
        if (!interaction.member.roles.cache.has(allowedRoleId1)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle('<:xx:1304121069841416316> Missing Permission')
                .setDescription(`It looks like you don't have permission to use this command. Only specific roles are allowed access.`)
                .setFooter({
                    text: 'Thank you for understanding!',
                    iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                });
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const claimMessage = new EmbedBuilder()
            .setColor(0xADD8E6)
            .setTitle('<:Verified:1305132264329314335> Claimed Ticket')
            .setDescription(`<:moderator:1305939310968569948> - ${interaction.user} **claimed the ticket!**`)
            .setFooter({
                text: 'You have successfully claimed the ticket',
                iconURL: 'https://cdn.discordapp.com/attachments/1193016571115876393/1305585769225650196/pandachrismas.png'
            });

        await interaction.channel.send({ embeds: [claimMessage] });
        await interaction.reply({ content: 'You have successfully taken over the ticket.', ephemeral: true });

    }
        else if (customId === 'transcript_ticket') {
            await interaction.deferReply({ ephemeral: true });
    
            const transcriptEmbeds = [];
            const currentChannel = interaction.channel;
            const transcriptCategoryId = '1305996522332225576'; // ID der Transkript-Kategorie
    
            if (!interaction.member.roles.cache.has(allowedRoleId1)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xADD8E6)
                    .setTitle('<:xx:1304121069841416316> Missing Permission')
                    .setDescription("It looks like you don't have permission to use this command. Only specific roles are allowed access.")
                    .setFooter({
                        text: 'Thank you for understanding!',
                        iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png',
                    });
    
                return interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
            }
    
            try {
                const messages = await currentChannel.messages.fetch({ limit: 100 });
                messages.reverse();
    
                messages.forEach((message) => {
                    const time = new Date(message.createdTimestamp).toLocaleString();
                    const content = message.content
                        ? `[${time}] ${message.author.tag}: ${message.content}\n`
                        : `[${time}] ${message.author.tag}: [No content]`;
    
                    const messageEmbed = new EmbedBuilder()
                        .setColor(0xADD8E6)
                        .setDescription(content)
                        .setFooter({
                            text: 'Transcript generated successfully',
                            iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png',
                        });
    
                    transcriptEmbeds.push(messageEmbed);
    
                    message.attachments.forEach((attachment) => {
                        if (attachment.contentType && attachment.contentType.startsWith('image')) {
                            const imageEmbed = new EmbedBuilder()
                                .setColor(0xADD8E6)
                                .setImage(attachment.url)
                                .setFooter({
                                    text: `Image from ${message.author.tag}`,
                                    iconURL: message.author.displayAvatarURL(),
                                });
                            transcriptEmbeds.push(imageEmbed);
                        }
                    });
                });
    
                const transcriptChannelName = `transcript-${currentChannel.name}`;
                const transcriptChannel = await interaction.guild.channels.create({
                    name: transcriptChannelName,
                    type: 0, // Typ Textkanal
                    parent: transcriptCategoryId,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: ['ViewChannel'] },
                        { id: '1297978184918241321', allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                    ],
                });
    
                const deleteButton = new ButtonBuilder()
                    .setCustomId('delete_transcript')
                    .setLabel('Delete')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('<:delete:1305968687253028935>');
    
                const actionRow = new ActionRowBuilder().addComponents(deleteButton);
    
                const MAX_EMBEDS_PER_MESSAGE = 10;
                for (let i = 0; i < transcriptEmbeds.length; i += MAX_EMBEDS_PER_MESSAGE) {
                    const batch = transcriptEmbeds.slice(i, i + MAX_EMBEDS_PER_MESSAGE);
    
                    if (i + MAX_EMBEDS_PER_MESSAGE >= transcriptEmbeds.length) {
                        await transcriptChannel.send({
                            embeds: batch,
                            components: [actionRow],
                        });
                    } else {
                        await transcriptChannel.send({ embeds: batch });
                    }
                }
    
                const successEmbed = new EmbedBuilder()
                    .setColor(0xADD8E6)
                    .setTitle('<:Trasscript:1305941360947236925> Transcript Created')
                    .setDescription(`The transcript was successfully created and saved in the channel: ${transcriptChannel}.`)
                    .setFooter({
                        text: 'Transcript saved successfully',
                        iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png',
                    });
    
                await interaction.editReply({ embeds: [successEmbed] });
            } catch (error) {
                console.error('Error while creating the transcript:', error);
                await interaction.editReply({ content: 'An error occurred while creating the transcript. Please try again later.', ephemeral: true });
            }
        } else if (customId === 'delete_transcript') {
            if (!interaction.member.roles.cache.has(allowedRoleId2)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xADD8E6)
                    .setTitle('<:xx:1304121069841416316> Missing Permission')
                    .setDescription("You don't have permission to delete this transcript.")
                    .setFooter({
                        text: 'Thank you for understanding!',
                        iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png',
                    });
    
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
    
            try {
                await interaction.channel.delete();
                console.log('Transcript channel successfully deleted.');
            } catch (error) {
                console.error('Error deleting the transcript channel:', error);
                await interaction.reply({ content: 'An error occurred while deleting the transcript channel.', ephemeral: true });
            }
        
        } else if (customId === 'close_ticket') {
            if (!interaction.member.roles.cache.has(allowedRoleId1)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xADD8E6)
                    .setTitle('<:xx:1304121069841416316> Missing Permission')
                    .setDescription(`It looks like you don't have permission to use this command. Only specific roles are allowed access.`)
                    .setFooter({
                        text: 'Thank you for understanding!',
                        iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                    });
    
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const confirmEmbed = new EmbedBuilder()
                .setColor(0xADD8E6) // Rot
                .setTitle('<:warnung:1305942995174162523> Are you sure?')
                .setDescription('<:close:1305939301028331600> - Are you sure you want to close this ticket?')
                .setFooter({
                    text: 'Are you sure you want to close the ticket?',
                    iconURL: 'https://cdn.discordapp.com/attachments/1252287347782058067/1305946908346421258/Panda_angry.png?ex=6734e156&is=67338fd6&hm=126884dff48703e0cd2d66ff06d568592769f7b921b36e2594ca73909600bc27&'
                });
                
            const yesButton = new ButtonBuilder()
                .setCustomId('confirm_close_yes')
                .setLabel('Yes')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:Verified:1305132264329314335>'); // Emoji ID korrigieren

            const noButton = new ButtonBuilder()
                .setCustomId('confirm_close_no')
                .setLabel('No')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:xx:1304121069841416316>'); 

            const confirmRow = new ActionRowBuilder()
                .addComponents(yesButton, noButton);

            await interaction.reply({
                embeds: [confirmEmbed],
                components: [confirmRow],
                ephemeral: true
            });
        }

       
       // If user confirms ticket closure
else if (interaction.customId === 'confirm_close_yes') {
    const ticketChannel = interaction.channel;
    const moderator = interaction.user;

    // Delete the ticket channel
    await ticketChannel.delete();

    // Remove the ticket creator's ID from the map
    ticketMap.delete(ticketChannel.id);
    saveTicketData(ticketMap); // Save the updated map to file

    // Send log embed to the specific channel
    const logChannelId = '1297978300668317797';
    const logChannel = interaction.guild.channels.cache.get(logChannelId);
    if (logChannel) {
        const closeEmbed = new EmbedBuilder()
            .setColor(0xADD8E6)
            .setTitle('<:close:1305939301028331600> Ticket Closed')
            .setDescription(`The ticket was closed by ${moderator.tag}.`)
            .addFields(
                { name: '<:moderator:1305939310968569948> Moderator', value: moderator.toString(), inline: true },
                { name: '<:ticketnew:1305939312810135612> Ticket Name', value: ticketChannel.name, inline: true }
            )
            .setTimestamp()
            .setFooter({
                text: 'Ticket Logs',
                iconURL: 'https://cdn.discordapp.com/attachments/1193016571115876393/1305585769225650196/pandachrismas.png?ex=673390ff&is=67323f7f&hm=0846bdee4df79b98eb8231ef9aab14c6c74fd7492093c435b083e273d3a02c8f&'
            });

        await logChannel.send({ embeds: [closeEmbed] });
    } else {
        console.error(`Log channel with ID ${logChannelId} not found.`);
    }
}
        
        // Benutzer lehnt das Schließen des Tickets ab
        else if (interaction.customId === 'confirm_close_no') {
            const canceledEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setDescription('<:ticketnew:1305939312810135612> - The closing of the ticket has been canceled.')
                .setAuthor({
                    name: 'Canceled', 
                    iconURL: 'https://cdn.discordapp.com/attachments/1252287347782058067/1305945775078903908/Verified.png?ex=6734e048&is=67338ec8&hm=10b4e7a41d47386c1b7eaec2670e27a1150bb6956ad67e4c52e9d6a6c895755a&'
                })
                .setFooter({
                    text: 'Your ticket has been successfully canceled.',
                    iconURL: 'https://cdn.discordapp.com/attachments/1193016571115876393/1305585769225650196/pandachrismas.png?ex=673390ff&is=67323f7f&hm=0846bdee4df79b98eb8231ef9aab14c6c74fd7492093c435b083e273d3a02c8f&'
                });

            await interaction.update({
                embeds: [canceledEmbed],
                components: [],
                ephemeral: true
            });
            
        } else if (customId === 'user_info') {
            if (!interaction.member.roles.cache.has(allowedRoleId1)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xADD8E6)
                    .setTitle('<:xx:1304121069841416316> Missing Permission')
                    .setDescription(`It looks like you don't have permission to use this command. Only specific roles are allowed access.`)
                    .setFooter({
                        text: 'Thank you for understanding!',
                        iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                    });
        
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        
            const ticketCreatorId = ticketMap.get(interaction.channel.id);
        
            if (!ticketCreatorId) {
                return interaction.reply({ content: 'User ID for this ticket not found.', ephemeral: true });
            }
        
            try {
                // Signal that the bot is processing the request
                await interaction.deferReply({ ephemeral: true });
        
                const member = await interaction.guild.members.fetch(ticketCreatorId);
        
                const userEmbed = new EmbedBuilder()
                    .setColor(0xADD8E6)
                    .setTitle(`Information about ${member.user.username}`)
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .addFields(
                        { name: '<:Member2:1305941789944975360> Username', value: member.user.tag, inline: true },
                        { name: '<:Info2:1305942999850549259> User ID', value: member.user.id, inline: true },
                        { name: '<:general:1305942998596587530> Joined Server on', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false },
                        { name: '<:moderator:1305939310968569948> Account Created on', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: false },
                        {
                            name: 'Roles',
                            value: member.roles.cache
                                .filter(role => role.name !== '@everyone') // Remove the @everyone role
                                .map(role => `<@&${role.id}>`) // Mentions the role
                                .join(', ') || 'No roles',
                            inline: false
                        }
                    )
                    .setFooter({ text: 'User information retrieved', iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png' });
        
                await interaction.editReply({ embeds: [userEmbed] });
            } catch (error) {
                if (error.code === 10007) { // DiscordAPIError: Unknown Member
                    const notFoundEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('<:xx:1304121069841416316> User Not Found')
                        .setDescription('It seems that the user has left the server.')
                        .setFooter({
                            text: 'Unable to retrieve user information.',
                            iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                        });
        
                    return interaction.editReply({ embeds: [notFoundEmbed] });
                } else {
                    console.error('Error fetching member:', error);
                    return interaction.editReply({ content: 'An error occurred while fetching user information.' });
                }
            }
        }}





    //--------------------------------------------------------------------------------------------------------------------------------------






     // Verarbeitung der Modal-Eingabe (General Support)
if (interaction.isModalSubmit()) {
    if (interaction.customId === 'report_player_modal') {
        const reason = interaction.fields.getTextInputValue('reportInput');
        const ticketCreatorId = interaction.user.id; // Speichert die ID des Ticket-Erstellers
        const categoryId = '1305996944761688214'; // Die Kategorie-ID
        const category = interaction.guild.channels.cache.get(categoryId); 
        

        // Kanal erstellen
        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            parent: category.id,  // Weist den Kanal der gewünschten Kategorie zu
            type: 0, // Textkanal
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
                {
                    id: '1297978184918241321',  // Support-Rolle o.Ä.
                    allow: [PermissionsBitField.Flags.ViewChannel],  // Zugriff erlauben
                },
            ],
        });

        ticketMap.set(channel.id, ticketCreatorId); // Hinzufügen zur Map
        saveTicketData(ticketMap); // Speichern in Datei


        // Erstelle die Buttons
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('claim_ticket2')
                .setLabel('Claim Ticket')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:message4:1305939298360492102>'),
            new ButtonBuilder()
                .setCustomId('transcript_ticket2')
                .setLabel('Transcript Ticket')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:Trasscript:1305941360947236925>'),
            new ButtonBuilder()
                .setCustomId('close_ticket2')
                .setLabel('Close Ticket')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:close:1305939301028331600>'),
            new ButtonBuilder()
                .setCustomId('user_info2')
                .setLabel('User Info')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:Info:1305939309106429972>')
        );

       // Embed message with ticket details
const embed = new EmbedBuilder()
.setColor(0xADD8E6)
.setTitle('<:ticketnew:1305939312810135612> Report Player Ticket')
.setDescription(`${interaction.user}, welcome to our support! Thank you for opening a ticket. A team member will attend to your issue shortly.`)
.addFields(
    { name: '<:Member2:1305941789944975360> Ticket from:', value: interaction.user.tag },
    { name: '<:textkanal:1305939307634229288> Ticket Category:', value: 'Report Player Support' },
    { name: '<:message3:1305939299459403827> Reason:', value: `${reason}` }
)
.setFooter({ text: "Support Team will reach out to you soon." });

// Send the message with ticket details
await channel.send({ embeds: [embed], components: [row] });

        // Nachricht, die das Team markiert, wird danach gesendet
        const teamMentionMessage = await channel.send({
            content: `<@&1297978184918241321>`,
        });

        // Lösche diese Nachricht nach dem Senden
        setTimeout(() => {
            teamMentionMessage.delete().catch(console.error);
        }, 1000);

        // Bestätigungsnachricht an den Benutzer
        await interaction.reply({ content: `Dein Ticket wurde erstellt: ${channel}`, ephemeral: true });
    }
}

// Überprüfen der Button-Interaktionen und `customId` verwenden
if (interaction.isButton()) {
    const { customId } = interaction;

    if (customId === 'claim_ticket2') {
        if (!interaction.member.roles.cache.has(allowedRoleId1)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle('<:xx:1304121069841416316> Missing Permission')
                .setDescription(`It looks like you don't have permission to use this command. Only specific roles are allowed access.`)
                .setFooter({
                    text: 'Thank you for understanding!',
                    iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                });
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const claimMessage = new EmbedBuilder()
            .setColor(0xADD8E6)
            .setTitle('<:Verified:1305132264329314335> Claimed Ticket')
            .setDescription(`<:moderator:1305939310968569948> - ${interaction.user} **claimed the ticket!**`)
            .setFooter({
                text: 'You have successfully claimed the ticket',
                iconURL: 'https://cdn.discordapp.com/attachments/1193016571115876393/1305585769225650196/pandachrismas.png'
            });

        await interaction.channel.send({ embeds: [claimMessage] });
        await interaction.reply({ content: 'You have successfully taken over the ticket.', ephemeral: true });

    } else if (customId === 'transcript_ticket2') {

            const transcriptEmbeds = [];

            if (!interaction.member.roles.cache.has(allowedRoleId1)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xADD8E6)
                    .setTitle('<:xx:1304121069841416316> Missing Permission')
                    .setDescription(`It looks like you don't have permission to use this command. Only specific roles are allowed access.`)
                    .setFooter({
                        text: 'Thank you for understanding!',
                        iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                    });
        
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        
            const currentChannel = interaction.channel;
            const transcriptCategoryId = '1305997023496900708';
        
            try {
                const messages = await currentChannel.messages.fetch({ limit: 100 });
                
                // Reverse once to process messages from oldest to newest
                messages.reverse();
        
                // Create and add each message, in order, to the transcriptEmbeds array
                messages.forEach(message => {
                    const time = new Date(message.createdTimestamp).toLocaleString();
                    let messageContent = `[${time}] ${message.author.tag}: ${message.content}\n`;
        
                    // Create an embed for the main text content
                    const messageEmbed = new EmbedBuilder()
                        .setColor(0xADD8E6)
                        .setDescription(messageContent)
                        .setFooter({
                            text: 'Transcript generated successfully',
                            iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                        });
                    transcriptEmbeds.push(messageEmbed);
        
                    // Add each image in the message as a separate embed
                    message.attachments.forEach(attachment => {
                        if (attachment.contentType && attachment.contentType.startsWith('image')) {
                            const imageEmbed = new EmbedBuilder()
                                .setColor(0xADD8E6)
                                .setImage(attachment.url)
                                .setFooter({
                                    text: `Image from ${message.author.tag}`,
                                    iconURL: message.author.displayAvatarURL()
                                });
                            transcriptEmbeds.push(imageEmbed);
                        }
                    });
                });
        
                const transcriptChannelName = `transcript-${currentChannel.name}`;
                const transcriptChannel = await interaction.guild.channels.create({
                    name: transcriptChannelName,
                    type: 0, // ChannelType.GuildText in newer versions
                    parent: transcriptCategoryId,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: ['ViewChannel'] },
                        { id: '1297978184918241321', allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                    ],
                });
        
                const deleteButton = new ButtonBuilder()
                    .setCustomId('delete_transcript2')
                    .setLabel('Delete')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('<:delete:1305968687253028935>');
        
                const actionRow = new ActionRowBuilder().addComponents(deleteButton);
        
                // Send all transcript embeds in the newly created transcript channel
                await transcriptChannel.send({
                    embeds: transcriptEmbeds,
                    components: [actionRow]
                });
        
                const successEmbed = new EmbedBuilder()
                    .setColor(0xADD8E6)
                    .setTitle('<:Trasscript:1305941360947236925> Transcript Created')
                    .setDescription(`The transcript was successfully created and saved in the channel: ${transcriptChannel}.`)
                    .setFooter({
                        text: 'Transcript saved successfully',
                        iconURL: 'https://cdn.discordapp.com/attachments/1193016571115876393/1305585769225650196/pandachrismas.png?ex=673390ff&is=67323f7f&hm=0846bdee4df79b98eb8231ef9aab14c6c74fd7492093c435b083e273d3a02c8f&'
                    });
        
                await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        
            } catch (error) {
                console.error('Error while creating the transcript:', error);
                await interaction.reply({ content: 'Error while creating the transcript:', ephemeral: true });
            }
        
        } else if (interaction.customId === 'delete_transcript2') {
            // Check if the user is allowed to use the button
            if (!interaction.member.roles.cache.has(allowedRoleId2)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xADD8E6)
                    .setTitle('<:xx:1304121069841416316> Missing Permission')
                    .setDescription("It looks like you don't have permission to use this command. Only specific roles are allowed access.")
                    .setFooter({
                        text: 'Thank you for understanding!',
                        iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                    });
        
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        
            try {
                // Deleting the channel that contains the transcript
                await interaction.channel.delete();
                console.log('Transcript channel successfully deleted.');
            } catch (error) {
                console.error('Error deleting the transcript channel:', error);
                await interaction.reply({ content: 'Error deleting the transcript channel.', ephemeral: true });
            }
        
        } else if (customId === 'close_ticket2') {
            if (!interaction.member.roles.cache.has(allowedRoleId1)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xADD8E6)
                    .setTitle('<:xx:1304121069841416316> Missing Permission')
                    .setDescription(`It looks like you don't have permission to use this command. Only specific roles are allowed access.`)
                    .setFooter({
                        text: 'Thank you for understanding!',
                        iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                    });
    
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const confirmEmbed = new EmbedBuilder()
                .setColor(0xADD8E6) // Rot
                .setTitle('<:warnung:1305942995174162523> Are you sure?')
                .setDescription('<:close:1305939301028331600> - Are you sure you want to close this ticket?')
                .setFooter({
                    text: 'Are you sure you want to close the ticket?',
                    iconURL: 'https://cdn.discordapp.com/attachments/1252287347782058067/1305946908346421258/Panda_angry.png?ex=6734e156&is=67338fd6&hm=126884dff48703e0cd2d66ff06d568592769f7b921b36e2594ca73909600bc27&'
                });
                
            const yesButton = new ButtonBuilder()
                .setCustomId('confirm_close_yes2')
                .setLabel('Yes')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:Verified:1305132264329314335>'); // Emoji ID korrigieren

            const noButton = new ButtonBuilder()
                .setCustomId('confirm_close_no2')
                .setLabel('No')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:xx:1304121069841416316>'); 

            const confirmRow = new ActionRowBuilder()
                .addComponents(yesButton, noButton);

            await interaction.reply({
                embeds: [confirmEmbed],
                components: [confirmRow],
                ephemeral: true
            });
        }

       
        // If user confirms ticket closure
else if (interaction.customId === 'confirm_close_yes2') {
    const ticketChannel = interaction.channel;
    const moderator = interaction.user;

    // Delete the ticket channel
    await ticketChannel.delete();

    // Remove the ticket creator's ID from the map
    ticketMap.delete(ticketChannel.id);
    saveTicketData(ticketMap); // Save the updated map to file

    // Send log embed to the specific channel
    const logChannelId = '1297978300668317797';
    const logChannel = interaction.guild.channels.cache.get(logChannelId);
    if (logChannel) {
        const closeEmbed = new EmbedBuilder()
            .setColor(0xADD8E6)
            .setTitle('<:close:1305939301028331600> Ticket Closed')
            .setDescription(`The ticket was closed by ${moderator.tag}.`)
            .addFields(
                { name: '<:moderator:1305939310968569948> Moderator', value: moderator.toString(), inline: true },
                { name: '<:ticketnew:1305939312810135612> Ticket Name', value: ticketChannel.name, inline: true }
            )
            .setTimestamp()
            .setFooter({
                text: 'Ticket Logs',
                iconURL: 'https://cdn.discordapp.com/attachments/1193016571115876393/1305585769225650196/pandachrismas.png?ex=673390ff&is=67323f7f&hm=0846bdee4df79b98eb8231ef9aab14c6c74fd7492093c435b083e273d3a02c8f&'
            });

        await logChannel.send({ embeds: [closeEmbed] });
    } else {
        console.error(`Log channel with ID ${logChannelId} not found.`);
    }
}
        
        // Benutzer lehnt das Schließen des Tickets ab
        else if (interaction.customId === 'confirm_close_no2') {
            const canceledEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setDescription('<:ticketnew:1305939312810135612> - The closing of the ticket has been canceled.')
                .setAuthor({
                    name: 'Canceled', 
                    iconURL: 'https://cdn.discordapp.com/attachments/1252287347782058067/1305945775078903908/Verified.png?ex=6734e048&is=67338ec8&hm=10b4e7a41d47386c1b7eaec2670e27a1150bb6956ad67e4c52e9d6a6c895755a&'
                })
                .setFooter({
                    text: 'Your ticket has been successfully canceled.',
                    iconURL: 'https://cdn.discordapp.com/attachments/1193016571115876393/1305585769225650196/pandachrismas.png?ex=673390ff&is=67323f7f&hm=0846bdee4df79b98eb8231ef9aab14c6c74fd7492093c435b083e273d3a02c8f&'
                });

            await interaction.update({
                embeds: [canceledEmbed],
                components: [],
                ephemeral: true
            });
            
        } else if (customId === 'user_info2') {
            if (!interaction.member.roles.cache.has(allowedRoleId1)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xADD8E6)
                    .setTitle('<:xx:1304121069841416316> Missing Permission')
                    .setDescription(`It looks like you don't have permission to use this command. Only specific roles are allowed access.`)
                    .setFooter({
                        text: 'Thank you for understanding!',
                        iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                    });
        
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        
            const ticketCreatorId = ticketMap.get(interaction.channel.id);
        
            if (!ticketCreatorId) {
                return interaction.reply({ content: 'User ID for this ticket not found.', ephemeral: true });
            }
        
            try {
                // Signal that the bot is processing the request
                await interaction.deferReply({ ephemeral: true });
        
                const member = await interaction.guild.members.fetch(ticketCreatorId);
        
                const userEmbed = new EmbedBuilder()
                    .setColor(0xADD8E6)
                    .setTitle(`Information about ${member.user.username}`)
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .addFields(
                        { name: '<:Member2:1305941789944975360> Username', value: member.user.tag, inline: true },
                        { name: '<:Info2:1305942999850549259> User ID', value: member.user.id, inline: true },
                        { name: '<:general:1305942998596587530> Joined Server on', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false },
                        { name: '<:moderator:1305939310968569948> Account Created on', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: false },
                        {
                            name: 'Roles',
                            value: member.roles.cache
                                .filter(role => role.name !== '@everyone') // Remove the @everyone role
                                .map(role => `<@&${role.id}>`) // Mentions the role
                                .join(', ') || 'No roles',
                            inline: false
                        }
                    )
                    .setFooter({ text: 'User information retrieved', iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png' });
        
                await interaction.editReply({ embeds: [userEmbed] });
            } catch (error) {
                if (error.code === 10007) { // DiscordAPIError: Unknown Member
                    const notFoundEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('<:xx:1304121069841416316> User Not Found')
                        .setDescription('It seems that the user has left the server.')
                        .setFooter({
                            text: 'Unable to retrieve user information.',
                            iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                        });
        
                    return interaction.editReply({ embeds: [notFoundEmbed] });
                } else {
                    console.error('Error fetching member:', error);
                    return interaction.editReply({ content: 'An error occurred while fetching user information.' });
                }
            }
        }}















 //--------------------------------------------------------------------------------------------------------------------------------------
















     // Verarbeitung der Modal-Eingabe (General Support)
if (interaction.isModalSubmit()) {
    if (interaction.customId === 'report_bug_modal') {
        const reason = interaction.fields.getTextInputValue('reportbugInput');
        const ticketCreatorId = interaction.user.id; // Speichert die ID des Ticket-Erstellers
        const categoryId = '1305997308537606155'; // Die Kategorie-ID
        const category = interaction.guild.channels.cache.get(categoryId); 
        

        // Kanal erstellen
        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            parent: category.id,  // Weist den Kanal der gewünschten Kategorie zu
            type: 0, // Textkanal
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
                {
                    id: '1297978184918241321',  // Support-Rolle o.Ä.
                    allow: [PermissionsBitField.Flags.ViewChannel],  // Zugriff erlauben
                },
            ],
        });

        ticketMap.set(channel.id, ticketCreatorId); // Hinzufügen zur Map
        saveTicketData(ticketMap); // Speichern in Datei


        // Erstelle die Buttons
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('claim_ticket3')
                .setLabel('Claim Ticket')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:message4:1305939298360492102>'),
            new ButtonBuilder()
                .setCustomId('transcript_ticket3')
                .setLabel('Transcript Ticket')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:Trasscript:1305941360947236925>'),
            new ButtonBuilder()
                .setCustomId('close_ticket3')
                .setLabel('Close Ticket')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:close:1305939301028331600>'),
            new ButtonBuilder()
                .setCustomId('user_info3')
                .setLabel('User Info')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:Info:1305939309106429972>')
        );

       // Embed message with ticket details
const embed = new EmbedBuilder()
.setColor(0xADD8E6)
.setTitle('<:ticketnew:1305939312810135612> Report Bug Ticket')
.setDescription(`${interaction.user}, welcome to our support! Thank you for opening a ticket. A team member will attend to your issue shortly.`)
.addFields(
    { name: '<:Member2:1305941789944975360> Ticket from:', value: interaction.user.tag },
    { name: '<:textkanal:1305939307634229288> Ticket Category:', value: 'Report Bug Support' },
    { name: '<:message3:1305939299459403827> Reason:', value: `${reason}` }
)
.setFooter({ text: "Support Team will reach out to you soon." });

// Send the message with ticket details
await channel.send({ embeds: [embed], components: [row] });

        // Nachricht, die das Team markiert, wird danach gesendet
        const teamMentionMessage = await channel.send({
            content: `<@&1297978184918241321>`,
        });

        // Lösche diese Nachricht nach dem Senden
        setTimeout(() => {
            teamMentionMessage.delete().catch(console.error);
        }, 1000);

        // Bestätigungsnachricht an den Benutzer
        await interaction.reply({ content: `Dein Ticket wurde erstellt: ${channel}`, ephemeral: true });
    }
}

// Überprüfen der Button-Interaktionen und `customId` verwenden
if (interaction.isButton()) {
    const { customId } = interaction;

    if (customId === 'claim_ticket3') {
        if (!interaction.member.roles.cache.has(allowedRoleId1)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle('<:xx:1304121069841416316> Missing Permission')
                .setDescription(`It looks like you don't have permission to use this command. Only specific roles are allowed access.`)
                .setFooter({
                    text: 'Thank you for understanding!',
                    iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                });
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const claimMessage = new EmbedBuilder()
            .setColor(0xADD8E6)
            .setTitle('<:Verified:1305132264329314335> Claimed Ticket')
            .setDescription(`<:moderator:1305939310968569948> - ${interaction.user} **claimed the ticket!**`)
            .setFooter({
                text: 'You have successfully claimed the ticket',
                iconURL: 'https://cdn.discordapp.com/attachments/1193016571115876393/1305585769225650196/pandachrismas.png'
            });

        await interaction.channel.send({ embeds: [claimMessage] });
        await interaction.reply({ content: 'You have successfully taken over the ticket.', ephemeral: true });

    } else if (customId === 'transcript_ticket3') {

            const transcriptEmbeds = [];

            if (!interaction.member.roles.cache.has(allowedRoleId1)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xADD8E6)
                    .setTitle('<:xx:1304121069841416316> Missing Permission')
                    .setDescription(`It looks like you don't have permission to use this command. Only specific roles are allowed access.`)
                    .setFooter({
                        text: 'Thank you for understanding!',
                        iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                    });
        
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        
            const currentChannel = interaction.channel;
            const transcriptCategoryId = '1305997352238055486';
        
            try {
                const messages = await currentChannel.messages.fetch({ limit: 100 });
                
                // Reverse once to process messages from oldest to newest
                messages.reverse();
        
                // Create and add each message, in order, to the transcriptEmbeds array
                messages.forEach(message => {
                    const time = new Date(message.createdTimestamp).toLocaleString();
                    let messageContent = `[${time}] ${message.author.tag}: ${message.content}\n`;
        
                    // Create an embed for the main text content
                    const messageEmbed = new EmbedBuilder()
                        .setColor(0xADD8E6)
                        .setDescription(messageContent)
                        .setFooter({
                            text: 'Transcript generated successfully',
                            iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                        });
                    transcriptEmbeds.push(messageEmbed);
        
                    // Add each image in the message as a separate embed
                    message.attachments.forEach(attachment => {
                        if (attachment.contentType && attachment.contentType.startsWith('image')) {
                            const imageEmbed = new EmbedBuilder()
                                .setColor(0xADD8E6)
                                .setImage(attachment.url)
                                .setFooter({
                                    text: `Image from ${message.author.tag}`,
                                    iconURL: message.author.displayAvatarURL()
                                });
                            transcriptEmbeds.push(imageEmbed);
                        }
                    });
                });
        
                const transcriptChannelName = `transcript-${currentChannel.name}`;
                const transcriptChannel = await interaction.guild.channels.create({
                    name: transcriptChannelName,
                    type: 0, // ChannelType.GuildText in newer versions
                    parent: transcriptCategoryId,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: ['ViewChannel'] },
                        { id: '1297978184918241321', allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                    ],
                });
        
                const deleteButton = new ButtonBuilder()
                    .setCustomId('delete_transcript3')
                    .setLabel('Delete')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('<:delete:1305968687253028935>');
        
                const actionRow = new ActionRowBuilder().addComponents(deleteButton);
        
                // Send all transcript embeds in the newly created transcript channel
                await transcriptChannel.send({
                    embeds: transcriptEmbeds,
                    components: [actionRow]
                });
        
                const successEmbed = new EmbedBuilder()
                    .setColor(0xADD8E6)
                    .setTitle('<:Trasscript:1305941360947236925> Transcript Created')
                    .setDescription(`The transcript was successfully created and saved in the channel: ${transcriptChannel}.`)
                    .setFooter({
                        text: 'Transcript saved successfully',
                        iconURL: 'https://cdn.discordapp.com/attachments/1193016571115876393/1305585769225650196/pandachrismas.png?ex=673390ff&is=67323f7f&hm=0846bdee4df79b98eb8231ef9aab14c6c74fd7492093c435b083e273d3a02c8f&'
                    });
        
                await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        
            } catch (error) {
                console.error('Error while creating the transcript:', error);
                await interaction.reply({ content: 'Error while creating the transcript:', ephemeral: true });
            }
        
        } else if (interaction.customId === 'delete_transcript3') {
            // Check if the user is allowed to use the button
            if (!interaction.member.roles.cache.has(allowedRoleId2)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xADD8E6)
                    .setTitle('<:xx:1304121069841416316> Missing Permission')
                    .setDescription("It looks like you don't have permission to use this command. Only specific roles are allowed access.")
                    .setFooter({
                        text: 'Thank you for understanding!',
                        iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                    });
        
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        
            try {
                // Deleting the channel that contains the transcript
                await interaction.channel.delete();
                console.log('Transcript channel successfully deleted.');
            } catch (error) {
                console.error('Error deleting the transcript channel:', error);
                await interaction.reply({ content: 'Error deleting the transcript channel.', ephemeral: true });
            }
        
        } else if (customId === 'close_ticket3') {
            if (!interaction.member.roles.cache.has(allowedRoleId1)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xADD8E6)
                    .setTitle('<:xx:1304121069841416316> Missing Permission')
                    .setDescription(`It looks like you don't have permission to use this command. Only specific roles are allowed access.`)
                    .setFooter({
                        text: 'Thank you for understanding!',
                        iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                    });
    
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const confirmEmbed = new EmbedBuilder()
                .setColor(0xADD8E6) // Rot
                .setTitle('<:warnung:1305942995174162523> Are you sure?')
                .setDescription('<:close:1305939301028331600> - Are you sure you want to close this ticket?')
                .setFooter({
                    text: 'Are you sure you want to close the ticket?',
                    iconURL: 'https://cdn.discordapp.com/attachments/1252287347782058067/1305946908346421258/Panda_angry.png?ex=6734e156&is=67338fd6&hm=126884dff48703e0cd2d66ff06d568592769f7b921b36e2594ca73909600bc27&'
                });
                
            const yesButton = new ButtonBuilder()
                .setCustomId('confirm_close_yes3')
                .setLabel('Yes')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:Verified:1305132264329314335>'); // Emoji ID korrigieren

            const noButton = new ButtonBuilder()
                .setCustomId('confirm_close_no3')
                .setLabel('No')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:xx:1304121069841416316>'); 

            const confirmRow = new ActionRowBuilder()
                .addComponents(yesButton, noButton);

            await interaction.reply({
                embeds: [confirmEmbed],
                components: [confirmRow],
                ephemeral: true
            });
        }

       
        // If user confirms ticket closure
else if (interaction.customId === 'confirm_close_yes3') {
    const ticketChannel = interaction.channel;
    const moderator = interaction.user;

    // Delete the ticket channel
    await ticketChannel.delete();

    // Remove the ticket creator's ID from the map
    ticketMap.delete(ticketChannel.id);
    saveTicketData(ticketMap); // Save the updated map to file

    // Send log embed to the specific channel
    const logChannelId = '1297978300668317797';
    const logChannel = interaction.guild.channels.cache.get(logChannelId);
    if (logChannel) {
        const closeEmbed = new EmbedBuilder()
            .setColor(0xADD8E6)
            .setTitle('<:close:1305939301028331600> Ticket Closed')
            .setDescription(`The ticket was closed by ${moderator.tag}.`)
            .addFields(
                { name: '<:moderator:1305939310968569948> Moderator', value: moderator.toString(), inline: true },
                { name: '<:ticketnew:1305939312810135612> Ticket Name', value: ticketChannel.name, inline: true }
            )
            .setTimestamp()
            .setFooter({
                text: 'Ticket Logs',
                iconURL: 'https://cdn.discordapp.com/attachments/1193016571115876393/1305585769225650196/pandachrismas.png?ex=673390ff&is=67323f7f&hm=0846bdee4df79b98eb8231ef9aab14c6c74fd7492093c435b083e273d3a02c8f&'
            });

        await logChannel.send({ embeds: [closeEmbed] });
    } else {
        console.error(`Log channel with ID ${logChannelId} not found.`);
    }
}
        
        // Benutzer lehnt das Schließen des Tickets ab
        else if (interaction.customId === 'confirm_close_no3') {
            const canceledEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setDescription('<:ticketnew:1305939312810135612> - The closing of the ticket has been canceled.')
                .setAuthor({
                    name: 'Canceled', 
                    iconURL: 'https://cdn.discordapp.com/attachments/1252287347782058067/1305945775078903908/Verified.png?ex=6734e048&is=67338ec8&hm=10b4e7a41d47386c1b7eaec2670e27a1150bb6956ad67e4c52e9d6a6c895755a&'
                })
                .setFooter({
                    text: 'Your ticket has been successfully canceled.',
                    iconURL: 'https://cdn.discordapp.com/attachments/1193016571115876393/1305585769225650196/pandachrismas.png?ex=673390ff&is=67323f7f&hm=0846bdee4df79b98eb8231ef9aab14c6c74fd7492093c435b083e273d3a02c8f&'
                });

            await interaction.update({
                embeds: [canceledEmbed],
                components: [],
                ephemeral: true
            });
            
        } else if (customId === 'user_info3') {
            if (!interaction.member.roles.cache.has(allowedRoleId1)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xADD8E6)
                    .setTitle('<:xx:1304121069841416316> Missing Permission')
                    .setDescription(`It looks like you don't have permission to use this command. Only specific roles are allowed access.`)
                    .setFooter({
                        text: 'Thank you for understanding!',
                        iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                    });
        
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        
            const ticketCreatorId = ticketMap.get(interaction.channel.id);
        
            if (!ticketCreatorId) {
                return interaction.reply({ content: 'User ID for this ticket not found.', ephemeral: true });
            }
        
            try {
                // Signal that the bot is processing the request
                await interaction.deferReply({ ephemeral: true });
        
                const member = await interaction.guild.members.fetch(ticketCreatorId);
        
                const userEmbed = new EmbedBuilder()
                    .setColor(0xADD8E6)
                    .setTitle(`Information about ${member.user.username}`)
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .addFields(
                        { name: '<:Member2:1305941789944975360> Username', value: member.user.tag, inline: true },
                        { name: '<:Info2:1305942999850549259> User ID', value: member.user.id, inline: true },
                        { name: '<:general:1305942998596587530> Joined Server on', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false },
                        { name: '<:moderator:1305939310968569948> Account Created on', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: false },
                        {
                            name: 'Roles',
                            value: member.roles.cache
                                .filter(role => role.name !== '@everyone') // Remove the @everyone role
                                .map(role => `<@&${role.id}>`) // Mentions the role
                                .join(', ') || 'No roles',
                            inline: false
                        }
                    )
                    .setFooter({ text: 'User information retrieved', iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png' });
        
                await interaction.editReply({ embeds: [userEmbed] });
            } catch (error) {
                if (error.code === 10007) { // DiscordAPIError: Unknown Member
                    const notFoundEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('<:xx:1304121069841416316> User Not Found')
                        .setDescription('It seems that the user has left the server.')
                        .setFooter({
                            text: 'Unable to retrieve user information.',
                            iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                        });
        
                    return interaction.editReply({ embeds: [notFoundEmbed] });
                } else {
                    console.error('Error fetching member:', error);
                    return interaction.editReply({ content: 'An error occurred while fetching user information.' });
                }
            }
        }}


























    //--------------------------------------------------------------------------------------------------------------------------------------


































     // Verarbeitung der Modal-Eingabe (General Support)
if (interaction.isModalSubmit()) {
    if (interaction.customId === 'partnerships_modal') {
        const reason = interaction.fields.getTextInputValue('partnershipsInput');
        const ticketCreatorId = interaction.user.id; // Speichert die ID des Ticket-Erstellers
        const categoryId = '1305997403672940644'; // Die Kategorie-ID
        const category = interaction.guild.channels.cache.get(categoryId); 
        

        // Kanal erstellen
        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            parent: category.id,  // Weist den Kanal der gewünschten Kategorie zu
            type: 0, // Textkanal
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
                {
                    id: '1297978184918241321',  // Support-Rolle o.Ä.
                    allow: [PermissionsBitField.Flags.ViewChannel],  // Zugriff erlauben
                },
            ],
        });

        ticketMap.set(channel.id, ticketCreatorId); // Hinzufügen zur Map
        saveTicketData(ticketMap); // Speichern in Datei


        // Erstelle die Buttons
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('claim_ticket4')
                .setLabel('Claim Ticket')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:message4:1305939298360492102>'),
            new ButtonBuilder()
                .setCustomId('transcript_ticket4')
                .setLabel('Transcript Ticket')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:Trasscript:1305941360947236925>'),
            new ButtonBuilder()
                .setCustomId('close_ticket4')
                .setLabel('Close Ticket')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:close:1305939301028331600>'),
            new ButtonBuilder()
                .setCustomId('user_info4')
                .setLabel('User Info')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:Info:1305939309106429972>')
        );

       // Embed message with ticket details
const embed = new EmbedBuilder()
.setColor(0xADD8E6)
.setTitle('<:ticketnew:1305939312810135612> Partnerships Ticket')
.setDescription(`${interaction.user}, welcome to our support! Thank you for opening a ticket. A team member will attend to your issue shortly.`)
.addFields(
    { name: '<:Member2:1305941789944975360> Ticket from:', value: interaction.user.tag },
    { name: '<:textkanal:1305939307634229288> Ticket Category:', value: 'Partnerships Support' },
    { name: '<:message3:1305939299459403827> Reason:', value: `${reason}` }
)
.setFooter({ text: "Support Team will reach out to you soon." });

// Send the message with ticket details
await channel.send({ embeds: [embed], components: [row] });

        // Nachricht, die das Team markiert, wird danach gesendet
        const teamMentionMessage = await channel.send({
            content: `<@&1297978184918241321>`,
        });

        // Lösche diese Nachricht nach dem Senden
        setTimeout(() => {
            teamMentionMessage.delete().catch(console.error);
        }, 1000);

        // Bestätigungsnachricht an den Benutzer
        await interaction.reply({ content: `Dein Ticket wurde erstellt: ${channel}`, ephemeral: true });
    }
}

// Überprüfen der Button-Interaktionen und `customId` verwenden
if (interaction.isButton()) {
    const { customId } = interaction;

    if (customId === 'claim_ticket4') {
        if (!interaction.member.roles.cache.has(allowedRoleId1)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setTitle('<:xx:1304121069841416316> Missing Permission')
                .setDescription(`It looks like you don't have permission to use this command. Only specific roles are allowed access.`)
                .setFooter({
                    text: 'Thank you for understanding!',
                    iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                });
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const claimMessage = new EmbedBuilder()
            .setColor(0xADD8E6)
            .setTitle('<:Verified:1305132264329314335> Claimed Ticket')
            .setDescription(`<:moderator:1305939310968569948> - ${interaction.user} **claimed the ticket!**`)
            .setFooter({
                text: 'You have successfully claimed the ticket',
                iconURL: 'https://cdn.discordapp.com/attachments/1193016571115876393/1305585769225650196/pandachrismas.png'
            });

        await interaction.channel.send({ embeds: [claimMessage] });
        await interaction.reply({ content: 'You have successfully taken over the ticket.', ephemeral: true });

    } else if (customId === 'transcript_ticket4') {

            const transcriptEmbeds = [];

            if (!interaction.member.roles.cache.has(allowedRoleId1)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xADD8E6)
                    .setTitle('<:xx:1304121069841416316> Missing Permission')
                    .setDescription(`It looks like you don't have permission to use this command. Only specific roles are allowed access.`)
                    .setFooter({
                        text: 'Thank you for understanding!',
                        iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                    });
        
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        
            const currentChannel = interaction.channel;
            const transcriptCategoryId = '1305997430705360896';
        
            try {
                const messages = await currentChannel.messages.fetch({ limit: 100 });
                
                // Reverse once to process messages from oldest to newest
                messages.reverse();
        
                // Create and add each message, in order, to the transcriptEmbeds array
                messages.forEach(message => {
                    const time = new Date(message.createdTimestamp).toLocaleString();
                    let messageContent = `[${time}] ${message.author.tag}: ${message.content}\n`;
        
                    // Create an embed for the main text content
                    const messageEmbed = new EmbedBuilder()
                        .setColor(0xADD8E6)
                        .setDescription(messageContent)
                        .setFooter({
                            text: 'Transcript generated successfully',
                            iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                        });
                    transcriptEmbeds.push(messageEmbed);
        
                    // Add each image in the message as a separate embed
                    message.attachments.forEach(attachment => {
                        if (attachment.contentType && attachment.contentType.startsWith('image')) {
                            const imageEmbed = new EmbedBuilder()
                                .setColor(0xADD8E6)
                                .setImage(attachment.url)
                                .setFooter({
                                    text: `Image from ${message.author.tag}`,
                                    iconURL: message.author.displayAvatarURL()
                                });
                            transcriptEmbeds.push(imageEmbed);
                        }
                    });
                });
        
                const transcriptChannelName = `transcript-${currentChannel.name}`;
                const transcriptChannel = await interaction.guild.channels.create({
                    name: transcriptChannelName,
                    type: 0, // ChannelType.GuildText in newer versions
                    parent: transcriptCategoryId,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: ['ViewChannel'] },
                        { id: '1297978184918241321', allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                    ],
                });
        
                const deleteButton = new ButtonBuilder()
                    .setCustomId('delete_transcript4')
                    .setLabel('Delete')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('<:delete:1305968687253028935>');
        
                const actionRow = new ActionRowBuilder().addComponents(deleteButton);
        
                // Send all transcript embeds in the newly created transcript channel
                await transcriptChannel.send({
                    embeds: transcriptEmbeds,
                    components: [actionRow]
                });
        
                const successEmbed = new EmbedBuilder()
                    .setColor(0xADD8E6)
                    .setTitle('<:Trasscript:1305941360947236925> Transcript Created')
                    .setDescription(`The transcript was successfully created and saved in the channel: ${transcriptChannel}.`)
                    .setFooter({
                        text: 'Transcript saved successfully',
                        iconURL: 'https://cdn.discordapp.com/attachments/1193016571115876393/1305585769225650196/pandachrismas.png?ex=673390ff&is=67323f7f&hm=0846bdee4df79b98eb8231ef9aab14c6c74fd7492093c435b083e273d3a02c8f&'
                    });
        
                await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        
            } catch (error) {
                console.error('Error while creating the transcript:', error);
                await interaction.reply({ content: 'Error while creating the transcript:', ephemeral: true });
            }
        
        } else if (interaction.customId === 'delete_transcript4') {
            // Check if the user is allowed to use the button
            if (!interaction.member.roles.cache.has(allowedRoleId2)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xADD8E6)
                    .setTitle('<:xx:1304121069841416316> Missing Permission')
                    .setDescription("It looks like you don't have permission to use this command. Only specific roles are allowed access.")
                    .setFooter({
                        text: 'Thank you for understanding!',
                        iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                    });
        
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        
            try {
                // Deleting the channel that contains the transcript
                await interaction.channel.delete();
                console.log('Transcript channel successfully deleted.');
            } catch (error) {
                console.error('Error deleting the transcript channel:', error);
                await interaction.reply({ content: 'Error deleting the transcript channel.', ephemeral: true });
            }
        
        } else if (customId === 'close_ticket4') {
            if (!interaction.member.roles.cache.has(allowedRoleId1)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xADD8E6)
                    .setTitle('<:xx:1304121069841416316> Missing Permission')
                    .setDescription(`It looks like you don't have permission to use this command. Only specific roles are allowed access.`)
                    .setFooter({
                        text: 'Thank you for understanding!',
                        iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                    });
    
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const confirmEmbed = new EmbedBuilder()
                .setColor(0xADD8E6) // Rot
                .setTitle('<:warnung:1305942995174162523> Are you sure?')
                .setDescription('<:close:1305939301028331600> - Are you sure you want to close this ticket?')
                .setFooter({
                    text: 'Are you sure you want to close the ticket?',
                    iconURL: 'https://cdn.discordapp.com/attachments/1252287347782058067/1305946908346421258/Panda_angry.png?ex=6734e156&is=67338fd6&hm=126884dff48703e0cd2d66ff06d568592769f7b921b36e2594ca73909600bc27&'
                });
                
            const yesButton = new ButtonBuilder()
                .setCustomId('confirm_close_yes4')
                .setLabel('Yes')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:Verified:1305132264329314335>'); // Emoji ID korrigieren

            const noButton = new ButtonBuilder()
                .setCustomId('confirm_close_no4')
                .setLabel('No')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:xx:1304121069841416316>'); 

            const confirmRow = new ActionRowBuilder()
                .addComponents(yesButton, noButton);

            await interaction.reply({
                embeds: [confirmEmbed],
                components: [confirmRow],
                ephemeral: true
            });
        }

       
        // If user confirms ticket closure
else if (interaction.customId === 'confirm_close_yes4') {
    const ticketChannel = interaction.channel;
    const moderator = interaction.user;

    // Delete the ticket channel
    await ticketChannel.delete();

    // Remove the ticket creator's ID from the map
    ticketMap.delete(ticketChannel.id);
    saveTicketData(ticketMap); // Save the updated map to file

    // Send log embed to the specific channel
    const logChannelId = '1297978300668317797';
    const logChannel = interaction.guild.channels.cache.get(logChannelId);
    if (logChannel) {
        const closeEmbed = new EmbedBuilder()
            .setColor(0xADD8E6)
            .setTitle('<:close:1305939301028331600> Ticket Closed')
            .setDescription(`The ticket was closed by ${moderator.tag}.`)
            .addFields(
                { name: '<:moderator:1305939310968569948> Moderator', value: moderator.toString(), inline: true },
                { name: '<:ticketnew:1305939312810135612> Ticket Name', value: ticketChannel.name, inline: true }
            )
            .setTimestamp()
            .setFooter({
                text: 'Ticket Logs',
                iconURL: 'https://cdn.discordapp.com/attachments/1193016571115876393/1305585769225650196/pandachrismas.png?ex=673390ff&is=67323f7f&hm=0846bdee4df79b98eb8231ef9aab14c6c74fd7492093c435b083e273d3a02c8f&'
            });

        await logChannel.send({ embeds: [closeEmbed] });
    } else {
        console.error(`Log channel with ID ${logChannelId} not found.`);
    }
}
        
        // Benutzer lehnt das Schließen des Tickets ab
        else if (interaction.customId === 'confirm_close_no4') {
            const canceledEmbed = new EmbedBuilder()
                .setColor(0xADD8E6)
                .setDescription('<:ticketnew:1305939312810135612> - The closing of the ticket has been canceled.')
                .setAuthor({
                    name: 'Canceled', 
                    iconURL: 'https://cdn.discordapp.com/attachments/1252287347782058067/1305945775078903908/Verified.png?ex=6734e048&is=67338ec8&hm=10b4e7a41d47386c1b7eaec2670e27a1150bb6956ad67e4c52e9d6a6c895755a&'
                })
                .setFooter({
                    text: 'Your ticket has been successfully canceled.',
                    iconURL: 'https://cdn.discordapp.com/attachments/1193016571115876393/1305585769225650196/pandachrismas.png?ex=673390ff&is=67323f7f&hm=0846bdee4df79b98eb8231ef9aab14c6c74fd7492093c435b083e273d3a02c8f&'
                });

            await interaction.update({
                embeds: [canceledEmbed],
                components: [],
                ephemeral: true
            });
            
        } else if (customId === 'user_info4') {
            if (!interaction.member.roles.cache.has(allowedRoleId1)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xADD8E6)
                    .setTitle('<:xx:1304121069841416316> Missing Permission')
                    .setDescription(`It looks like you don't have permission to use this command. Only specific roles are allowed access.`)
                    .setFooter({
                        text: 'Thank you for understanding!',
                        iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                    });
        
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        
            const ticketCreatorId = ticketMap.get(interaction.channel.id);
        
            if (!ticketCreatorId) {
                return interaction.reply({ content: 'User ID for this ticket not found.', ephemeral: true });
            }
        
            try {
                // Signal that the bot is processing the request
                await interaction.deferReply({ ephemeral: true });
        
                const member = await interaction.guild.members.fetch(ticketCreatorId);
        
                const userEmbed = new EmbedBuilder()
                    .setColor(0xADD8E6)
                    .setTitle(`Information about ${member.user.username}`)
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .addFields(
                        { name: '<:Member2:1305941789944975360> Username', value: member.user.tag, inline: true },
                        { name: '<:Info2:1305942999850549259> User ID', value: member.user.id, inline: true },
                        { name: '<:general:1305942998596587530> Joined Server on', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false },
                        { name: '<:moderator:1305939310968569948> Account Created on', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: false },
                        {
                            name: 'Roles',
                            value: member.roles.cache
                                .filter(role => role.name !== '@everyone') // Remove the @everyone role
                                .map(role => `<@&${role.id}>`) // Mentions the role
                                .join(', ') || 'No roles',
                            inline: false
                        }
                    )
                    .setFooter({ text: 'User information retrieved', iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png' });
        
                await interaction.editReply({ embeds: [userEmbed] });
            } catch (error) {
                if (error.code === 10007) { // DiscordAPIError: Unknown Member
                    const notFoundEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('<:xx:1304121069841416316> User Not Found')
                        .setDescription('It seems that the user has left the server.')
                        .setFooter({
                            text: 'Unable to retrieve user information.',
                            iconURL: 'https://cdn.discordapp.com/emojis/1304118662189289512.png'
                        });
        
                    return interaction.editReply({ embeds: [notFoundEmbed] });
                } else {
                    console.error('Error fetching member:', error);
                    return interaction.editReply({ content: 'An error occurred while fetching user information.' });
                }
            }
        }}
});


client.login(token);
