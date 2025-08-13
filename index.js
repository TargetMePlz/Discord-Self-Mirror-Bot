const { Client, WebhookClient, MessageFlags } = require('discord.js-selfbot-v13');
const config = require('./config.json');

// --- Configuration for Delays (Adjust these values) ---
const MIN_WEBHOOK_DELAY_MS = 1000; // Minimum delay before sending each webhook (e.g., 1 second)
const MAX_WEBHOOK_DELAY_MS = 3000; // Maximum delay before sending each webhook (e.g., 3 seconds)

const MIN_MESSAGE_BATCH_DELAY_MS = 5000; // Minimum delay after processing one message before starting the next (e.g., 5 seconds)
const MAX_MESSAGE_BATCH_DELAY_MS = 10000; // Maximum delay after processing one message before starting the next (e.g., 10 seconds)
// ----------------------------------------------------

function parseWebhookToken(webhookUrl) {
    const index = webhookUrl.lastIndexOf('/');
    if (index === -1) throw 'Invalid Webhook URL in config.json';
    return webhookUrl.substring(index + 1);
}

function parseWebhookId(webhookUrl) {
    const indexEnd = webhookUrl.lastIndexOf('/');
    if (indexEnd === -1) throw 'Invalid Webhook URL in config.json';
    const indexStart = webhookUrl.lastIndexOf('/', indexEnd - 1);
    if (indexStart === -1) throw 'Invalid Webhook URL in config.json';
    return webhookUrl.substring(indexStart + 1, indexEnd);
}

const channelWebhookMapping = {};

function loadConfigValues() {
    for (const mirror of config.mirrors) {
        const webhooks = [];
        for (const webhookUrl of mirror.webhooks_urls) {
            webhooks.push(new WebhookClient({
                token: parseWebhookToken(webhookUrl),
                id: parseWebhookId(webhookUrl),
            }));
        }
        for (const channelId of mirror.channel_ids) {
            channelWebhookMapping[channelId] = webhooks;
        }
    }
}

loadConfigValues();

const client = new Client({ checkUpdate: false });

const messageQueue = [];
let isProcessing = false;

client.on('ready', async () => {
    console.log(`${client.user.username} is now mirroring >:)!`);
    client.user.setPresence({ status: config.status });
});

// Function to wait (delay) in ms
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Safely process messages one by one
async function processQueue() {
    if (isProcessing) return;
    isProcessing = true;
    // console.log('Starting to process message queue...'); // Removed this line

    while (messageQueue.length > 0) {
        const message = messageQueue.shift();
        
        // This line is removed to only log for messages that are actually processed
        // console.log(`Processing message from channel ${message.channel.name} (ID: ${message.channelId})...`);

        try {
            const webhooks = channelWebhookMapping[message.channelId];
            if (!webhooks) {
                continue; // Skip to the next message if no webhook is found
            }
            
            // The rest of the mirroring logic remains the same...
            
            const emptyChar = '᲼';
            let messageContent = message.content;

            // --- NEW LOGIC FOR HANDLING REPLIES ---
            if (message.reference && message.reference.messageId) {
                try {
                    const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
                    if (repliedMessage) {
                        const repliedAuthorName = repliedMessage.author.username;
                        const repliedContent = repliedMessage.content || '*(No content)*';
                        messageContent = `> **Replying to ${repliedAuthorName}:**\n> ${repliedContent}\n\n${messageContent}`;
                    }
                } catch (err) {
                    console.error('Error fetching replied message, likely deleted:', err.message);
                    // Continue without the replied message content if it fails to fetch
                }
            }
            // --- END OF NEW LOGIC ---

            if (message.embeds.length) {
                for (const embed of message.embeds) {
                    for (const field of embed.fields) {
                        if (!field.name.length) field.name = emptyChar;
                        if (!field.value.length) field.value = emptyChar;
                    }
                }
            }

            const mentionLength = "<#000000000000000000>".length;
            if (messageContent.length > mentionLength) {
                const mentionReplaceList = config.mentions[message.guildId];
                if (mentionReplaceList) {
                    for (const replacePair of mentionReplaceList) {
                        messageContent = messageContent.replaceAll(replacePair.original, replacePair.replaced);
                    }
                }
            } else if (!messageContent.length && message.embeds.length) {
                messageContent = emptyChar;
            }
            
            // Append attachments to the content
            for (const attachment of message.attachments) {
                messageContent += '\n' + attachment[1].url;
            }

            for (const webhook of webhooks) {
                const delay = Math.floor(Math.random() * (MAX_WEBHOOK_DELAY_MS - MIN_WEBHOOK_DELAY_MS + 1)) + MIN_WEBHOOK_DELAY_MS;
                console.log(`Waiting ${delay / 1000} seconds before sending to webhook...`);
                await wait(delay);
                await webhook.send({
                    content: messageContent,
                    username: message.author.username,
                    avatarURL: message.author.avatarURL(),
                    embeds: message.embeds,
                }).then(() => console.log('Message sent via webhook.'))
                  .catch(err => console.error('Error sending message via webhook:', err));
            }

        } catch (err) {
            console.error('Error while processing message:', err);
        }

        // After fully handling one message, wait before processing the next
        const batchDelay = Math.floor(Math.random() * (MAX_MESSAGE_BATCH_DELAY_MS - MIN_MESSAGE_BATCH_DELAY_MS + 1)) + MIN_MESSAGE_BATCH_DELAY_MS;
        console.log(`Finished processing message. Waiting ${batchDelay / 1000} seconds before checking for the next message...`);
        await wait(batchDelay);
    }

    isProcessing = false;
    console.log('Message queue empty. Waiting for new messages...');
}

client.on('messageCreate', async (message) => {
    // We want to process the original message regardless of whether it's a reply or not.
    if (!message.content.length && !message.embeds.length && !message.attachments.length) return;
    if (message.flags & MessageFlags.Ephemeral) return; // Ignore ephemeral messages

    // This line is removed to only log for messages that are actually processed
    // console.log(`New message received in channel ${message.channel.name}. Adding to queue.`);
    messageQueue.push(message);
    processQueue().catch(console.error); // Start processing if not already
});

client.login(config.token).catch(err => {
    console.error('Failed to log in:', err);
    console.error('Please check your token in config.json and ensure it is correct.');
});