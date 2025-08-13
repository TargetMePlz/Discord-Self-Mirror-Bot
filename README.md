Discord Mirror Bot
This project is a powerful and highly configurable Discord bot designed to mirror messages from one or more channels to a set of destination webhooks. Built using discord.js-selfbot-v13, this bot allows you to create a seamless message replication system, making it an excellent tool for archiving messages or creating cross-server broadcasts.

Key Features:
Customizable Mirroring: The config.json file gives you full control. You can define specific source channels and map them to multiple target webhooks, allowing for flexible message routing.

Message Replication: The bot captures and forwards all new messages, including text content, attachments, and embeds, ensuring a complete and accurate replica.

Reply Handling: A new feature ensures that replies to other messages are properly formatted in the mirrored message, maintaining the context of conversations.

Rate-Limiting Protection: The script includes configurable delays between messages and webhook sends to prevent your bot from being rate-limited by Discord, ensuring stable and reliable performance.

Self-Contained: The bot's logic is kept separate from its sensitive configuration, making it safe to share the code publicly as long as your config.json file remains private.
