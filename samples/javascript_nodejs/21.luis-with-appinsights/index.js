// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// index.js is used to setup and configure your bot

// Import required packages
const path = require('path');
const restify = require('restify');

// Import required bot services. See https://aka.ms/bot-services to learn more about the different parts of a bot.
const { BotFrameworkAdapter, ConversationState, MemoryStorage, UserState } = require('botbuilder');
const { ApplicationInsightsTelemetryClient } = require('botbuilder-applicationinsights');
const { LuisAppInsightsBot } = require('./bots/luisAppInsightsBot');
const { TelemetryLoggerMiddleware } = require('./telemetry');

// Note: Ensure you have a .env file and include LuisAppId, LuisAPIKey, LuisAPIHostName, and AppInsightsInstrumentationKey.
const ENV_FILE = path.join(__dirname, './.env');
require('dotenv').config({ path: ENV_FILE });

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about adapters.
const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

// Catch-all for errors.
adapter.onTurnError = async (context, error) => {
    // This check writes out errors to console log
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights.
    console.error(`\n [onTurnError]: ${ error }`);
    // Send a message to the user
    await context.sendActivity(`Oops. Something went wrong!`);
};

// Define a state store for your bot. See https://aka.ms/about-bot-state to learn more about using MemoryStorage.
// A bot requires a state store to persist the dialog and user state between messages.
let conversationState, userState;

// For local development, in-memory storage is used.
// CAUTION: The Memory Storage used here is for local bot debugging only. When the bot
// is restarted, anything stored in memory will be gone.
const memoryStorage = new MemoryStorage();
conversationState = new ConversationState(memoryStorage);
userState = new UserState(memoryStorage);

// Pass in a logger to the bot. For this sample, the logger is the console, but alternatives such as Application Insights and Event Hub exist for storing the logs of the bot.
// Note: Application Insights is used as middleware in this sample
const logger = console;

// Create and implement the middleware
if (!process.env.AppInsightsInstrumentationKey.trim()) {
    throw new Error(`[Startup]: Instrumentation key not found. Set the key in the environment variable AppInsightsInstrumentationKey before starting the bot"`);
}
const appInsightsClient = new ApplicationInsightsTelemetryClient(process.env.AppInsightsInstrumentationKey);
adapter.use(new TelemetryLoggerMiddleware(appInsightsClient, {
    logOriginalMessage: true,
    logUserName: true
}));

// Create the LuisBot.
let bot = new LuisAppInsightsBot(conversationState, userState, logger);

// Create HTTP server.
let server = restify.createServer();

server.listen(process.env.port || process.env.PORT || 3978, function() {
    console.log(`\n${ server.name } listening to ${ server.url }`);
    console.log(`\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator`);
});

// Listen for incoming activities
server.post('/api/messages', (req, res) => {
    // Route received a request to adapter for processing
    adapter.processActivity(req, res, async (context) => {
        // route to bot activity handler.
        await bot.run(context);
    });
});
