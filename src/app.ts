import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import dotenv from "dotenv";
import { getBusArrivalTime } from "./arrival";

dotenv.config();

const bot: Telegraf = new Telegraf(process.env.BOT_TOKEN as string);

bot.start((ctx) => {
  const message = `Welcome! Please reply with the below format to query bus arrival time:
"<bus_id> <bus_stop_id>" (e.g. "145 59314")`;
  ctx.reply(message);
});

bot.on(message("text"), async (ctx) => {
  const input: string[] = (ctx.message.text || "").split(" ");

  return ctx.reply(await getBusArrivalTime(input));
});

const webhookDomain: string | undefined = process.env.DOMAIN;
if (webhookDomain) {
  const port: number = parseInt(process.env.PORT || "");
  bot
    .launch({ webhook: { domain: webhookDomain, port: port } })
    .then(() => console.log("Webhook bot listening on port", port));
} else {
  console.log("Long-polling bot running");
  bot.launch();
}
